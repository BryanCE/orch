import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { z } from "zod";
import { framedLineReader } from "../src/daemon/client/wire.ts";
import { HostLinks, type HostAgentsSink, type HostEventSink, type LinkSpawner } from "../src/hosts/link.ts";
import { eventLogId } from "../src/daemon/server/replay.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { hostEventCursor, latestHostLink, setHostEventCursor } from "../src/store/host-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
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
import { hostIdFrom } from "../src/host.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { drainWrites } from "../src/store/connection.ts";
import { readAgentAnywhere } from "../src/daemon/server/handlers/host.ts";
import { nearOrchd, type NearOrchd } from "./helpers/held-far.ts";
import type { CallerCredential } from "../src/types/core.ts";
import { answer as answerQuestion, dispatch } from "../src/daemon/server/handlers/write.ts";
import { abortAnywhere, closeAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { clearSession, listPendingQuestions } from "../src/daemon/server/handlers/lifecycle.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import { rename } from "../src/daemon/server/handlers/lease.ts";
import { resolveLifecycleEntity } from "../src/daemon/server/handlers/resolve.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";

const dirs: OrchDir[] = [];
/** Directories that are not this machine's orch dir: far hosts', and a stand-in orchd's. */
const otherDirs: OrchDir[] = [];
const links: HostLinks[] = [];

const fars: FarOrchd[] = [];
const nears: NearOrchd[] = [];

afterEach(async () => {
  for (const link of links.splice(0)) link.closeAll();
  for (const near of nears.splice(0)) await near.close();
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

function hostLinks(spawn: LinkSpawner, events: HostEventSink = () => undefined, agents: HostAgentsSink = () => undefined, linkSettings: Readonly<Record<string, number>> = {}, changed: (host: string) => void = () => undefined): HostLinks {
  const orchDir = tempOrchDir("orch-host-link-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 500, ...linkSettings } } });
  const made = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn, events, agents, changed });
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
    expect(link.current().kind).toBe("blocked");
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

/** An agent the far orchd runs, asked for by `origin`; no origin is one asked for there. The far
 *  orchd runs in this process, so its own host is this process's host. Its process is this
 *  test's pid under a start token that is not this process's, so it reads dead there and no
 *  kill ever reaches the runner; `live` records the runner's own token, for a write that must
 *  find the agent running. */
function farAgent(far: FarOrchd, origin: AgentOrigin | null, live = false): string {
  const key = mintAgentId();
  const startToken = live ? processStartToken(process.pid) ?? null : `far-${key}`;
  registerSpawnedAgent(far.orchDir, {
    key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null,
    process: { host: hostIdentity().id, pid: process.pid, startToken },
    ...(origin === null ? {} : { origin }),
  });
  return key;
}

type Transition = Extract<NotifyEvent, { type: "transition" }>;

function transition(key: string, oldState: Transition["oldState"], newState: Transition["newState"]): Transition {
  return { host: hostIdentity(), type: "transition", key, ts: new Date().toISOString(), agent: key, tab: null, model: null, oldState, newState };
}

/** Resolves once `count` events have arrived. */
function received(events: { host: LinkedHost; event: NotifyEvent }[], count: number): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => { if (events.length >= count) resolve(); else setTimeout(poll, 5); };
    poll();
  });
}

/** What a link hands on as it follows a far orchd: each event, and each reload of the state of
 *  this host's agents there, by the agents it named. */
interface Followed {
  readonly events: { host: LinkedHost; event: NotifyEvent }[];
  readonly reloads: string[][];
}

function follow(far: FarOrchd, settings: Readonly<Record<string, number>> = {}): { followed: Followed; link: ReturnType<HostLinks["link"]> } {
  const followed: Followed = { events: [], reloads: [] };
  const hosts = hostLinks(far.spawner(), (host, event) => { followed.events.push({ host, event }); }, (_host, rows) => { followed.reloads.push(rows.map((row) => row.key)); }, settings);
  return { followed, link: hosts.link("box") };
}

function settled(done: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => { if (done()) resolve(); else setTimeout(poll, 5); };
    poll();
  });
}

// A request with no params, as a ping is, carries no params key.
const REQUEST = z.object({ id: z.number(), method: z.string(), params: z.unknown().optional(), once: z.string().optional() });
type FarRequest = z.infer<typeof REQUEST>;

/** A far side this test speaks for, line by line. Each dial greets as `id`; `answer` then gets
 *  every request the link sends. */
interface ScriptedFar {
  readonly spawn: LinkSpawner;
  /** Every request taken, over every dial, in order. */
  readonly requests: FarRequest[];
  /** Write one line to the link now open. */
  send(line: unknown): void;
  /** End the process now open, as a dropped connection does. */
  drop(): void;
  dials(): number;
  /** While true a dial fails at once, as a host that refuses the connection. */
  refuse: boolean;
}

function scriptedFar(id: string, answer: (request: FarRequest, far: ScriptedFar) => void): ScriptedFar {
  let dials = 0;
  let stdout = new PassThrough();
  let drop = (): void => undefined;
  const far: ScriptedFar = {
    requests: [],
    refuse: false,
    dials: () => dials,
    send: (line) => { stdout.write(`${JSON.stringify(line)}\n`); },
    drop: () => { drop(); },
    spawn: () => {
      dials += 1;
      const stdin = new PassThrough();
      stdout = new PassThrough();
      const output = stdout;
      const stderr = new PassThrough();
      if (far.refuse) {
        stderr.end("ssh: connect to host box port 22: Connection refused\n");
        return { stdin, stdout: output, stderr, exited: Promise.resolve(255), kill: () => undefined };
      }
      const exited = new Promise<number>((resolve) => {
        drop = () => { output.end(); resolve(255); };
      });
      const kill = drop;
      output.write(`${JSON.stringify({ id: 0, result: greeting(id) })}\n`);
      framedLineReader(stdin, (line) => {
        if (!line.trim()) return;
        const request = REQUEST.parse(JSON.parse(line));
        far.requests.push(request);
        queueMicrotask(() => { if (!output.writableEnded) answer(request, far); });
      });
      return { stdin, stdout: output, stderr, exited, kill };
    },
  };
  return far;
}

/** What a far orchd with no agents answers: it refuses the ping, which still counts as a line. */
function plainAnswer(request: FarRequest, far: ScriptedFar, place: { seq: number; log: string } = { seq: 0, log: "log-a" }): void {
  if (request.method === "daemon-status") far.send({ id: request.id, error: { code: "HANDLER_ERROR", message: "a scripted far side" } });
  else if (request.method === "subscribe-events") far.send({ id: request.id, result: { subscribed: true } });
  else if (request.method === "peer-status") far.send({ id: request.id, result: { names: { agents: {}, spaces: {} }, rows: [], ...place } });
}

describe("events over a link", () => {
  test("a first link reloads the state of this host's agents there, then follows their events, and only theirs", async () => {
    const far = await startFarOrchd(greeting("far-5"));
    fars.push(far);
    const mine = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const another = farAgent(far, { askedBy: hostIdFrom("another-origin"), spawner: null });
    const theirs = farAgent(far, null);
    const { followed, link } = follow(far);

    // Published before this host held a place in the far log: the state carries it, no replay does.
    far.emit(transition(mine, "idle", "working"));
    await link.connect();
    await settled(() => followed.reloads.length === 1);
    expect(followed.reloads).toEqual([[mine]]);
    expect(followed.events).toEqual([]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-5"))).toEqual({ seq: 1, log: eventLogId(far.orchDir) });

    far.emit(transition(mine, "working", "idle"));
    far.emit(transition(another, "idle", "working"));
    far.emit(transition(theirs, "idle", "working"));
    await received(followed.events, 1);
    expect(followed.events.map(({ host, event }) => [host.name, event.key, event.newState])).toEqual([["box", mine, "idle"]]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-5"))?.seq).toBe(2);
  });

  test("a dropped link resumes right after the last event taken: what it missed comes once, and nothing is reloaded", async () => {
    const far = await startFarOrchd(greeting("far-6"));
    fars.push(far);
    const mine = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const { followed, link } = follow(far);
    await link.connect();
    await settled(() => followed.reloads.length === 1);
    far.emit(transition(mine, "idle", "working"));
    await received(followed.events, 1);

    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    far.emit(transition(mine, "working", "done"));
    await link.connect();
    await received(followed.events, 2);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(followed.events.map(({ event }) => event.newState)).toEqual(["working", "done"]);
    expect(followed.reloads).toHaveLength(1);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-6"))).toEqual({ seq: 2, log: eventLogId(far.orchDir) });
  });

  test("a place read from a store the far host has since replaced is dropped: the far orchd demands a reload, and the place moves back", async () => {
    const far = await startFarOrchd(greeting("far-7"));
    fars.push(far);
    const mine = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const { followed, link } = follow(far);
    await link.connect();
    await settled(() => followed.reloads.length === 1);
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    // What this host kept from the store the far host had before: ten events taken from that log.
    setHostEventCursor(dirs[0]!, hostIdFrom("far-7"), { seq: 10, log: "the-store-before@the-same-build" });

    far.emit(transition(mine, "idle", "working"));
    await link.connect();
    await settled(() => followed.reloads.length === 2);
    expect(followed.reloads[1]).toEqual([mine]);
    // The state carries what happened while the place meant nothing; it is not replayed as well.
    expect(followed.events).toEqual([]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-7"))).toEqual({ seq: 1, log: eventLogId(far.orchDir) });

    // Numbered below the place this host held before, and still taken.
    far.emit(transition(mine, "working", "done"));
    await received(followed.events, 1);
    expect(followed.events.map(({ event }) => event.newState)).toEqual(["done"]);
  });

  test("a place older than links.resume_max_age_ms is not resumed from: the state is reloaded", async () => {
    const far = await startFarOrchd(greeting("far-8"));
    fars.push(far);
    const mine = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const { followed, link } = follow(far, { resume_max_age_ms: 1 });
    await link.connect();
    await settled(() => followed.reloads.length === 1);
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 30));

    far.emit(transition(mine, "idle", "working"));
    await link.connect();
    await settled(() => followed.reloads.length === 2);
    expect(followed.events).toEqual([]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-8"))).toEqual({ seq: 1, log: eventLogId(far.orchDir) });
  });
});

const FAST = { ping_interval_ms: 10, retry_after_loss_ms: 1, retry_floor_ms: 1, retry_cap_ms: 5 };

describe("a link's stages, heartbeat and redials", () => {

  /** The wait of the redial a link in backoff is on, once it has failed `attempt` dials in a row. */
  async function redialWait(link: ReturnType<HostLinks["link"]>, attempt: number): Promise<number> {
    let wait = -1;
    await settled(() => {
      const state = link.current();
      if (state.kind !== "backoff" || state.attempt !== attempt) return false;
      wait = state.retryAt - state.at;
      return true;
    });
    return wait;
  }

  test("a link synchronizes before it is up: connect settles only once the state of this host's agents there is reloaded", async () => {
    const far = scriptedFar("far-sa", (request, far) => {
      if (request.method !== "peer-status") plainAnswer(request, far);
    });
    const hosts = hostLinks(far.spawn, undefined, undefined, FAST);
    const link = hosts.link("box");
    const connecting = link.connect();
    await settled(() => far.requests.some((request) => request.method === "peer-status"));
    expect(link.current().kind).toBe("synchronizing");
    expect(hosts.views()[0]).toMatchObject({ state: "synchronizing", greeting: null, attempt: 1, retryAt: null });
    expect(await refusal(link.alive([]))).toBe("box is not linked, so orch cannot ask it");
    const held = far.requests.find((request) => request.method === "peer-status");
    if (held === undefined) throw new Error("no peer-status request was held");
    far.send({ id: held.id, result: { names: { agents: {}, spaces: {} }, rows: [], seq: 5, log: "log-a" } });
    await connecting;
    expect(link.current().kind).toBe("up");
    expect(hosts.views()[0]).toMatchObject({ state: "up", attempt: null, retryAt: null });
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-sa"))).toEqual({ seq: 5, log: "log-a" });
  });

  test("events sent while the state reloads wait for it: what it already holds is dropped, the rest follow it in order", async () => {
    const order: string[] = [];
    const far = scriptedFar("far-sb", (request, far) => {
      if (request.method === "peer-status") {
        far.send({ event: transition("far-agent", "idle", "working"), seq: 5 });
        far.send({ event: transition("far-agent", "working", "done"), seq: 6 });
        plainAnswer(request, far, { seq: 5, log: "log-a" });
      } else plainAnswer(request, far);
    });
    const hosts = hostLinks(far.spawn, (_host, event) => { order.push(`event:${event.newState}`); }, () => { order.push("reload"); }, FAST);
    const link = hosts.link("box");
    await link.connect();
    expect(order).toEqual(["reload", "event:done"]);
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-sb"))).toEqual({ seq: 6, log: "log-a" });
    far.send({ event: transition("far-agent", "done", "idle"), seq: 6 });
    far.send({ event: transition("far-agent", "idle", "working"), seq: 7 });
    await settled(() => order.length === 3);
    expect(order[2]).toBe("event:working");
    expect(hostEventCursor(dirs[0]!, hostIdFrom("far-sb"))?.seq).toBe(7);
  });

  test("a far side that sends nothing for links.silence_timeout_ms is dropped, then redialed", async () => {
    let muted = false;
    const far = scriptedFar("far-sc", (request, far) => { if (!muted) plainAnswer(request, far); });
    const hosts = hostLinks(far.spawn, undefined, undefined, { ...FAST, silence_timeout_ms: 250, retry_after_loss_ms: 300 });
    const link = hosts.link("box");
    await link.connect();
    muted = true;
    await settled(() => link.current().kind === "backoff");
    const view = hosts.views()[0];
    expect(view).toMatchObject({ state: "backoff", attempt: 1, greeting: null });
    expect(view?.reason).toMatch(/^box sent nothing for \d+ms, past the 250ms links\.silence_timeout_ms allows$/);
    expect(view?.retryAt).toBeGreaterThan(Date.now() - 1);
    expect(latestHostLink(dirs[0]!, hostIdFrom("far-sc"))?.until).not.toBeNull();
    muted = false;
    await settled(() => far.dials() === 2 && link.current().kind === "up");
  });

  test("a working link that drops redials soon, and a host that stays unreachable waits longer each time", async () => {
    const far = scriptedFar("far-sd", plainAnswer);
    const hosts = hostLinks(far.spawn, undefined, undefined, { ...FAST, retry_after_loss_ms: 80, retry_floor_ms: 100, retry_cap_ms: 400, retry_reset_after_ms: 60_000 });
    const link = hosts.link("box");
    await link.connect();
    far.refuse = true;
    far.drop();
    const first = await redialWait(link, 1);
    expect(first).toBeGreaterThanOrEqual(40);
    expect(first).toBeLessThanOrEqual(80);
    const second = await redialWait(link, 2);
    expect(second).toBeGreaterThanOrEqual(100);
    expect(second).toBeLessThanOrEqual(200);
    const third = await redialWait(link, 3);
    expect(third).toBeGreaterThanOrEqual(200);
    expect(third).toBeLessThanOrEqual(400);
    link.close();
  });

  test("a link that stayed up for links.retry_reset_after_ms starts its waits over; one that dropped sooner keeps climbing", async () => {
    const far = scriptedFar("far-se", plainAnswer);
    const hosts = hostLinks(far.spawn, undefined, undefined, { ...FAST, retry_after_loss_ms: 80, retry_floor_ms: 100, retry_cap_ms: 400, retry_reset_after_ms: 300 });
    const link = hosts.link("box");
    await link.connect();
    far.drop();
    expect(await redialWait(link, 1)).toBeLessThanOrEqual(80);
    await settled(() => far.dials() === 2 && link.current().kind === "up");
    far.drop();
    const climbed = await redialWait(link, 2);
    expect(climbed).toBeGreaterThanOrEqual(100);
    expect(climbed).toBeLessThanOrEqual(200);
    await settled(() => far.dials() === 3 && link.current().kind === "up");
    await new Promise((resolve) => setTimeout(resolve, 320));
    far.drop();
    expect(await redialWait(link, 1)).toBeLessThanOrEqual(80);
    link.close();
  });

  test("closing a link that waits to redial ends the wait: it is down and never dials again", async () => {
    const far = scriptedFar("far-sf", plainAnswer);
    const hosts = hostLinks(far.spawn, undefined, undefined, { ...FAST, retry_floor_ms: 200, retry_cap_ms: 400 });
    const link = hosts.link("box");
    far.refuse = true;
    expect(await refusal(link.connect())).not.toBeNull();
    await settled(() => link.current().kind === "backoff");
    link.close();
    expect(link.current().kind).toBe("down");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(far.dials()).toBe(1);
  });

  test("tells orchd when a host's link opens and when it closes", async () => {
    const changedHosts: string[] = [];
    const far = scriptedFar("far-sg", plainAnswer);
    const hosts = hostLinks(far.spawn, undefined, undefined, FAST, (host) => { changedHosts.push(host); });
    const link = hosts.link("box");
    await link.connect();
    expect(changedHosts).toEqual(["box"]);
    link.close();
    await settled(() => link.current().kind === "down");
    expect(changedHosts).toEqual(["box", "box"]);
  });
});

describe("reading an agent wherever it runs", () => {
  test("an agent on a linked host is read from that host's store, and the answer names the host", async () => {
    const far = await startFarOrchd(greeting("far-7"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    upsertRun(far.orchDir, { dispatchId: `run-${key}`, agentKey: key, state: "done", startedAt: Date.now(), result: "read over the link" });
    drainWrites(far.orchDir);
    const near = await nearDriving(far, key);
    const operator: CallerCredential = { launch: null, session: null, pid: process.pid };
    const answer = await readAgentAnywhere(near.state, { caller: operator, key, read: { kind: "result" } });
    expect(answer).toEqual({ host: "box", reading: { kind: "result", lookup: { kind: "found", source: "presence", payload: "read over the link" } } });
  });
});

/** This host's orchd, linked to `far` as the host named box, recording `key` as an agent it
 *  asked `far` to run. */
async function nearDriving(far: FarOrchd, key: string): Promise<NearOrchd> {
  const near = await nearOrchd(far, key, { spawner: null, cwd: "/tmp", model: "openai/gpt-5.6" });
  nears.push(near);
  return near;
}

describe("driving an agent wherever it runs", () => {
  test("a dispatch to an agent on a linked host is delivered by that host's orchd, and nothing is queued here", async () => {
    const far = await startFarOrchd(greeting("far-8"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null }, true);
    const near = await nearDriving(far, key);
    const answer = await dispatch(near.state, { target: key, text: "do the far thing" });
    expect(answer.accepted).toBe(true);
    expect(selectOutboxMessage(far.orchDir, answer.id)).toMatchObject({ target: key, payload: { action: "dispatch", text: "do the far thing" } });
    expect(selectOutboxMessage(near.orchDir, answer.id)).toBeUndefined();
  });

  test("closing an agent on a linked host closes it there, then records the ending here", async () => {
    const far = await startFarOrchd(greeting("far-9"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    // The recorded start token is not this process's, so nothing is signalled: the agent is gone.
    expect(await closeAnywhere(near.state, { key })).toEqual({ outcome: "gone" });
    expect(agentView(far.orchDir, key)?.endedAt).not.toBeNull();
    expect(agentView(near.orchDir, key)?.endedAt).not.toBeNull();
  });

  test("abort reaches an agent on a linked host past a live foreign lease: kill verbs are never gated", async () => {
    const far = await startFarOrchd(greeting("far-10"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    registerSpawnedAgent(near.orchDir, {
      key: "foreign-orch", harnessId: "pi", placed: false, cwd: "/tmp", name: "foreign-orch", model: "openai/gpt-5.6", spawner: null,
      process: { host: hostIdentity().id, pid: process.pid, startToken: processStartToken(process.pid) ?? null }, 
    });
    acquireLease(near.orchDir, key, "foreign-orch");
    const aborted = await abortAnywhere(near.state, { target: key, actor: "someone-else" });
    // The far agent is headless: no pane, so the far orchd answers why abort does not apply.
    expect(aborted).toEqual({ outcome: "answer", reason: "no-pane", text: `${key} has no pane; abort does not apply.` });
    expect(currentLease(near.orchDir, key)?.orchId).toBe("foreign-orch");
  });

  test("a lifecycle target on a linked host resolves to that host by name, never to a pane here", async () => {
    const far = await startFarOrchd(greeting("far-12"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    const operator: CallerCredential = { launch: null, session: null, pid: process.pid };
    expect(resolveLifecycleEntity(near.state, { caller: operator, target: key }).place).toEqual({ kind: "host", host: "box" });
  });

  test("renaming an agent on a linked host renames it in both stores, and its host answers for the border", async () => {
    const far = await startFarOrchd(greeting("far-13"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    expect(await rename(near.state, { target: key, name: "far-renamed" })).toEqual({ id: key, name: "far-renamed", chrome: "none", chromeError: null });
    expect(agentView(far.orchDir, key)?.name).toBe("far-renamed");
    expect(agentView(near.orchDir, key)?.name).toBe("far-renamed");
  });

  test("clearing the session of an agent on a linked host is that host's orchd's clear, with its own refusal", async () => {
    const far = await startFarOrchd(greeting("far-14"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    // The far agent sits in no pane, so the far orchd's own lifecycle code refuses the reset,
    // and the refusal names the host that gave it.
    expect(await refusal(clearSession(near.state, { target: key }))).toBe(`box: cannot reset ${key}: no live backend handle`);
  });

  test("an agent on a host orch has no link to refuses a drive by name, and nothing is queued here", async () => {
    const far = await startFarOrchd(greeting("far-11"));
    fars.push(far);
    const near = await nearDriving(far, farAgent(far, { askedBy: hostIdentity().id, spawner: null }));
    const key = mintAgentId();
    registerHostedAgent(near.orchDir, {
      key, harnessId: "pi", cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null, host: testHost("far-unlinked", "machine-unlinked"),
    });
    expect(await refusal(dispatch(near.state, { target: key, text: "anyone there" }))).toBe(`${key} runs on host machine-unlinked, which orch has no link to`);
    expect(selectOpenOutboxForTarget(near.orchDir, key)).toEqual([]);
  });

  test("a question an agent on a linked host asks is listed here, read from that host's store", async () => {
    const far = await startFarOrchd(greeting("far-12"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    recordQuestion(far.orchDir, { id: "q-far", agentId: key, question: "which branch?", askedAt: 5 });
    const operator: CallerCredential = { launch: null, session: null, pid: process.pid };
    const { questions } = await listPendingQuestions(near.state, { caller: operator });
    // The host is what the far store records for its agent: that orchd answers for where it runs.
    const farView = agentView(far.orchDir, key);
    if (farView === null) throw new Error(`the far store has no ${key}`);
    const farHost = farView.environment.host.id;
    expect(questions.map((question) => ({ id: question.questionId, key: question.key, question: question.question, host: question.host.id }))).toEqual([{ id: "q-far", key, question: "which branch?", host: farHost }]);
  });

  test("answering an agent on a linked host is that host's orchd's answer, with its own refusal", async () => {
    const far = await startFarOrchd(greeting("far-13"));
    fars.push(far);
    const key = farAgent(far, { askedBy: hostIdentity().id, spawner: null });
    const near = await nearDriving(far, key);
    // Nothing is pending in the far store, so the far orchd refuses, and the refusal names the host.
    expect(await refusal(answerQuestion(near.state, { target: key, text: "main" }))).toBe(`box: ${key} is not asking a question`);
  });
});

describe("a request a host must do once", () => {
  test("is sent again under the same id when the link drops before the answer, and is answered once the link is back", async () => {
    const settings = { ...FAST };
    const far = scriptedFar("far-oa", (request, far) => {
      if (request.method !== "peer-alive") plainAnswer(request, far);
      else if (far.requests.filter((request) => request.method === "peer-alive").length === 1) far.drop();
      else far.send({ id: request.id, result: { alive: [] } });
    });
    const link = hostLinks(far.spawn, undefined, undefined, settings).link("box");
    const asked = () => far.requests.filter((request) => request.method === "peer-alive");
    expect(await link.deliver("peer-alive", { processes: [] })).toEqual({ alive: [] });
    expect(asked()).toHaveLength(2);
    const ids = asked().map((request) => request.once);
    expect(ids[0]).toBeString();
    expect(ids[0]).not.toBe("");
    expect(ids[1]).toBe(ids[0]);
    expect(far.dials()).toBe(2);
  });

  test("a refusal from the host is its answer, and is not sent again", async () => {
    const settings = { ...FAST };
    const far = scriptedFar("far-ob", (request, far) => {
      if (request.method !== "peer-alive") plainAnswer(request, far);
      else far.send({ id: request.id, error: { code: "HANDLER_ERROR", message: "no" } });
    });
    const link = hostLinks(far.spawn, undefined, undefined, settings).link("box");
    const asked = () => far.requests.filter((request) => request.method === "peer-alive");
    expect(await refusal(link.deliver("peer-alive", { processes: [] }))).toBe("box: no");
    expect(asked()).toHaveLength(1);
  });

  test("a host that never answers is given up on after links.deliver_timeout_ms", async () => {
    const settings = { ...FAST, request_timeout_ms: 40, deliver_timeout_ms: 100 };
    const far = scriptedFar("far-oc", (request, far) => {
      if (request.method !== "peer-alive") plainAnswer(request, far);
    });
    const link = hostLinks(far.spawn, undefined, undefined, settings).link("box");
    const asked = () => far.requests.filter((request) => request.method === "peer-alive");
    expect(await refusal(link.deliver("peer-alive", { processes: [] }))).toMatch(/did not answer peer-alive within 40ms/);
    expect(asked().length).toBeGreaterThanOrEqual(2);
    const ids = asked().map((request) => request.once);
    expect(ids[0]).toBeString();
    expect(ids[0]).not.toBe("");
    expect(ids.every((id) => id === ids[0])).toBe(true);
  });

  test("a host that is offline before anything was sent is refused at once", async () => {
    const settings = { ...FAST };
    const far = scriptedFar("far-od", plainAnswer);
    const link = hostLinks(far.spawn, undefined, undefined, settings).link("box");
    const asked = () => far.requests.filter((request) => request.method === "peer-alive");
    far.refuse = true;
    expect(await refusal(link.deliver("peer-alive", { processes: [] }))).not.toBeNull();
    expect(asked()).toHaveLength(0);
    link.close();
  });
});
