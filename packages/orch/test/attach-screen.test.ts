import { afterEach, describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import type { Socket } from "node:net";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { connectDaemon } from "../src/daemon/client/rpc.ts";
import { encodeLine, encodeRequest, parseRpcLine, readJsonMessages, type RpcLine } from "../src/daemon/client/wire.ts";
import { screenConnection } from "../src/daemon/server/screens.ts";
import { attachHeld, screenHandlers } from "../src/daemon/server/handlers/screen.ts";
import { HostLinks } from "../src/hosts/link.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { hostIdentity } from "../src/host.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { FakeScreenHolder } from "./helpers/screen-holder.ts";
import { testServices } from "./helpers/services.ts";
import { hosted, testHost } from "./helpers/host.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { ParamsOf, RpcMethod } from "../src/daemon/client/protocol.ts";
import type { CallerCredential, OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { ScreenChunk } from "../src/types/screen.ts";

const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const sockets: Socket[] = [];
const links: HostLinks[] = [];
const fars: FarOrchd[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  for (const link of links.splice(0)) link.closeAll();
  for (const server of servers.splice(0)) await server.close();
  while (fars.length) await fars.pop()!.close();
  closeAllStores();
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});

const operator: CallerCredential = { launch: null, session: null, process: hosted(process.pid) };

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function until(what: string, ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** A viewer that reads only when the test says: every write past the first waits for it. */
class SlowViewer extends Writable {
  readonly lines: string[] = [];
  private pending: (() => void) | null = null;

  constructor() {
    super({ highWaterMark: 1, decodeStrings: false });
  }

  override _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.lines.push(String(chunk));
    this.pending = () => { callback(); };
  }

  /** The viewer reads everything waiting for it. */
  async catchUp(): Promise<void> {
    while (this.pending !== null) {
      const pending = this.pending;
      this.pending = null;
      pending();
      await tick();
    }
  }

  chunks(): ScreenChunk[] {
    return this.lines.map((line) => parseRpcLine(JSON.parse(line))).flatMap((line) => line?.kind === "screen" ? [line.chunk] : []);
  }
}

/** A connection to an orchd, recording every line it pushes. */
async function viewer(orchDir: OrchDir): Promise<{ lines: RpcLine[]; screens: () => ScreenChunk[]; send: <M extends RpcMethod>(method: M, params: ParamsOf<M>) => void; socket: Socket }> {
  const socket = await connectDaemon(orchDir, 1_000);
  sockets.push(socket);
  const lines: RpcLine[] = [];
  readJsonMessages(socket, (line) => { lines.push(line); });
  let nextId = 1;
  return {
    lines,
    screens: () => lines.flatMap((line) => line.kind === "screen" ? [line.chunk] : []),
    send: (method, params) => { socket.write(encodeRequest(nextId++, method, params)); },
    socket,
  };
}

async function serveScreens(state: DaemonState, holder: FakeScreenHolder): Promise<void> {
  const server = await startRpcServer(state.directory, stubRpcHandlers(screenHandlers(state, () => holder)), { logger: recordingLogger().logger });
  servers.push(server);
}

function nearDir(): OrchDir {
  const orchDir = tempOrchDir("orch-attach-near-");
  dirs.push(orchDir);
  return orchDir;
}

describe("a screen line on the wire", () => {
  test("carries its agent and its chunk through JSON as is", () => {
    const raw = "\x1b[31mred\x1b[0m é中\r\n";
    for (const chunk of [{ kind: "snapshot", data: raw }, { kind: "data", data: raw }, { kind: "end", reason: "gone" }] satisfies ScreenChunk[]) {
      const line: RpcLine = { kind: "screen", key: "agent-1", chunk };
      expect(parseRpcLine(JSON.parse(encodeLine(line)))).toEqual(line);
    }
  });
});

describe("a slow viewer", () => {
  test("loses its backlog for a fresh snapshot and never holds the agent up", async () => {
    const holder = new FakeScreenHolder();
    holder.hold("agent-1", "A");
    const out = new SlowViewer();
    const screens = screenConnection(out);
    attachHeld(holder, screens, "agent-1", { cols: 80, rows: 24 }, 200);
    holder.print("agent-1", "b");
    holder.print("agent-1", "c");
    holder.print("agent-1", "d".repeat(200));
    holder.print("agent-1", "e");
    expect(out.chunks()).toEqual([{ kind: "snapshot", data: "A" }]);
    await out.catchUp();
    expect(out.chunks()).toEqual([{ kind: "snapshot", data: "A" }, { kind: "snapshot", data: `Abc${"d".repeat(200)}e` }]);
    holder.print("agent-1", "f");
    await out.catchUp();
    expect(out.chunks().at(-1)).toEqual({ kind: "data", data: "f" });
    expect(holder.snapshots.get("agent-1")).toBe(2);
  });

  test("keeps output that fits the queue, in order", async () => {
    const holder = new FakeScreenHolder();
    holder.hold("agent-1", "A");
    const out = new SlowViewer();
    attachHeld(holder, screenConnection(out), "agent-1", { cols: 80, rows: 24 }, 10_000);
    holder.print("agent-1", "b");
    holder.print("agent-1", "c");
    await out.catchUp();
    expect(out.chunks()).toEqual([{ kind: "snapshot", data: "A" }, { kind: "data", data: "b" }, { kind: "data", data: "c" }]);
  });
});

describe("attaching to a screen held here", () => {
  test("streams a snapshot first and then the output; input and resize reach the holder", async () => {
    const orchDir = nearDir();
    const holder = new FakeScreenHolder();
    const key = mintAgentId();
    holder.hold(key, "before\r\n");
    await serveScreens(idleDaemonState(testServices({ orchDir }), orchDir), holder);
    const view = await viewer(orchDir);
    view.send("attach-screen", { caller: operator, key, cols: 100, rows: 30 });
    await until("the attach reply", () => view.lines.some((line) => line.kind === "reply"));
    expect(view.lines.find((line) => line.kind === "reply")).toEqual({ kind: "reply", id: 1, result: { host: null } });
    holder.print(key, "after");
    await until("the output", () => view.screens().length === 2);
    expect(view.screens()).toEqual([{ kind: "snapshot", data: "before\r\n" }, { kind: "data", data: "after" }]);

    view.send("screen-input", { key, data: "ls\r" });
    view.send("screen-resize", { key, cols: 90, rows: 20 });
    await until("input and resize", () => holder.sizes(key).length === 2);
    expect(holder.input(key)).toEqual(["ls\r"]);
    expect(holder.sizes(key)).toEqual([{ cols: 100, rows: 30 }, { cols: 90, rows: 20 }]);

    holder.exit(key, { exitCode: 3, signal: null });
    await until("the end", () => view.screens().length === 3);
    expect(view.screens().at(-1)).toEqual({ kind: "end", reason: "the agent exited with code 3" });
  });

  test("closing the viewer only lets go of the screen", async () => {
    const orchDir = nearDir();
    const holder = new FakeScreenHolder();
    const key = mintAgentId();
    holder.hold(key);
    await serveScreens(idleDaemonState(testServices({ orchDir }), orchDir), holder);
    const view = await viewer(orchDir);
    view.send("attach-screen", { caller: operator, key, cols: 80, rows: 24 });
    await until("the attach reply", () => view.lines.some((line) => line.kind === "reply"));
    expect(holder.subscriberCount(key)).toBe(1);
    view.socket.destroy();
    await until("the release", () => holder.subscriberCount(key) === 0);
    expect(holder.has(key)).toBe(true);
  });

  test("refuses input for a screen the connection is not attached to", async () => {
    const orchDir = nearDir();
    const holder = new FakeScreenHolder();
    const key = mintAgentId();
    holder.hold(key);
    await serveScreens(idleDaemonState(testServices({ orchDir }), orchDir), holder);
    const view = await viewer(orchDir);
    view.send("screen-input", { key, data: "x" });
    await until("the refusal", () => view.lines.some((line) => line.kind === "error"));
    expect(holder.input(key)).toEqual([]);
  });
});

describe("attaching to a screen on a linked host", () => {
  test("relays the far holder's screen both ways, and ends when the host goes offline", async () => {
    const farHolder = new FakeScreenHolder();
    const far = await startFarOrchd({ host: testHost("far-attach", "machine-far-attach"), commit: null, version: "0.1.0" }, farHolder);
    fars.push(far);
    const orchDir = nearDir();
    const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 1_000 } } });
    const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: far.spawner(), events: () => undefined });
    links.push(hosts);
    await hosts.link("box").connect();
    const key = mintAgentId();
    const agent = { key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6", spawner: null, process: { pid: process.pid, startToken: `far-${key}` }, host: far.greeting.host };
    registerSpawnedAgent(far.orchDir, { ...agent, origin: { host: hostIdentity().id, spawner: null } });
    registerSpawnedAgent(orchDir, agent);
    farHolder.hold(key, "far screen");
    await serveScreens({ ...idleDaemonState(services, orchDir), hosts }, new FakeScreenHolder());

    const view = await viewer(orchDir);
    view.send("attach-screen", { caller: operator, key, cols: 120, rows: 40 });
    await until("the attach reply", () => view.lines.some((line) => line.kind === "reply" || line.kind === "error"));
    expect(view.lines.find((line) => line.kind === "reply" || line.kind === "error")).toEqual({ kind: "reply", id: 1, result: { host: "box" } });
    await until("the snapshot", () => view.screens().length === 1);
    farHolder.print(key, "from far");
    await until("the output", () => view.screens().length === 2);
    expect(view.screens()).toEqual([{ kind: "snapshot", data: "far screen" }, { kind: "data", data: "from far" }]);

    view.send("screen-input", { key, data: "y" });
    view.send("screen-resize", { key, cols: 60, rows: 10 });
    await until("input and resize on the far side", () => farHolder.sizes(key).length === 2);
    expect(farHolder.input(key)).toEqual(["y"]);
    expect(farHolder.sizes(key)).toEqual([{ cols: 120, rows: 40 }, { cols: 60, rows: 10 }]);

    hosts.link("box").close();
    await until("the end", () => view.screens().length === 3);
    expect(view.screens().at(-1)).toEqual({ kind: "end", reason: "box went offline" });
  });

  test("a far orchd refuses a screen its peer did not ask it to run", async () => {
    const farHolder = new FakeScreenHolder();
    const far = await startFarOrchd({ host: testHost("far-refuse", "machine-far-refuse"), commit: null, version: "0.1.0" }, farHolder);
    fars.push(far);
    const orchDir = nearDir();
    const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 1_000 } } });
    const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: far.spawner(), events: () => undefined });
    links.push(hosts);
    const link = hosts.link("box");
    await link.connect();
    const key = mintAgentId();
    registerSpawnedAgent(far.orchDir, { key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "m", spawner: null, process: { pid: process.pid, startToken: `far-${key}` }, host: far.greeting.host });
    farHolder.hold(key);
    const { started } = link.attachScreen(key, { cols: 80, rows: 24 }, () => undefined);
    let refusal = "";
    await started.catch((error: unknown) => { refusal = error instanceof Error ? error.message : String(error); });
    expect(refusal).toContain("was not asked for by the host asking");
    expect(farHolder.subscriberCount(key)).toBe(0);
  });
});
