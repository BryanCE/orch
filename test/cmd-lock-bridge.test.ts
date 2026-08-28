import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTempDir } from "./helpers/tempdir.ts";
import { SETTINGS_SCHEMA } from "../src/config.ts";
import { readCommandLock, releaseCommandLock } from "../src/control/cmd-lock.ts";

// The pi-bridge command-lock interception (extensions/pi/index.ts):
//   pi.on("tool_execution_start", ...) acquires the machine-wide cmd-lock before
//   a bash tool call whose command matches a configured `locked_commands` entry,
//   keyed by the tool-call id; pi.on("tool_execution_end", ...) releases it.
//
// The bridge resolves $ORCH_DIR per call (orchDir()), so the temp directory only
// has to be in the env before the handlers fire; the top-level import keeps the
// settings file in place before the bridge registers anything.
const orchDir = mkdtempSync(join(tmpdir(), "orch-cmd-lock-bridge-"));
const previousOrchDir = process.env.ORCH_DIR;
process.env.ORCH_DIR = orchDir;

const LOCKED_COMMAND = "bun run check";
mkdirSync(orchDir, { recursive: true });
writeFileSync(
  join(orchDir, "settings.json"),
  JSON.stringify({
    schemaVersion: SETTINGS_SCHEMA,
    runtime: "node",
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
    locked_commands: [LOCKED_COMMAND],
  }),
);

const orchestratorBridgeExtension = (await import("../extensions/pi/index.ts")).default;

afterAll(() => {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  removeTempDir(orchDir);
});

// Never let a stray lock file leak between tests (the file is machine-wide).
afterEach(() => {
  releaseCommandLock(orchDir);
});

type Handler = (event: unknown, ctx: unknown) => unknown;

// A minimal ExtensionAPI stand-in: it records every handler the bridge registers
// so the test can drive the tool_execution_{start,end} seams directly. Only the
// registration surface the bridge touches at setup time is stubbed
// (registerHerdrPaneState returns early when HERDR_ENV !== "1", so its own
// handlers never register here).
function driveBridge(): {
  emit: (name: string, event: unknown, ctx?: unknown) => Promise<void>;
} {
  const handlers = new Map<string, Handler[]>();
  const record = (name: string, fn: Handler): void => {
    const list = handlers.get(name) ?? [];
    list.push(fn);
    handlers.set(name, list);
  };
  const pi = {
    on: (name: string, fn: Handler) => record(name, fn),
    events: { on: (name: string, fn: Handler) => record(name, fn) },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    setModel: () => Promise.resolve(),
    sendUserMessage: () => undefined,
  };
  orchestratorBridgeExtension(pi as never);

  // hasUI:false + no ORCH_AGENT_KEY → the bridge skips presence init entirely
  // (no timers, no watchers, no status files), so only the lock file appears.
  const emit = async (name: string, event: unknown, ctx: unknown = { hasUI: false }): Promise<void> => {
    for (const fn of handlers.get(name) ?? []) await fn(event, ctx);
  };
  return { emit };
}

describe("pi-bridge command-lock interception", () => {
  test("wraps a matching locked command in acquire→release around the tool call", async () => {
    const { emit } = driveBridge();
    const toolCallId = "tc-match-1";

    expect(readCommandLock(orchDir)).toBeNull();

    // Pre-run seam: a bash command matching locked_commands must acquire the lock.
    await emit("tool_execution_start", {
      toolName: "bash",
      toolCallId,
      args: { command: LOCKED_COMMAND },
    });

    const held = readCommandLock(orchDir);
    expect(held).not.toBeNull();
    expect(held?.pid).toBe(process.pid);
    expect(held?.note).toBe(LOCKED_COMMAND);

    // Post-run seam: completing the same tool-call id releases the lock.
    await emit("tool_execution_end", { toolName: "bash", toolCallId });
    expect(readCommandLock(orchDir)).toBeNull();
  });

  test("leaves a non-matching command untouched — no acquire, no release", async () => {
    const { emit } = driveBridge();
    const toolCallId = "tc-nomatch-1";

    expect(readCommandLock(orchDir)).toBeNull();

    await emit("tool_execution_start", {
      toolName: "bash",
      toolCallId,
      args: { command: "ls -la" },
    });

    // No lock was acquired for an unmatched command.
    expect(readCommandLock(orchDir)).toBeNull();

    // The end seam for an untracked tool-call id is a no-op and must not throw.
    await emit("tool_execution_end", { toolName: "bash", toolCallId });
    expect(readCommandLock(orchDir)).toBeNull();
  });

  test("only bash tool calls are intercepted — a non-bash tool never acquires", async () => {
    const { emit } = driveBridge();

    await emit("tool_execution_start", {
      toolName: "read",
      toolCallId: "tc-read-1",
      args: { command: LOCKED_COMMAND },
    });

    expect(readCommandLock(orchDir)).toBeNull();
  });

  test("blocks a concurrent orch lock run while the bridge holds the shared lock", async () => {
    const { emit } = driveBridge();
    await emit("tool_execution_start", {
      toolName: "bash",
      toolCallId: "tc-concurrent-1",
      args: { command: LOCKED_COMMAND },
    });
    const held = readCommandLock(orchDir);
    expect(held?.pid).toBe(process.pid);

    const waiter = Bun.spawn([
      process.execPath,
      join(import.meta.dir, "../bin/orch.ts"),
      "lock",
      "run",
      "--timeout",
      "150",
      "--",
      process.execPath,
      "-e",
      "process.exit(0)",
    ], { env: { ...process.env, ORCH_DIR: orchDir }, stdout: "pipe", stderr: "pipe" });
    const [exit, stderr] = await Promise.all([waiter.exited, new Response(waiter.stderr).text()]);
    expect(exit).not.toBe(0);
    expect(stderr).toContain("timed out");
    expect(readCommandLock(orchDir)?.pid).toBe(process.pid);

    await emit("tool_execution_end", { toolName: "bash", toolCallId: "tc-concurrent-1" });
    expect(readCommandLock(orchDir)).toBeNull();
  });

  test("surfaces a present but broken settings load instead of silently disabling locks", async () => {
    writeFileSync(join(orchDir, "settings.json"), "{\"schemaVersion\":");
    try {
      const { emit } = driveBridge();
      try {
        await emit("tool_execution_start", {
          toolName: "bash",
          toolCallId: "tc-broken-settings-1",
          args: { command: LOCKED_COMMAND },
        });
        throw new Error("expected broken settings to reject");
      } catch (error: unknown) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(join(orchDir, "settings.json"));
      }
    } finally {
      writeFileSync(
        join(orchDir, "settings.json"),
        JSON.stringify({
          schemaVersion: SETTINGS_SCHEMA,
          runtime: "node",
          enabled: { adapters: ["pi"], backends: ["headless"] },
          defaults: { adapter: "pi", backend: "headless" },
          locked_commands: [LOCKED_COMMAND],
        }),
      );
    }
  });
});
