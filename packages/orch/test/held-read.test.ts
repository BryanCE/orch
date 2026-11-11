// Reading an agent another host's orchd holds in a PTY, from this host's orchd: every read
// verb, its status row, its events and its screen, through the real link, answered as for an
// agent held here.
import { afterEach, describe, expect, test } from "bun:test";
import { heldFarAgent, nearOrchd, startHeldFar, type HeldFar as HeldFarOrchd, type NearOrchd } from "./helpers/held-far.ts";
import type { FakePty } from "./helpers/fake-pty.ts";
import { testHost } from "./helpers/host.ts";
import { closeAllStores, drainWrites } from "../src/store/connection.ts";
import { connectDaemon, rpcCall, subscribeEvents } from "../src/daemon/client/rpc.ts";
import { encodeRequest, readJsonMessages, type RpcLine } from "../src/daemon/client/wire.ts";
import { acceptResultReport, acceptStatusReport } from "../src/daemon/server/status-report.ts";
import { publishFromOrchd } from "../src/daemon/server/events.ts";
import { recordQuestion } from "../src/store/question-rows.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { endHeldAgents } from "../src/daemon/server/held-ending.ts";
import { fleetStatus } from "../src/daemon/server/state.ts";
import { agentView } from "../src/store/agent-view.ts";
import { formatStatusTable } from "../src/commands/status/table.ts";
import { scopeFleetRows } from "../src/commands/status/options.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import type { Socket } from "node:net";
import type { ParamsOf, ResultOf, RpcMethod } from "../src/daemon/client/protocol.ts";
import { agentReaderOf } from "../src/daemon/server/handlers/host.ts";
import { readAgent } from "../src/agent/read.ts";
import { placeHere } from "../src/process-place.ts";
import type { AgentReading } from "../src/types/agent-read.ts";
import type { StatusRow } from "../src/types/command.ts";
import type { CallerCredential, OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { EventSubscription } from "../src/types/daemon.ts";
import type { ScreenChunk } from "../src/types/screen.ts";
import type { StatusPatch } from "../src/types/presence.ts";

const fars: HeldFarOrchd[] = [];
const nears: NearOrchd[] = [];
const sockets: Socket[] = [];
const subscriptions: EventSubscription[] = [];

afterEach(async () => {
  for (const subscription of subscriptions.splice(0)) subscription.close();
  for (const socket of sockets.splice(0)) socket.destroy();
  for (const near of nears.splice(0)) await near.close();
  while (fars.length) await fars.pop()!.close();
  closeAllStores();
});

const operator: CallerCredential = { launch: null, session: null, pid: process.pid };

function greeting(id: string, name = `machine-${id}`): HostGreeting {
  return { host: testHost(id, name), commit: null, version: "0.1.0" };
}

async function until(what: string, ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** A far orchd holding one real agent in a PTY, and this host's orchd serving its real handler
 *  table, linked to it as the host named box and holding the reference row. */
interface HeldFar {
  readonly far: HeldFarOrchd;
  /** End the far side of the link as a dropped connection would: the link is still wanted. */
  readonly drop: () => Promise<void>;
  /** How many times this host has dialed the far one. */
  readonly dials: () => number;
  readonly near: DaemonState;
  readonly key: string;
  readonly pty: FakePty;
  /** This host's terminal, the runner's, which spawned the far agent. */
  readonly you: string;
}

async function heldFar(id: string, hostName?: string): Promise<HeldFar> {
  const far = await startHeldFar(greeting(id, hostName));
  fars.push(far);
  const { key, pty } = await heldFarAgent(far, { name: "far-worker", thinking: "high" });
  const near = await nearOrchd(far, key, { name: "far-worker", thinking: "high", followEvents: true, serve: true, links: { retry_floor_ms: 1, retry_cap_ms: 20 } });
  nears.push(near);
  if (near.operator === null) throw new Error("the near orchd seeded no operator");
  return { far, near: near.state, key, you: near.operator, pty, drop: near.drop, dials: near.dials };
}

/** What the far agent's bridge reports to its own orchd, as it would over that host's socket. */
function farReports(held: HeldFar, patch: StatusPatch): void {
  acceptStatusReport(held.far.orchDir, held.key, patch, (event) => { publishFromOrchd(held.far.state, event); });
}

async function read(held: HeldFar, reading: ParamsOf<"agent-read">["read"]): Promise<ResultOf<"agent-read">> {
  return await rpcCall(held.near.directory, "agent-read", { caller: operator, key: held.key, read: reading });
}

/** What the far orchd reads of its own agent: the answer a caller on that host gets. */
function readThere(held: HeldFar, reading: ParamsOf<"agent-read">["read"]): AgentReading {
  return readAgent(agentReaderOf(held.far.state), placeHere(held.far.orchDir, held.key), reading);
}

function statusRow(rows: readonly StatusRow[], key: string): StatusRow {
  const row = rows.find((candidate) => candidate.key === key);
  if (row === undefined) throw new Error(`status has no row for ${key}`);
  return row;
}

/** A connection to this host's orchd, recording every line it pushes. */
async function viewer(orchDir: OrchDir): Promise<{ lines: RpcLine[]; screens: () => ScreenChunk[]; send: <M extends RpcMethod>(method: M, params: ParamsOf<M>) => void }> {
  const socket = await connectDaemon(orchDir, 1_000);
  sockets.push(socket);
  const lines: RpcLine[] = [];
  readJsonMessages(socket, (line) => { lines.push(line); });
  let nextId = 1;
  return {
    lines,
    screens: () => lines.flatMap((line) => line.kind === "screen" ? [line.chunk] : []),
    send: (method, params) => { socket.write(encodeRequest(nextId++, method, params)); },
  };
}

describe("reading an agent held on another host, from this host's orchd", () => {
  test("peek reads the far PTY's screen, and names the host", async () => {
    const held = await heldFar("read-peek");
    held.pty.emit("pi> ready for work\r\n");
    await until("the far terminal", () => JSON.stringify(readThere(held, { kind: "screen", lines: 50 })).includes("ready for work"));
    const answer = await read(held, { kind: "screen", lines: 50 });
    expect(answer.host).toBe("box");
    expect(answer.reading).toEqual(readThere(held, { kind: "screen", lines: 50 }));
    expect(answer.reading).toMatchObject({ kind: "screen", lookup: { kind: "found", handle: held.key } });
  });

  test("result reads what the far agent reported there", async () => {
    const held = await heldFar("read-result");
    farReports(held, { state: "working", dispatchId: "d-far" });
    acceptResultReport(held.far.orchDir, held.key, { text: "the far work is done", dispatchId: "d-far", finishedAt: Date.now() });
    drainWrites(held.far.orchDir);
    const answer = await read(held, { kind: "result" });
    expect(answer).toEqual({ host: "box", reading: { kind: "result", lookup: { kind: "found", source: "dispatch", payload: "the far work is done" } } });
  });

  test("result reads the far run's result once the far dispatch settles", async () => {
    const held = await heldFar("read-run");
    upsertRun(held.far.orchDir, { dispatchId: `run-${held.key}`, agentKey: held.key, state: "done", startedAt: Date.now(), result: "from the far run" });
    drainWrites(held.far.orchDir);
    const answer = await read(held, { kind: "result" });
    expect(answer).toEqual({ host: "box", reading: { kind: "result", lookup: { kind: "found", source: "presence", payload: "from the far run" } } });
  });

  test("tail, session and logs answer as the far orchd answers its own caller", async () => {
    const held = await heldFar("read-tail");
    held.far.state.services.logger.forAgent(held.key).info("far.work", { step: 1 });
    for (const reading of [{ kind: "tail", lines: 10 }, { kind: "session" }, { kind: "log" }] as const) {
      const answer = await read(held, reading);
      expect(answer).toEqual({ host: "box", reading: readThere(held, reading) });
    }
  });

  test("a question the far agent asks is listed here", async () => {
    const held = await heldFar("read-question");
    recordQuestion(held.far.orchDir, { id: "q-held", agentId: held.key, question: "which branch?", askedAt: 7 });
    const { questions } = await rpcCall(held.near.directory, "questions", { caller: operator });
    expect(questions.map((question) => [question.questionId, question.key, question.question])).toEqual([["q-held", held.key, "which branch?"]]);
  });
});

describe("following an agent held on another host, from this host's orchd", () => {
  test("its transitions reach this orchd's subscribers, naming the host it runs on", async () => {
    const held = await heldFar("follow-events");
    const events: NotifyEvent[] = [];
    subscriptions.push(subscribeEvents(held.near.directory, { since: 0 }, (event) => { events.push(event); }));
    farReports(held, { state: "idle" });
    farReports(held, { state: "working", task: "build the far thing" });
    await until("the far transition here", () => events.some((event) => event.key === held.key && event.newState === "working"));
    const working = events.find((event) => event.key === held.key && event.newState === "working");
    expect(working).toMatchObject({ type: "transition", oldState: "idle", newState: "working", task: "build the far thing" });
  });
});

describe("attaching to an agent held on another host, from this host's orchd", () => {
  test("streams the far PTY both ways, and ends when the far agent ends", async () => {
    const held = await heldFar("attach-live");
    held.pty.emit("far prompt> ");
    const view = await viewer(held.near.directory);
    view.send("attach-screen", { caller: operator, key: held.key, cols: 100, rows: 30 });
    await until("the attach reply", () => view.lines.some((line) => line.kind === "reply" || line.kind === "error"));
    expect(view.lines.find((line) => line.kind === "reply" || line.kind === "error")).toEqual({ kind: "reply", id: 1, result: { host: "box", linked: true } });
    await until("the snapshot", () => view.screens().length === 1);
    expect(view.screens()[0]).toMatchObject({ kind: "snapshot" });
    expect(JSON.stringify(view.screens()[0])).toContain("far prompt>");

    held.pty.emit("more");
    await until("the output", () => view.screens().some((chunk) => chunk.kind === "data" && chunk.data === "more"));

    view.send("screen-input", { key: held.key, data: "ls\r" });
    view.send("screen-resize", { key: held.key, cols: 90, rows: 20 });
    await until("input and resize on the far PTY", () => held.pty.written.includes("ls\r") && held.pty.sizes.some((size) => size.cols === 90));
    expect(held.pty.sizes.at(-1)).toEqual({ cols: 90, rows: 20 });

    held.pty.exit({ exitCode: 0, signal: null });
    await until("the end", () => view.screens().some((chunk) => chunk.kind === "end"));
    expect(view.screens().at(-1)).toEqual({ kind: "end", reason: "the agent exited with code 0" });
  });

  test("a link that drops and comes back streams the screen again from a fresh snapshot", async () => {
    const held = await heldFar("attach-redial");
    held.pty.emit("before the drop");
    const view = await viewer(held.near.directory);
    view.send("attach-screen", { caller: operator, key: held.key, cols: 80, rows: 24 });
    await until("the snapshot", () => view.screens().length === 1);
    await held.drop();
    await until("the offline notice", () => view.screens().some((chunk) => chunk.kind === "data" && chunk.data.includes("[orch] box went offline")));
    await until("the link back", () => held.dials() === 2 && held.near.hosts.link("box").current().kind === "up");
    await until("a fresh snapshot", () => view.screens().filter((chunk) => chunk.kind === "snapshot").length === 2);
    held.pty.emit(" after");
    await until("the output after the redial", () => view.screens().some((chunk) => chunk.kind === "data" && chunk.data === " after"));
    expect(view.screens().filter((chunk) => chunk.kind === "end")).toEqual([]);
    view.send("screen-input", { key: held.key, data: "y" });
    await until("input after the redial", () => held.pty.written.includes("y"));
  });

  test("a link that comes back to find the agent gone ends the viewer here", async () => {
    const held = await heldFar("attach-gone");
    const view = await viewer(held.near.directory);
    view.send("attach-screen", { caller: operator, key: held.key, cols: 80, rows: 24 });
    await until("the snapshot", () => view.screens().length === 1);
    // The far orchd lets go of the agent while this host cannot hear it.
    await held.drop();
    held.far.state.held.kill(held.key);
    expect(held.near.hosts.link("box").current().kind).toBe("backoff");
    await until("the end", () => view.screens().some((chunk) => chunk.kind === "end"));
    const last = view.screens().at(-1);
    expect(last?.kind === "end" ? last.reason : null).toStartWith(`box no longer streams ${held.key}`);
  });
});

describe("the status row of an agent held on another host", () => {
  /** The near orchd's status, as the CLI asks for it and draws it for this host's terminal. */
  async function nearStatus(held: HeldFar): Promise<{ row: StatusRow; table: string }> {
    const fleet = await rpcCall(held.near.directory, "status", { caller: held.you });
    const row = statusRow(fleet.rows, held.key);
    const rows = scopeFleetRows(fleet.rows, { all: false, caller: { id: held.you, ceiling: null, kind: "operator" }, agentKey: undefined });
    const table = formatStatusTable({ names: fleet.names, rows }, { all: false, host: true, callerId: held.you, columns: new Set() });
    return { row, table };
  }

  /** The table line of a row, and the provenance line under it. */
  function linesOf(table: string, key: string): { line: string; under: string } {
    const lines = table.split("\n");
    const index = lines.findIndex((line) => line.includes(key));
    if (index < 0) throw new Error(`no line names ${key} in\n${table}`);
    return { line: lines[index] ?? "", under: lines[index + 1] ?? "" };
  }

  test("shows what the far orchd knows: held there, the model it runs now, its state, task and cost", async () => {
    const held = await heldFar("status-live", "BRYAN-SWE-wsl");
    // The far agent runs a model it switched to, not the one it was launched on.
    farReports(held, { state: "idle", model: { provider: "openai", id: "gpt-6-luna" }, thinking: "high" });
    farReports(held, { state: "working", task: "build the far thing", cost: 1.25 });
    const { row, table } = await nearStatus(held);
    expect(row).toMatchObject({
      host: held.far.greeting.host, backend: "held", paneId: null, state: "working", stateFallback: false, alive: true, exited: false,
      model: "openai/gpt-6-luna:high", task: "build the far thing", cost: 1.25, endReason: null,
    });
    expect(row.hostOffline).toBeUndefined();
    const { line } = linesOf(table, held.key);
    // The host is named whole, never cut to a prefix another host shares.
    expect(line.startsWith("BRYAN-SWE-wsl ")).toBe(true);
    expect(line).toMatch(new RegExp(`${held.key}\\s+held\\s`));
    expect(line).not.toContain("headless");
    expect(line).toContain("working");
    expect(line).not.toContain("working?");
    expect(line).toContain("$1.25");
  });

  test("every row says what it is, who made it, where it runs and when it was made", async () => {
    const held = await heldFar("status-who", "BryansLaptop-far");
    farReports(held, { state: "idle" });
    const { table } = await nearStatus(held);
    // The far agent: spawned by this terminal, on the far host, in its directory there.
    expect(linesOf(table, held.key).under).toBe(`  spawned agent | spawned by you | BryansLaptop-far:${held.far.orchDir} | created 0s ago`);
    // This terminal: a root, started here, on this host.
    expect(linesOf(table, held.you).under).toBe(`  operator terminal | started here, this is you | ${hostIdentity().name}:${process.cwd()} | created 0s ago`);
    // On the far orchd, the same agent names the host that asked for it.
    const there = fleetStatus(held.far.state, null);
    expect(statusRow(there.rows, held.key).askedBy).toBe(hostIdentity().name);
    const farTable = formatStatusTable(there, { all: true, host: false, callerId: null, columns: new Set() });
    expect(linesOf(farTable, held.key).under).toBe(`  spawned agent | asked for by host ${hostIdentity().name}, no spawner recorded | ${hostIdentity().name}:${held.far.orchDir} | created 0s ago`);
  });

  test("keeps the state its host last reported while the link is down, and says the host is offline and since when", async () => {
    const held = await heldFar("status-offline");
    // A first report is no transition, so no event carries it; the change to working does.
    farReports(held, { state: "idle" });
    farReports(held, { state: "working", task: "build the far thing" });
    expect((await nearStatus(held)).row.state).toBe("working");
    held.near.hosts.link("box").close();
    await until("the link down", () => held.near.hosts.link("box").current().kind === "down");
    const { row, table } = await nearStatus(held);
    expect(row.state).toBe("working");
    expect(row.hostOffline?.lastSeen).toBeGreaterThan(0);
    const { line, under } = linesOf(table, held.key);
    expect(line).toMatch(new RegExp(`${held.key}\\s+held\\s`));
    expect(under).toMatch(new RegExp(`\\| ${held.far.greeting.host.name} offline, last seen \\d+s ago$`));
  });

  test("an agent that ended because its host's orchd restarted says so", async () => {
    const held = await heldFar("status-restart");
    farReports(held, { state: "idle" });
    // The far orchd restarts: the PTYs it held end with it, each agent saying why.
    endHeldAgents(held.far.state, "restarted");
    await until("the ending here", () => agentView(held.near.directory, held.key)?.endedAt != null);
    const { row } = await nearStatus(held);
    expect(row).toMatchObject({ exited: true, state: "exited" });
    expect(row.endReason).toBe(`orchd on ${hostIdentity().name} restarted, which ended the PTY it held`);
    // The row is history now, so the CLI shows it when asked for by name.
    const fleet = await rpcCall(held.near.directory, "status", { caller: held.you });
    const named = scopeFleetRows(fleet.rows, { all: false, caller: { id: held.you, ceiling: null, kind: "operator" }, agentKey: held.key });
    const table = formatStatusTable({ names: fleet.names, rows: named }, { all: false, host: true, callerId: held.you, columns: new Set() });
    expect(linesOf(table, held.key).under.endsWith(`| ended: orchd on ${hostIdentity().name} restarted, which ended the PTY it held`)).toBe(true);
  });
});
