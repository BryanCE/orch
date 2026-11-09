import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { serveHostLink } from "../src/hosts/serve.ts";
import { encodeHostFrame, parseHostFrame, type HostFrame } from "../src/hosts/protocol.ts";
import { processStartToken } from "../src/process-identity.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testHost, hosted } from "./helpers/host.ts";

const dirs: OrchDir[] = [];
afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

const GREETING: HostGreeting = { host: testHost("far-host", "far"), commit: "fa3f71f", version: "0.1.0" };

/** Serve a link in-process and collect every frame it writes back. */
function served(): { send: (frame: HostFrame) => void; frames: () => Promise<HostFrame[]>; end: () => void } {
  const input = new PassThrough();
  const output = new PassThrough();
  const received: HostFrame[] = [];
  let buffered = "";
  output.setEncoding("utf8");
  output.on("data", (chunk: string) => {
    buffered += chunk;
    let newline = buffered.indexOf("\n");
    while (newline >= 0) {
      const frame = parseHostFrame(buffered.slice(0, newline));
      if (frame !== null) received.push(frame);
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf("\n");
    }
  });
  const orchDir = tempOrchDir("orch-host-serve-");
  dirs.push(orchDir);
  void serveHostLink(input, output, { orchDir, greeting: GREETING });
  return {
    send: (frame) => { input.write(encodeHostFrame(frame)); },
    frames: async () => { await new Promise((resolve) => setTimeout(resolve, 20)); return received; },
    end: () => { input.end(); },
  };
}

describe("orch host serve", () => {
  test("says which host it is before anything else", async () => {
    const link = served();
    const [first] = await link.frames();
    expect(first).toEqual({ kind: "greeting", greeting: GREETING });
    link.end();
  });

  test("answers whether each process on this host is alive, by pid and start token, in order", async () => {
    const link = served();
    const startToken = processStartToken(process.pid) ?? null;
    link.send({ kind: "request", id: 1, method: "alive", params: { processes: [hosted(process.pid, startToken, GREETING.host.id), hosted(process.pid, "not-this-process", GREETING.host.id)] } });
    const frames = await link.frames();
    expect(frames).toContainEqual({ kind: "reply", id: 1, result: { alive: [true, false] } });
    link.end();
  });

  test("refuses a request it does not answer, by id, and keeps serving", async () => {
    const link = served();
    link.send({ kind: "request", id: 7, method: "reboot", params: {} });
    link.send({ kind: "request", id: 8, method: "alive", params: { pid: "one" } });
    link.send({ kind: "request", id: 9, method: "ping", params: {} });
    const frames = await link.frames();
    expect(frames.find((frame) => frame.kind === "failure" && frame.id === 7)).toBeDefined();
    expect(frames.find((frame) => frame.kind === "failure" && frame.id === 8)).toBeDefined();
    expect(frames.find((frame) => frame.kind === "reply" && frame.id === 9)).toBeDefined();
    link.end();
  });

  test("ends a recorded process instance with SIGTERM, and leaves a reused pid alone", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    const pid = child.pid;
    if (pid === undefined) throw new Error("the stand-in agent did not start");
    const exited = new Promise<NodeJS.Signals | null>((resolve) => { child.once("exit", (_code, signal) => resolve(signal)); });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const link = served();
    link.send({ kind: "request", id: 4, method: "signal", params: hosted(pid, "not-this-instance", GREETING.host.id) });
    link.send({ kind: "request", id: 5, method: "signal", params: hosted(pid, processStartToken(pid) ?? null, GREETING.host.id) });
    const frames = await link.frames();
    expect(frames).toContainEqual({ kind: "reply", id: 4, result: { outcome: "gone" } });
    expect(frames).toContainEqual({ kind: "reply", id: 5, result: { outcome: "signalled" } });
    expect(await exited).toBe("SIGTERM");
    link.end();
  });

  test("refuses to launch an agent before an orchd's relay is open on the link", async () => {
    const link = served();
    link.send({ kind: "request", id: 3, method: "launch", params: { key: "k1", name: "far-agent", adapter: "pi", model: "m", thinking: "low", prompt: "do it" } });
    const frames = await link.frames();
    const failure = frames.find((frame) => frame.kind === "failure" && frame.id === 3);
    expect(failure?.kind === "failure" ? failure.message : null).toContain("no orchd's relay is open");
    link.end();
  });
});
