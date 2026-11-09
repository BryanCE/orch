import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Readable } from "node:stream";
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
async function served(): Promise<{ ask: <M extends RpcMethod>(id: number, method: M, params: ParamsOf<M>) => void; answer: (id: number) => Promise<RpcLine>; end: () => void }> {
  const far = await startFarOrchd(GREETING);
  fars.push(far);
  const process = far.spawner(ORIGIN)(far.orchDir, { dest: "far" }, SETTINGS_DEFAULTS.links, []);
  const { answer } = collectLines(process.stdout);
  return {
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

  test("ends a recorded process instance with SIGTERM, and leaves a reused pid alone", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    const pid = child.pid;
    if (pid === undefined) throw new Error("the stand-in agent did not start");
    const exited = new Promise<NodeJS.Signals | null>((resolve) => { child.once("exit", (_code, signal) => resolve(signal)); });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const link = await served();
    link.ask(4, "peer-signal", hosted(pid, "not-this-instance", GREETING.host.id));
    link.ask(5, "peer-signal", hosted(pid, processStartToken(pid) ?? null, GREETING.host.id));
    expect(await link.answer(4)).toEqual({ kind: "reply", id: 4, result: { outcome: "gone" } });
    expect(await link.answer(5)).toEqual({ kind: "reply", id: 5, result: { outcome: "signalled" } });
    expect(await exited).toBe("SIGTERM");
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
