// The lifecycle verbs on an agent held on a linked host, run from this host's handlers through
// the real link: reload, restart, wait, rename, close, reap, and the agent exiting on its own.
// Each must behave as it does for an agent here. The far agent's program is a real child
// process standing in for its harness, so its liveness, its signals and its exit are real.
import { afterEach, describe, expect, test } from "bun:test";
import { heldFarAgent, nearOrchd, startHeldFar, type HeldFar as HeldFarOrchd, type NearOrchd } from "./helpers/held-far.ts";
import { ChildPtyProvider } from "./helpers/child-pty.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testHost } from "./helpers/host.ts";
import { applyLifecycle } from "../src/daemon/server/handlers/relaunch.ts";
import { closeAnywhere } from "../src/daemon/server/handlers/drive.ts";
import { waitAnywhere } from "../src/daemon/server/handlers/wait.ts";
import { reap, rename } from "../src/daemon/server/handlers/lease.ts";
import { acceptStatusReport, startLivenessTick } from "../src/daemon/server/status-report.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { placeHere } from "../src/process-place.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { errorMessage } from "../src/util.ts";
import type { AgentState } from "../src/agent-state.ts";
import type { CallerCredential, OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { ScreenChunk } from "../src/types/screen.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

const dirs: OrchDir[] = [];
const nears: NearOrchd[] = [];
const fars: HeldFarOrchd<ChildPtyProvider>[] = [];
const ticks: { stop(): void }[] = [];

afterEach(async () => {
  for (const tick of ticks.splice(0)) tick.stop();
  for (const near of nears.splice(0)) await near.close();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

/** The runner as the human at a terminal. */
const operator: CallerCredential = { launch: null, session: null, pid: process.pid };

interface HeldFar {
  readonly far: HeldFarOrchd<ChildPtyProvider>;
  readonly pty: ChildPtyProvider;
  readonly near: DaemonState;
  readonly key: string;
  /** The agent's bridge on the far host reports a state, as it does to its own orchd. */
  report(state: AgentState): void;
}

/** A far orchd holding one real agent this host asked it to run, idle and reported so, and
 *  this host's orchd linked to it as box, following its events. */
async function heldFar(id: string): Promise<HeldFar> {
  const far = await startHeldFar(greeting(id), { ptys: new ChildPtyProvider(), timeouts: { reset_ready_ms: 3_000, reset_poll_ms: 20, abort_gap_ms: 5 } });
  fars.push(far);
  const cwd = tempOrchDir("orch-held-cwd-");
  dirs.push(cwd);
  const { key } = await heldFarAgent(far, { name: `held-${id}`, cwd });
  const report = (state: AgentState): void => { acceptStatusReport(far.orchDir, key, { state }, (event) => { far.emit(event); }); };
  report("idle");
  const near = await nearOrchd(far, key, { name: `held-${id}`, cwd, spawner: null, followEvents: true, links: { request_timeout_ms: 3_000 } });
  nears.push(near);
  return { far, pty: far.ptys, near: near.state, key, report };
}

/** A viewer here following the agent's screen over the link, and every chunk it got. */
async function viewer(held: HeldFar): Promise<ScreenChunk[]> {
  const chunks: ScreenChunk[] = [];
  const { started } = held.near.hosts.link("box").attachScreen(held.key, { cols: 80, rows: 24 }, (chunk) => { chunks.push(chunk); });
  await started;
  return chunks;
}

/** Wait until `probe` holds, for at most two seconds. */
async function until(label: string, probe: () => boolean): Promise<void> {
  for (let tries = 0; tries < 200; tries++) {
    if (probe()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function refusal(promise: Promise<unknown>): Promise<string | null> {
  return promise.then(() => null, (error: unknown) => errorMessage(error));
}

/** The agent's bridge reports again shortly after its harness comes up in a new PTY. */
function bridgeReportsOnRelaunch(held: HeldFar): void {
  held.pty.onSpawn = () => { setTimeout(() => { held.report("idle"); }, 30); };
}

describe("reload and restart of an agent held on a linked host", () => {
  test("reload types the harness's reload into its PTY there and answers once its bridge reports again", async () => {
    const held = await heldFar("lc-1");
    const pty = held.pty.last();
    const typedBefore = pty.written.length;
    const reloaded = applyLifecycle(held.near, { target: held.key, request: { verb: "reload" } });
    await until("the reload typed", () => pty.typed().includes("/reload\r"));
    setTimeout(() => { held.report("idle"); }, 30);
    expect(await reloaded).toEqual({ ok: true, reason: null, command: null, relaunched: null });
    // The prompt is cleared first, then the reload submitted, into the same PTY.
    expect(pty.written.slice(typedBefore)).toEqual(["\x1b", "/reload", "\r"]);
    expect(held.pty.spawned).toHaveLength(1);
  });

  test("restart relaunches the harness in a fresh PTY there; the agent, its viewers and its screen carry on", async () => {
    const held = await heldFar("lc-2");
    const old = held.pty.last();
    const chunks = await viewer(held);
    bridgeReportsOnRelaunch(held);
    const outcome = await applyLifecycle(held.near, { target: held.key, request: { verb: "restart", harness: null, model: null, thinking: null, cmd: null } });
    expect(outcome.ok).toBe(true);
    expect(outcome.reason).toBeNull();
    expect(outcome.command).toContain("gpt-5.6-luna");
    expect(outcome.relaunched).toEqual({ harnessId: "pi", model: "openai/gpt-5.6-luna", thinking: "medium" });
    const fresh = held.pty.last();
    expect(fresh).not.toBe(old);
    expect(old.child.signalCode).toBe("SIGTERM");
    // The far store moved the agent onto the new program; it is the same agent, still running.
    const view = agentView(held.far.orchDir, held.key);
    expect(view?.environment.handle).toBe(String(fresh.pid));
    expect(view?.endedAt).toBeNull();
    expect(held.far.state.held.has({ kind: "agent", agent: placeHere(held.far.orchDir, held.key) })).toBe(true);
    expect(agentView(held.near.directory, held.key)?.endedAt).toBeNull();
    // The viewer here never saw the old program's exit, and follows the new one.
    fresh.emit("pi is back");
    await until("the viewer sees the relaunched harness", () => chunks.some((chunk) => chunk.kind === "data" && chunk.data.includes("pi is back")));
    expect(chunks.some((chunk) => chunk.kind === "end")).toBe(false);
  });

  test("restart with --model relaunches on that model, and both hosts record it", async () => {
    const held = await heldFar("lc-3");
    bridgeReportsOnRelaunch(held);
    const outcome = await applyLifecycle(held.near, { target: held.key, request: { verb: "restart", harness: null, model: "openai/gpt-5.6-sol", thinking: null, cmd: null } });
    expect(outcome).toMatchObject({ ok: true, reason: null, relaunched: { harnessId: "pi", model: "openai/gpt-5.6-sol", thinking: "medium" } });
    expect(outcome.command).toContain("gpt-5.6-sol");
    expect(agentView(held.far.orchDir, held.key)?.tuning.model).toBe("openai/gpt-5.6-sol");
    expect(agentView(held.near.directory, held.key)?.tuning.model).toBe("openai/gpt-5.6-sol");
  });

  test("restart with another --harness relaunches the PTY on that harness, and both hosts record it", async () => {
    const held = await heldFar("lc-4");
    bridgeReportsOnRelaunch(held);
    const outcome = await applyLifecycle(held.near, { target: held.key, request: { verb: "restart", harness: "claude", model: "haiku", thinking: null, cmd: null } });
    expect(outcome).toMatchObject({ ok: true, reason: null, relaunched: { harnessId: "claude", model: "haiku" } });
    expect(outcome.command).toMatch(/^claude\b/);
    expect(held.pty.last().child.pid).not.toBe(held.pty.spawned[0]?.child.pid);
    expect(agentView(held.far.orchDir, held.key)?.harnessId).toBe("claude");
    expect(agentView(held.near.directory, held.key)?.harnessId).toBe("claude");
    expect(agentView(held.near.directory, held.key)?.tuning.model).toBe("haiku");
  });

  test("a liveness tick in the middle of a restart never reads the agent as gone", async () => {
    const held = await heldFar("lc-6");
    const events: NotifyEvent[] = [];
    // The far orchd's tick fires every millisecond, so it runs between the old program's exit
    // and the new one being recorded.
    ticks.push(startLivenessTick(held.far.orchDir, 1, (event) => { events.push(event); held.far.emit(event); }, recordingLogger().logger));
    bridgeReportsOnRelaunch(held);
    const outcome = await applyLifecycle(held.near, { target: held.key, request: { verb: "restart", harness: null, model: null, thinking: null, cmd: null } });
    expect(outcome.ok).toBe(true);
    expect(events.filter((event) => event.type === "transition" && event.newState === "exited")).toEqual([]);
    expect(agentView(held.far.orchDir, held.key)?.endedAt).toBeNull();
    expect(agentView(held.near.directory, held.key)?.endedAt).toBeNull();
  });

  test("a restart whose harness never reports back says so, as it does here", async () => {
    const held = await heldFar("lc-5");
    const outcome = await applyLifecycle(held.near, { target: held.key, request: { verb: "restart", harness: null, model: null, thinking: null, cmd: null } });
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe("relaunched but bridge status did not refresh within 3s");
  });
});

describe("waiting on an agent held on a linked host", () => {
  test("wait --status done answers once its bridge reports done there", async () => {
    const held = await heldFar("wt-1");
    const waited = waitAnywhere(held.near, { caller: operator, target: held.key, status: "done", timeoutMs: 2_000 });
    setTimeout(() => { held.report("working"); }, 30);
    setTimeout(() => { held.report("done"); }, 80);
    expect(await waited).toEqual({ reached: true, state: "done" });
  });

  test("wait --status idle answers at once for an idle agent", async () => {
    const held = await heldFar("wt-2");
    expect(await waitAnywhere(held.near, { caller: operator, target: held.key, status: "idle", timeoutMs: 2_000 })).toEqual({ reached: true, state: "idle" });
  });

  test("a wait that times out answers with the state the agent is in", async () => {
    const held = await heldFar("wt-3");
    held.report("working");
    expect(await waitAnywhere(held.near, { caller: operator, target: held.key, status: "done", timeoutMs: 100 })).toEqual({ reached: false, state: "working" });
  });
});

describe("rename, close and reap of an agent held on a linked host", () => {
  test("rename renames it in both stores; a held agent has no border to show it", async () => {
    const held = await heldFar("rn-1");
    expect(await rename(held.near, { target: held.key, name: "held-renamed" })).toEqual({ id: held.key, name: "held-renamed", chrome: "none", chromeError: null });
    expect(agentView(held.far.orchDir, held.key)?.name).toBe("held-renamed");
    expect(agentView(held.near.directory, held.key)?.name).toBe("held-renamed");
  });

  test("close ends the far agent's program, records the ending on both hosts, and ends the viewers here", async () => {
    const held = await heldFar("cl-1");
    const pty = held.pty.last();
    const chunks = await viewer(held);
    expect(await closeAnywhere(held.near, { key: held.key })).toEqual({ outcome: "signalled" });
    expect(pty.child.signalCode).toBe("SIGTERM");
    expect(agentView(held.far.orchDir, held.key)?.endedAt).not.toBeNull();
    expect(agentView(held.near.directory, held.key)?.endedAt).not.toBeNull();
    await until("the viewer ends", () => chunks.at(-1)?.kind === "end");
    await until("the far orchd lets the PTY go", () => !held.far.state.held.has({ kind: "agent", agent: placeHere(held.far.orchDir, held.key) }));
  });

  test("reap refuses a far agent still running, naming its host", async () => {
    const held = await heldFar("rp-1");
    expect(await refusal(reap(held.near, { target: held.key }))).toBe(`box: Cannot reap held-rp-1: process is still running; close first.`);
    expect(agentView(held.near.directory, held.key)).not.toBeNull();
  });

  test("reap after close deletes the agent on both hosts", async () => {
    const held = await heldFar("rp-2");
    await closeAnywhere(held.near, { key: held.key });
    expect(await reap(held.near, { target: held.key })).toEqual({ reaped: [{ id: held.key, name: "held-rp-2" }] });
    expect(agentView(held.far.orchDir, held.key)).toBeNull();
    expect(agentView(held.near.directory, held.key)).toBeNull();
  });
});

describe("an agent held on a linked host that exits on its own", () => {
  test("its exit reaches here: the agent reads ended here and the viewers here end", async () => {
    const held = await heldFar("ex-1");
    const chunks = await viewer(held);
    // The far orchd's liveness tick sees the program gone and publishes the exit, as orchd does.
    ticks.push(startLivenessTick(held.far.orchDir, 20, (event) => { held.far.emit(event); }, recordingLogger().logger));
    held.pty.last().finish();
    await until("the agent reads ended here", () => agentView(held.near.directory, held.key)?.endedAt !== null);
    await until("the viewer ends", () => chunks.at(-1)?.kind === "end");
    expect(chunks.at(-1)).toEqual({ kind: "end", reason: "the agent exited with code 3" });
  });
});
