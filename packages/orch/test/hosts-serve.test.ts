import { hostIdentity } from "../src/host.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { Readable } from "node:stream";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { encodeRequest, endpointPaths, parseRpcLine, type RpcLine } from "../src/daemon/client/wire.ts";
import { connectDaemon } from "../src/daemon/client/rpc.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostIdFrom } from "../src/host.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { hosted, testHost } from "./helpers/host.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { drainWrites } from "../src/store/connection.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { agentView } from "../src/store/agent-view.ts";
import type { AgentOrigin, HostGreeting } from "../src/types/host.ts";
import type { ParamsOf, RpcMethod } from "../src/daemon/client/protocol.ts";

const GREETING: HostGreeting = { host: testHost("far-host", "far"), commit: "fa3f71f", version: "0.1.0" };
const ORIGIN = hostIdFrom("origin-host");
const fars: FarOrchd[] = [];
afterEach(async () => { while (fars.length) await fars.pop()!.close(); });

/** Every line a stream carries, and a wait for the answer to one request: it settles when
 *  that reply or refusal arrives, so a slow far orchd is never read as a missing answer. */
function collectLines(stream: Readable): { answer: (id: number) => Promise<RpcLine> } {
  const received: RpcLine[] = [];
  const waiting: { id: number; resolve: (line: RpcLine) => void }[] = [];
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    buffered += chunk;
    let newline = buffered.indexOf("\n");
    while (newline >= 0) {
      const line = parseRpcLine(JSON.parse(buffered.slice(0, newline)));
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf("\n");
      if (line === null) continue;
      received.push(line);
      for (const waiter of waiting.filter((entry) => answers(line, entry.id))) waiter.resolve(line);
    }
  });
  return {
    answer: (id) => {
      const found = received.find((line) => answers(line, id));
      return found === undefined ? new Promise((resolve) => { waiting.push({ id, resolve }); }) : Promise.resolve(found);
    },
  };
}

/** Whether a line is the reply or refusal to request `id`. */
function answers(line: RpcLine, id: number): boolean {
  return (line.kind === "reply" || line.kind === "error") && line.id === id;
}

/** A link served in-process to a far orchd: requests in, its answers out. */
async function served(): Promise<{ far: FarOrchd; ask: <M extends RpcMethod>(id: number, method: M, params: ParamsOf<M>) => void; answer: (id: number) => Promise<RpcLine>; end: () => void }> {
  const far = await startFarOrchd(GREETING);
  fars.push(far);
  const process = far.spawner(ORIGIN)(far.orchDir, { dest: "far" }, SETTINGS_DEFAULTS.links, []);
  const { answer } = collectLines(process.stdout);
  return {
    far,
    ask: (id, method, params) => { process.stdin.write(encodeRequest(id, method, params)); },
    answer,
    end: () => { process.kill(); },
  };
}

describe("orch host serve", () => {
  test("says hello to this host's orchd as the pinned origin, and the orchd's greeting comes back first", async () => {
    const link = await served();
    expect(await link.answer(0)).toEqual({ kind: "reply", id: 0, result: GREETING });
    link.end();
  });

  test("carries the origin's requests to this host's orchd and its answers back", async () => {
    const link = await served();
    const startToken = processStartToken(process.pid) ?? null;
    link.ask(1, "peer-alive", { processes: [hosted(process.pid, startToken, GREETING.host.id), hosted(process.pid, "not-this-process", GREETING.host.id)] });
    expect(await link.answer(1)).toEqual({ kind: "reply", id: 1, result: { alive: [true, false] } });
    link.end();
  });

  test("a process the origin recorded on another host is refused, never probed here", async () => {
    const link = await served();
    link.ask(2, "peer-alive", { processes: [hosted(process.pid, null, hostIdFrom("some-other-host"))] });
    const refused = await link.answer(2);
    expect(refused.kind === "error" ? refused.error.message : null).toContain("is recorded on host some-other-host, not on far");
    link.end();
  });
});

describe("a far orchd's peer methods", () => {
  test("answer only a connection that said hello with this orchd's token", async () => {
    const far = await startFarOrchd(GREETING);
    fars.push(far);
    const socket = await connectDaemon(far.orchDir, 1_000);
    const { answer } = collectLines(socket);
    socket.write(encodeRequest(1, "peer-alive", { processes: [] }));
    socket.write(encodeRequest(2, "peer-hello", { origin: ORIGIN, token: "not-the-token" }));
    expect(await answer(1)).toMatchObject({ kind: "error", error: { code: "IDENTITY_REQUIRED" } });
    expect(await answer(2)).toMatchObject({ kind: "error", error: { code: "IDENTITY_REQUIRED" } });
    const token = readFileSync(endpointPaths(far.orchDir).token, "utf8").trim();
    socket.write(encodeRequest(3, "peer-hello", { origin: ORIGIN, token }));
    socket.write(encodeRequest(4, "peer-alive", { processes: [] }));
    expect(await answer(3)).toEqual({ kind: "reply", id: 3, result: GREETING });
    expect(await answer(4)).toEqual({ kind: "reply", id: 4, result: { alive: [] } });
    socket.destroy();
  });
});

/** An agent the far orchd runs, asked for by `origin`, whose one run settled with `result`. */
function farAgentWithResult(far: FarOrchd, origin: AgentOrigin, result: string): string {
  const key = mintAgentId();
  registerSpawnedAgent(far.orchDir, {
    key, harnessId: "pi", placed: false, cwd: far.orchDir, name: key, model: "test", spawner: null,
    process: { host: hostIdentity().id, pid: process.pid, startToken: `far-${key}` },  origin,
  });
  upsertRun(far.orchDir, { dispatchId: `run-${key}`, agentKey: key, state: "done", startedAt: Date.now(), result });
  drainWrites(far.orchDir);
  return key;
}

describe("reading a far agent over the link", () => {
  test("the origin reads the result of an agent it asked for, from the far store", async () => {
    const link = await served();
    const key = farAgentWithResult(link.far, { askedBy: ORIGIN, spawner: null }, "far result");
    link.ask(1, "peer-read", { key, read: { kind: "result" } });
    expect(await link.answer(1)).toEqual({ kind: "reply", id: 1, result: { kind: "result", lookup: { kind: "found", source: "presence", payload: "far result" } } });
    link.end();
  });

  test("an agent another host asked for is refused, never read", async () => {
    const link = await served();
    const key = farAgentWithResult(link.far, { askedBy: hostIdFrom("another-origin"), spawner: null }, "not yours");
    link.ask(2, "peer-read", { key, read: { kind: "result" } });
    const refused = await link.answer(2);
    expect(refused.kind === "error" ? refused.error.message : null).toContain(`${key} was not asked for by the host asking`);
    link.end();
  });
});

describe("driving a far agent over the link", () => {
  test("a peer may not drive or close an agent another host asked for", async () => {
    const link = await served();
    const key = farAgentWithResult(link.far, { askedBy: hostIdFrom("another-origin"), spawner: null }, "not yours");
    link.ask(1, "peer-drive", { action: "dispatch", key, text: "hello", actor: null });
    link.ask(2, "peer-drive", { action: "close", key, actor: null });
    for (const id of [1, 2]) {
      const refused = await link.answer(id);
      expect(refused.kind === "error" ? refused.error.message : null).toContain(`${key} was not asked for by the host asking`);
    }
    expect(agentView(link.far.orchDir, key)?.endedAt).toBeNull();
    link.end();
  });

  test("the origin closes an agent it asked for, and the far orchd records the ending", async () => {
    const link = await served();
    const key = farAgentWithResult(link.far, { askedBy: ORIGIN, spawner: null }, "done");
    link.ask(1, "peer-drive", { action: "close", key, actor: "near-caller" });
    expect(await link.answer(1)).toEqual({ kind: "reply", id: 1, result: { action: "close", outcome: "gone" } });
    expect(agentView(link.far.orchDir, key)?.endedAt).not.toBeNull();
    link.end();
  });
});
