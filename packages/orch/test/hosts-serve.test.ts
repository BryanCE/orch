import { describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { serveHostLink } from "../src/hosts/serve.ts";
import { encodeHostFrame, parseHostFrame, type HostFrame } from "../src/hosts/protocol.ts";
import { processStartToken } from "../src/process-identity.ts";
import type { HostGreeting } from "../src/types/host.ts";

const GREETING: HostGreeting = { host: { id: "far-host", name: "far", os: "linux" }, commit: "fa3f71f", version: "0.1.0" };

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
  void serveHostLink(input, output, GREETING);
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

  test("answers whether a process on this host is alive, by pid and start token", async () => {
    const link = served();
    const startToken = processStartToken(process.pid) ?? null;
    link.send({ kind: "request", id: 1, method: "alive", params: { pid: process.pid, startToken } });
    link.send({ kind: "request", id: 2, method: "alive", params: { pid: process.pid, startToken: "not-this-process" } });
    const frames = await link.frames();
    expect(frames).toContainEqual({ kind: "reply", id: 1, result: { alive: true } });
    expect(frames).toContainEqual({ kind: "reply", id: 2, result: { alive: false } });
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
});
