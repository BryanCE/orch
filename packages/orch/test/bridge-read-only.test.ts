import * as path from "node:path";
import { PI_IDENTITY } from "../extensions/pi/vocabulary.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import type { ReadOnly, ReadOnlyGate } from "../src/policy/read-only.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { stubDaemonLink } from "./helpers/daemon-client.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { HarnessApi, HarnessContext, HarnessEventHandler } from "../src/types/agent.ts";

const roots: OrchDir[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function harnessContext(): HarnessContext {
  return {
    hasUI: false,
    sessionManager: { getSessionFile: () => undefined, getSessionId: () => "test-session", getBranch: () => [] },
    modelRegistry: { find: () => undefined },
    ui: { notify: () => undefined, setStatus: () => undefined, setWidget: () => undefined },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

/** Fire one tool_call at a bridge launched under a read-only gate; returns what the listener answered and the input the tool would run with. */
function fire(readOnly: ReadOnly | null, toolName: string, input: Record<string, unknown>): { answer: unknown; input: Record<string, unknown> } {
  const root = tempOrchDir("orch-bridge-read-only-");
  roots.push(root);
  const handlers = new Map<string, HarnessEventHandler[]>();
  const harness: HarnessApi = {
    on: (name, handler) => { handlers.set(name, [...(handlers.get(name) ?? []), handler]); },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
  };
  const daemon = stubDaemonLink();
  const identity = PI_IDENTITY;
  const presence = createAgentPresence({ harness, identity, extensionHash: "test", daemon });
  const settings = testServices({ orchDir: root, settings: { locked_commands: { commands: ["bun test"] } } }).settings;
  const gate: ReadOnlyGate | null = readOnly === null ? null : { out: readOnly.out, cwd: process.cwd(), tools: { ...PI_IDENTITY.tools, reads: [...PI_IDENTITY.tools.reads, "orch_ask"] } };
  registerAgentTools(harness, { presence, daemon, identity, notify: () => undefined, refreshLabels: () => Promise.resolve(), readOnly: gate }, settings);
  const event = { toolName, input: { ...input } };
  let answer: unknown;
  try {
    for (const handler of handlers.get("tool_call") ?? []) {
      const result = handler(event, harnessContext());
      if (answer === undefined && result !== undefined) answer = result;
    }
    return { answer, input: event.input };
  } finally {
    presence.stopPresence();
  }
}

describe("bridge read-only gate", () => {
  const root = path.join(process.cwd(), ".orch", "councils", "plan", "ada");
  const other = { block: true, reason: `orch refused this tool: this agent is read-only, and writes only inside ${root}.` };

  test("allows writes inside the output directory", () => {
    expect(fire({ out: root }, "write", { path: path.join(root, "round-1.md"), content: "x" }).answer).toBeUndefined();
  });

  test("read-only without an output directory allows reads and refuses writes", () => {
    expect(fire({ out: null }, "write", { path: "notes.md", content: "x" }).answer).toEqual({ block: true, reason: "orch refused this tool: this agent is read-only." });
    expect(fire({ out: null }, "read", { path: "src/a.ts" }).answer).toBeUndefined();
  });

  test("allows reads and orch tools", () => {
    expect(fire({ out: root }, "read", { path: "src/a.ts" }).answer).toBeUndefined();
    expect(fire({ out: root }, "orch_ask", { question: "?" }).answer).toBeUndefined();
  });

  test("refuses outside writes and unclassified tools", () => {
    expect(fire({ out: root }, "edit", { path: "src/a.ts" }).answer).toEqual({
      block: true,
      reason: `orch refused this write: ${path.resolve("src/a.ts")} is outside ${root}, the only directory this agent may write in.`,
    });
    expect(fire({ out: root }, "bash", { command: "ls" }).answer).toEqual(other);
    expect(fire({ out: root }, "mcp__files__write", { path: path.join(root, "x.md") }).answer).toEqual(other);
  });

  test("refuses locked commands under a root and still locks without one", () => {
    const fired = fire({ out: root }, "bash", { command: "bun test" });
    expect(fired.answer).toEqual(other);
    expect(fired.input.command).toBe("bun test");
    expect(fire(null, "bash", { command: "bun test" }).input.command).toMatch(/ lock -- 'bun test'$/);
  });
});
