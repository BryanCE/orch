import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { HostLinks, type HostEventSink, type LinkSpawner } from "../src/hosts/link.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { hostEventCursor, latestHostLink } from "../src/store/host-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { processStartToken } from "../src/process-identity.ts";
import { errorMessage } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import type { AgentOrigin, HostGreeting } from "../src/types/host.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { LinkedHost } from "../src/types/process.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testHost, hosted } from "./helpers/host.ts";
import { hostIdFrom, hostIdentity } from "../src/host.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { drainWrites } from "../src/store/connection.ts";
import { readAgentAnywhere } from "../src/daemon/server/handlers/host.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import type { CallerCredential } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import { dispatch } from "../src/daemon/server/handlers/write.ts";
import { abortAnywhere, closeAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";

const dirs: OrchDir[] = [];
/** Directories that are not this machine's orch dir: far hosts', and a stand-in orchd's. */
const otherDirs: OrchDir[] = [];
const links: HostLinks[] = [];

const fars: FarOrchd[] = [];

afterEach(async () => {
  for (const link of links.splice(0)) link.closeAll();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
  for (const dir of [...dirs.splice(0), ...otherDirs.splice(0)]) removeTempDir(dir);
});

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

/** A far host: a real orchd in-process answering as `id`, reached through `orch host serve`. */
function farHost(id: string): LinkSpawner {
  const started = startFarOrchd(greeting(id)).then((far) => { fars.push(far); return far; });
  return (orchDir, host, settings, args) => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const exited = started.then((far) => {
      const link = far.spawner()(orchDir, host, settings, args);
      stdin.pipe(link.stdin);
      link.stdout.pipe(stdout);
      stdin.once("end", () => { link.kill(); });
      return link.exited;
    }).then((code) => { stdout.end(); return code; });
    return { stdin, stdout, stderr, exited, kill: () => { stdin.end(); } };
  };
}

/** A far side whose login shell has no orch on its PATH. */
const noOrch: LinkSpawner = () => {
  const stderr = new PassThrough();
  stderr.end("sh: 1: orch: not found\n");
  return { stdin: new PassThrough(), stdout: new PassThrough(), stderr, exited: Promise.resolve(127), kill: () => undefined };
};

/** A far side running orch from another commit, whose greeting has a shape this one does not read. */
const otherBuild: LinkSpawner = () => {
  const stdout = new PassThrough();
  stdout.write(`${JSON.stringify({ id: 0, result: { host: { id: "far-old", name: "old", os: "linux" }, codeHash: "abc", version: "0.1.0" } })}\n`);
  return { stdin: new PassThrough(), stdout, stderr: new PassThrough(), exited: new Promise(() => undefined), kill: () => { stdout.end(); } };
};

/** The message a promise rejected with, or null when it resolved. */
function refusal(promise: Promise<unknown>): Promise<string | null> {
  return promise.then(() => null, (error: unknown) => errorMessage(error));
}

function hostLinks(spawn: LinkSpawner, events: HostEventSink = () => undefined): HostLinks {
  const orchDir = tempOrchDir("orch-host-link-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 500 } } });
  const made = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn, events });
  links.push(made);
  return made;
}

describe("a link to another host", () => {
  test("says the far side runs another build when its greeting cannot be read", async () => {
    const reason = await refusal(hostLinks(otherBuild).link("box").connect());
    expect(reason).toBe("box answered with a greeting this orch cannot read, so it runs orch built from another commit. Build this machine's commit there");
  });

  test("comes up, binds the name to the machine that answered, and records the link", async () => {
    const hosts = hostLinks(farHost("far-1"));
    const answered = await hosts.link("box").connect();
    expect(answered.host.id).toBe(hostIdFrom("far-1"));
    const [view] = hosts.views();
    expect(view).toMatchObject({ name: "box", dest: "box", state: "up", hostId: "far-1" });
    expect(latestHostLink(dirs[0]!, hostIdFrom("far-1"))?.until).toBeNull();
  });

  test("asks the far side whether a process there is alive", async () => {
    const hosts = hostLinks(farHost("far-2"));
    const link = hosts.link("box");
    await link.connect();
    const startToken = processStartToken(process.pid) ?? null;
    expect(await link.alive([hosted(process.pid, startToken, hostIdFrom("far-2"))])).toEqual([true]);
  });

  test("refuses a different machine answering on a name another machine holds", async () => {
    let answerAs = "far-a";
    const hosts = hostLinks((orchDir, host, settings, args) => farHost(answerAs)(orchDir, host, settings, args));
    const link = hosts.link("box");
    await link.connect();
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    answerAs = "far-b";
    expect(await refusal(link.connect())).toMatch(/answered as host machine-far-b.*bound to host id far-a/);
    expect(link.current().kind).toBe("down");
  });

  test("says orch is missing there when the far shell cannot find it", async () => {
    const hosts = hostLinks(noOrch);
    expect(await refusal(hosts.link("box").requireUp())).toBe("box is offline: orch is not installed on box, or is not on the PATH that account's shell sets. Run orch host add box again to see which orch it finds. orch has never reached it.");
  });

  test("goes down when the far side ends, and a question to it fails rather than waits", async () => {
    const hosts = hostLinks(farHost("far-3"));
    const link = hosts.link("box");
    await link.connect();
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(link.current().kind).toBe("down");
    expect(latestHostLink(dirs[0]!, hostIdFrom("far-3"))?.until).not.toBeNull();
    expect(await refusal(link.ping())).toMatch(/^box is not linked/);
  });

  test("refuses a name settings does not give a host", () => {
    const hosts = hostLinks(farHost("far-4"));
    expect(() => hosts.link("nowhere")).toThrow("no host named nowhere in settings.hosts; configured: box");
  });
});

/** An agent the far orchd runs, asked for by `origin`; no origin is one asked for there. */
function farAgent(far: FarOrchd, origin: AgentOrigin | null): string {
  const key = mintAgentId();
  registerSpawnedAgent(far.orchDir, {
    key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null,
    process: { pid: process.pid, startToken: `far-${key}` }, host: far.greeting.host,
    ...(origin === null ? {} : { origin }),
  });
  return key;
}

type Transition = Extract<NotifyEvent, { type: "transition" }>;

function transition(key: string, oldState: Transition["oldState"], newState: Transition["newState"]): Transition {
  return { type: "transition", key, ts: new Date().toISOString(), agent: key, tab: null, model: null, oldState, newState };
}

/** Resolves once `count` events have arrived. */
function received(events: { host: LinkedHost; event: NotifyEvent }[], count: number): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => { if (events.length >= count) resolve(); else setTimeout(poll, 5); };
    poll();
  });
}

describe("events over a link", () => {
  test("this host follows the far orchd's events about agents it asked for there, and only those, resuming after a drop", async () => {
    const far = await startFarOrchd(greeting("far-5"));
    fars.push(far);
    const mine = farAgent(far, { host: hostIdentity().id, spawner: null });
    const another = farAgent(far, { host: hostIdFrom("another-origin"), spawner: null });
    const theirs = farAgent(far, null);
    const events: { host: LinkedHost; event: NotifyEvent }[] = [];
    const hosts = hostLinks(far.spawner(), (host, event) => { events.push({ host, event }); });
    const link = hosts.link("box");

    // Published before the link came up: the subscription replays it.
    far.emit(transition(mine, "idle", "working"));
    far.emit(transition(another, "idle", "working"));
    far.emit(transition(theirs, "idle", "working"));
    await link.connect();
    await received(events, 1);
    far.emit(transition(mine, "working", "idle"));
    await received(events, 2);
    expect(events.map(({ host, event }) => [host.name, event.key, event.newState])).toEqual([["box", mine, "working"], ["box", mine, "idle"]]);
    const cursor = hostEventCursor(dirs[0]!, hostIdFrom("far-5"));
    expect(cursor).not.toBeNull();

    // Missed while down, taken once on the redial, and nothing already taken comes again.
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    far.emit(transition(mine, "idle", "done"));
    await link.connect();
    await received(events, 3);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(events.map(({ event }) => event.newState)).toEqual(["working", "idle", "done"]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-5"))).toBeGreaterThan(cursor ?? 0);
  });
});

describe("reading an agent wherever it runs", () => {
  test("an agent on a linked host is read from that host's store, and the answer names the host", async () => {
    const far = await startFarOrchd(greeting("far-7"));
    fars.push(far);
    const orchDir = tempOrchDir("orch-agent-read-near-");
    dirs.push(orchDir);
    const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 500 } } });
    const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: far.spawner(), events: () => undefined });
    links.push(hosts);
    await hosts.link("box").connect();
    const key = farAgent(far, { host: hostIdentity().id, spawner: null });
    upsertRun(far.orchDir, { dispatchId: `run-${key}`, agentKey: key, state: "done", startedAt: Date.now(), result: "read over the link" });
    drainWrites(far.orchDir);
    registerSpawnedAgent(orchDir, {
      key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null,
      process: { pid: process.pid, startToken: `far-${key}` }, host: far.greeting.host,
    });
    const operator: CallerCredential = { launch: null, session: null, process: hosted(process.pid) };
    const answer = await readAgentAnywhere({ ...idleDaemonState(services, orchDir), hosts }, { caller: operator, key, read: { kind: "result" } });
    expect(answer).toEqual({ host: "box", reading: { kind: "result", lookup: { kind: "found", source: "presence", payload: "read over the link" } } });
  });
});

/** This host's orchd, linked to `far` as the host named box, recording `key` as an agent it
 *  asked `far` to run. */
async function nearDriving(far: FarOrchd, key: string): Promise<{ orchDir: OrchDir; state: DaemonState }> {
  const orchDir = tempOrchDir("orch-drive-near-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 2_000 } } });
  const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: far.spawner(), events: () => undefined });
  links.push(hosts);
  await hosts.link("box").connect();
  registerSpawnedAgent(orchDir, {
    key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null,
    process: { pid: process.pid, startToken: `far-${key}` }, host: far.greeting.host,
  });
  return { orchDir, state: { ...idleDaemonState(services, orchDir), hosts } };
}

describe("driving an agent wherever it runs", () => {
  test("a dispatch to an agent on a linked host is delivered by that host's orchd, and nothing is queued here", async () => {
    const far = await startFarOrchd(greeting("far-8"));
    fars.push(far);
    const key = farAgent(far, { host: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    const answer = await dispatch(near.state, { target: key, text: "do the far thing" });
    expect(answer.accepted).toBe(true);
    expect(selectOutboxMessage(far.orchDir, answer.id)).toMatchObject({ target: key, payload: { action: "dispatch", text: "do the far thing" } });
    expect(selectOutboxMessage(near.orchDir, answer.id)).toBeUndefined();
  });

  test("closing an agent on a linked host closes it there, then records the ending here", async () => {
    const far = await startFarOrchd(greeting("far-9"));
    fars.push(far);
    const key = farAgent(far, { host: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    expect(await closeAnywhere(near.state, { key })).toEqual({ ok: true });
    expect(agentView(far.orchDir, key)?.endedAt).not.toBeNull();
    expect(agentView(near.orchDir, key)?.endedAt).not.toBeNull();
  });

  test("abort reaches an agent on a linked host past a live foreign lease: kill verbs are never gated", async () => {
    const far = await startFarOrchd(greeting("far-10"));
    fars.push(far);
    const key = farAgent(far, { host: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    registerSpawnedAgent(near.orchDir, {
      key: "foreign-orch", harnessId: "pi", placed: false, cwd: "/tmp", name: "foreign-orch", model: "openai/gpt-5.6", spawner: null,
      process: { pid: process.pid, startToken: processStartToken(process.pid) ?? null }, host: hostIdentity(),
    });
    acquireLease(near.orchDir, key, "foreign-orch");
    const aborted = await abortAnywhere(near.state, { target: key, actor: "someone-else" });
    // The far agent is headless: no pane, so the far orchd answers why abort does not apply.
    expect(aborted).toEqual({ outcome: "answer", reason: "no-pane", text: `${key} has no pane; abort does not apply.` });
    expect(currentLease(near.orchDir, key)?.orchId).toBe("foreign-orch");
  });

  test("an agent on a host orch has no link to refuses a drive by name, and nothing is queued here", async () => {
    const far = await startFarOrchd(greeting("far-11"));
    fars.push(far);
    const near = await nearDriving(far, farAgent(far, { host: hostIdentity().id, spawner: null }));
    const key = mintAgentId();
    registerSpawnedAgent(near.orchDir, {
      key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null,
      process: { pid: process.pid, startToken: `far-${key}` }, host: testHost("far-unlinked", "machine-unlinked"),
    });
    expect(await refusal(dispatch(near.state, { target: key, text: "anyone there" }))).toBe(`${key} runs on host machine-unlinked, which orch has no link to`);
    expect(selectOpenOutboxForTarget(near.orchDir, key)).toEqual([]);
  });
});
