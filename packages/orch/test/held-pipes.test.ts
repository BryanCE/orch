import { afterEach, describe, expect, test } from "bun:test";
import { dropHeldPipes, heldPipes, holdPipes, releasePipes } from "../src/daemon/server/held-pipes.ts";
import { nodePipes } from "../src/pty/node-pipes.ts";
import type { PipesSpawn } from "../src/types/pipes.ts";
import { fakePipes } from "./helpers/fake-pipes.ts";

const request: PipesSpawn = { argv: [process.execPath], cwd: process.cwd(), env: {} };
const agentId = "pipes-agent";

afterEach(() => { dropHeldPipes(); });

describe("held pipes", () => {
  test("fake pipes carry bytes in both directions and report stderr", async () => {
    const { provider, spawned } = fakePipes();
    const child = provider.spawn(request);
    const [program] = spawned;
    if (program === undefined) throw new Error("no pipes process was spawned");
    expect(program.request).toEqual(request);
    holdPipes(agentId, child);
    expect(heldPipes(agentId)).toBe(child);
    const bytes = new TextEncoder().encode("hello pipes");
    const input = child.input.getWriter();
    const fromOrchd = program.fromOrchd.getReader();
    const inputWrite = input.write(bytes);
    expect(await fromOrchd.read()).toEqual({ done: false, value: bytes });
    await inputWrite;
    const toOrchd = program.toOrchd.getWriter();
    const output = child.output.getReader();
    const outputWrite = toOrchd.write(bytes);
    expect(await output.read()).toEqual({ done: false, value: bytes });
    await outputWrite;
    const stderr: string[] = [];
    child.onStderr((text) => { stderr.push(text); });
    program.stderr("diagnostic");
    expect(stderr).toEqual(["diagnostic"]);
    input.releaseLock();
    fromOrchd.releaseLock();
    toOrchd.releaseLock();
    output.releaseLock();
  });

  test("exit resolves and forgets the held process", async () => {
    const { provider, spawned } = fakePipes();
    const child = provider.spawn(request);
    const [program] = spawned;
    if (program === undefined) throw new Error("no pipes process was spawned");
    holdPipes(agentId, child);
    program.exit(0);
    expect(await child.exited).toEqual({ code: 0, signal: null });
    expect(heldPipes(agentId)).toBeNull();
  });

  test("a second process for one agent is refused", () => {
    const { provider } = fakePipes();
    const first = provider.spawn(request);
    holdPipes(agentId, first);
    expect(() => holdPipes(agentId, provider.spawn(request))).toThrow("already held");
    expect(heldPipes(agentId)).toBe(first);
  });

  test("release kills and forgets the process", () => {
    const { provider, spawned } = fakePipes();
    holdPipes(agentId, provider.spawn(request));
    releasePipes(agentId);
    expect(spawned).toMatchObject([{ killed: true }]);
    expect(heldPipes(agentId)).toBeNull();
    expect(() => releasePipes(agentId)).not.toThrow();
  });

  test("a released process's exit does not forget its replacement", async () => {
    const { provider } = fakePipes();
    const first = provider.spawn(request);
    holdPipes(agentId, first);
    releasePipes(agentId);
    const replacement = provider.spawn(request);
    holdPipes(agentId, replacement);
    await first.exited;
    expect(heldPipes(agentId)).toBe(replacement);
  });

  test("drop kills and forgets all held processes", () => {
    const { provider, spawned } = fakePipes();
    holdPipes(agentId, provider.spawn(request));
    holdPipes("another-agent", provider.spawn(request));
    dropHeldPipes();
    expect(spawned).toMatchObject([{ killed: true }, { killed: true }]);
    expect(heldPipes(agentId)).toBeNull();
    expect(heldPipes("another-agent")).toBeNull();
  });
});

describe("node pipes", () => {
  test("a real program echoes input bytes and exits when input closes", async () => {
    const child = nodePipes.spawn({
      ...request,
      argv: [process.execPath, "-e", "process.stdin.pipe(process.stdout)"],
    });
    holdPipes(agentId, child);
    expect(child.pid).toBeGreaterThan(0);
    const bytes = new TextEncoder().encode("hello real pipes\n");
    const chunks: Uint8Array[] = [];
    const reading = child.output.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) { chunks.push(chunk); },
    }));
    const input = child.input.getWriter();
    try {
      await input.write(bytes);
      await input.close();
      await reading;
      expect(Buffer.concat(chunks)).toEqual(Buffer.from(bytes));
      expect(await child.exited).toEqual({ code: 0, signal: null });
      expect(heldPipes(agentId)).toBeNull();
    } finally {
      input.releaseLock();
      releasePipes(agentId);
    }
  });

  test("a failed start throws instead of returning a process", () => {
    expect(() => nodePipes.spawn({ ...request, cwd: process.execPath })).toThrow(Error);
  });
});
