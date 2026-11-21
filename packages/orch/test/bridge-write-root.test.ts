import * as path from "node:path";
import { PI_IDENTITY } from "../extensions/pi/vocabulary.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import { WRITE_ROOT_ENV } from "../src/policy/write-root.ts";
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

/** Fire one tool_call at a bridge launched under `writeRoot`; returns what the listener answered and the input the tool would run with. */
function fire(writeRoot: string | null, toolName: string, input: Record<string, unknown>): { answer: unknown; input: Record<string, unknown> } {
  const root = tempOrchDir("orch-bridge-write-root-");
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
  registerAgentTools(harness, { presence, daemon, identity, notify: () => undefined, refreshLabels: () => Promise.resolve() }, settings);
  const event = { toolName, input: { ...input } };
  let answer: unknown;
  try {
    if (writeRoot !== null) process.env[WRITE_ROOT_ENV] = writeRoot;
    else delete process.env[WRITE_ROOT_ENV];
    for (const handler of handlers.get("tool_call") ?? []) {
      const result = handler(event, harnessContext());
      if (answer === undefined && result !== undefined) answer = result;
    }
    return { answer, input: event.input };
  } finally {
    delete process.env[WRITE_ROOT_ENV];
    presence.stopPresence();
  }
}

describe("bridge write root", () => {
  const root = path.join(process.cwd(), ".orch", "councils", "plan", "ada");
  const other = { block: true, reason: `orch refused this tool: this agent only reads files, and writes only inside ${root}.` };

  test("allows writes without a root and writes inside the root", () => {
    expect(fire(null, "write", { path: "src/a.ts", content: "x" }).answer).toBeUndefined();
    expect(fire(root, "write", { path: path.join(root, "round-1.md"), content: "x" }).answer).toBeUndefined();
  });

  test("allows reads and orch tools", () => {
    expect(fire(root, "read", { path: "src/a.ts" }).answer).toBeUndefined();
    expect(fire(root, "orch_ask", { question: "?" }).answer).toBeUndefined();
  });

  test("refuses outside writes and unclassified tools", () => {
    expect(fire(root, "edit", { path: "src/a.ts" }).answer).toEqual({
      block: true,
      reason: `orch refused this write: ${path.resolve("src/a.ts")} is outside ${root}, the only directory this agent may write in.`,
    });
    expect(fire(root, "bash", { command: "ls" }).answer).toEqual(other);
    expect(fire(root, "mcp__files__write", { path: path.join(root, "x.md") }).answer).toEqual(other);
  });

  test("refuses locked commands under a root and still locks without one", () => {
    const fired = fire(root, "bash", { command: "bun test" });
    expect(fired.answer).toEqual(other);
    expect(fired.input.command).toBe("bun test");
    expect(fire(null, "bash", { command: "bun test" }).input.command).toMatch(/ lock -- 'bun test'$/);
  });
});
