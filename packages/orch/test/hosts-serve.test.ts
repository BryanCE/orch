import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { encodeRequest, endpointPaths, parseRpcLine, type RpcLine } from "../src/daemon/client/wire.ts";
import { connectDaemon } from "../src/daemon/client/rpc.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostIdFrom } from "../src/host.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { hosted, testHost } from "./helpers/host.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { ParamsOf, RpcMethod } from "../src/daemon/client/protocol.ts";

const GREETING: HostGreeting = { host: testHost("far-host", "far"), commit: "fa3f71f", version: "0.1.0" };
const ORIGIN = hostIdFrom("origin-host");
const fars: FarOrchd[] = [];
afterEach(async () => { while (fars.length) await fars.pop()!.close(); });

/** A link served in-process to a far orchd: requests in, every line it answers collected. */
async function served(): Promise<{ ask: <M extends RpcMethod>(id: number, method: M, params: ParamsOf<M>) => void; lines: () => Promise<RpcLine[]>; end: () => void }> {
  const far = await startFarOrchd(GREETING);
  fars.push(far);
  const process = far.spawner(ORIGIN)(far.orchDir, { dest: "far" }, SETTINGS_DEFAULTS.links, []);
  const received: RpcLine[] = [];
  let buffered = "";
  process.stdout.setEncoding("utf8");
  process.stdout.on("data", (chunk: string) => {
    buffered += chunk;
    let newline = buffered.indexOf("\n");
    while (newline >= 0) {
      const line = parseRpcLine(JSON.parse(buffered.slice(0, newline)));
      if (line !== null) received.push(line);
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf("\n");
    }
  });
  return {
    ask: (id, method, params) => { process.stdin.write(encodeRequest(id, method, params)); },
    lines: async () => { await new Promise((resolve) => setTimeout(resolve, 50)); return received; },
    end: () => { process.kill(); },
  };
}

describe("orch host serve", () => {
  test("says hello to this host's orchd as the pinned origin, and the orchd's greeting comes back first", async () => {
    const link = await served();
    const [first] = await link.lines();
    expect(first).toEqual({ kind: "reply", id: 0, result: GREETING });
    link.end();
  });

  test("carries the origin's requests to this host's orchd and its answers back", async () => {
    const link = await served();
    const startToken = processStartToken(process.pid) ?? null;
    link.ask(1, "peer-alive", { processes: [hosted(process.pid, startToken, GREETING.host.id), hosted(process.pid, "not-this-process", GREETING.host.id)] });
    expect(await link.lines()).toContainEqual({ kind: "reply", id: 1, result: { alive: [true, false] } });
    link.end();
  });

  test("a process the origin recorded on another host is refused, never probed here", async () => {
    const link = await served();
    link.ask(2, "peer-alive", { processes: [hosted(process.pid, null, hostIdFrom("some-other-host"))] });
    const lines = await link.lines();
    const refused = lines.find((line) => line.kind === "error" && line.id === 2);
    expect(refused?.kind === "error" ? refused.error.message : null).toContain("is recorded on host some-other-host, not on far");
    link.end();
  });

  test("ends a recorded process instance with SIGTERM, and leaves a reused pid alone", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    const pid = child.pid;
    if (pid === undefined) throw new Error("the stand-in agent did not start");
    const exited = new Promise<NodeJS.Signals | null>((resolve) => { child.once("exit", (_code, signal) => resolve(signal)); });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const link = await served();
    link.ask(4, "peer-signal", hosted(pid, "not-this-instance", GREETING.host.id));
    link.ask(5, "peer-signal", hosted(pid, processStartToken(pid) ?? null, GREETING.host.id));
    const lines = await link.lines();
    expect(lines).toContainEqual({ kind: "reply", id: 4, result: { outcome: "gone" } });
    expect(lines).toContainEqual({ kind: "reply", id: 5, result: { outcome: "signalled" } });
    expect(await exited).toBe("SIGTERM");
    link.end();
  });
});

/** The reply or refusal a connection got for request `id`. */
function answerTo(lines: readonly RpcLine[], id: number): RpcLine | undefined {
  return lines.find((line) => (line.kind === "reply" || line.kind === "error") && line.id === id);
}

describe("a far orchd's peer methods", () => {
  test("answer only a connection that said hello with this orchd's token", async () => {
    const far = await startFarOrchd(GREETING);
    fars.push(far);
    const socket = await connectDaemon(far.orchDir, 1_000);
    const replies: RpcLine[] = [];
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      for (const text of chunk.split("\n").filter(Boolean)) {
        const line = parseRpcLine(JSON.parse(text));
        if (line !== null) replies.push(line);
      }
    });
    socket.write(encodeRequest(1, "peer-alive", { processes: [] }));
    socket.write(encodeRequest(2, "peer-hello", { origin: ORIGIN, token: "not-the-token" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(answerTo(replies, 1)).toMatchObject({ kind: "error", error: { code: "IDENTITY_REQUIRED" } });
    expect(answerTo(replies, 2)).toMatchObject({ kind: "error", error: { code: "IDENTITY_REQUIRED" } });
    const token = readFileSync(endpointPaths(far.orchDir).token, "utf8").trim();
    socket.write(encodeRequest(3, "peer-hello", { origin: ORIGIN, token }));
    socket.write(encodeRequest(4, "peer-alive", { processes: [] }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(answerTo(replies, 3)).toEqual({ kind: "reply", id: 3, result: GREETING });
    expect(answerTo(replies, 4)).toEqual({ kind: "reply", id: 4, result: { alive: [] } });
    socket.destroy();
  });
});
