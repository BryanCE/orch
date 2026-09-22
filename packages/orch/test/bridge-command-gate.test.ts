import { afterEach, describe, expect, test } from "bun:test";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { stubDaemonClient } from "./helpers/daemon-client.ts";
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
    sessionManager: { getSessionFile: () => undefined, getSessionId: () => undefined, getBranch: () => [] },
    modelRegistry: { find: () => undefined },
    ui: { notify: () => undefined, setStatus: () => undefined, setWidget: () => undefined },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the command the tool would run. */
function toolCall(toolName: string, command: string): unknown {
  return toolInput(toolName, { command }).command;
}

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the input the tool would run with. */
function toolInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const root = tempOrchDir("orch-bridge-gate-");
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
  const daemon = stubDaemonClient();
  const identity = { agentId: "pi", settleEvent: "agent_settled" };
  const presence = createAgentPresence({ harness, identity, extensionHash: "test", daemon });
  const settings = testServices({ orchDir: root, settings: { locked_commands: ["bun test"] } }).settings;
  registerAgentTools(harness, { presence, daemon, identity, notify: () => undefined, refreshLabels: () => Promise.resolve() }, root, settings);
  const event = { toolName, input: { ...input } };
  for (const handler of handlers.get("tool_call") ?? []) void handler(event, harnessContext());
  presence.stopPresence();
  return event.input;
}

describe("bridge command gate", () => {
  test("a locked bash command is rewritten through orch lock before it runs", () => {
    expect(toolCall("bash", "cd app && bun test")).toMatch(/ lock -- 'cd app && bun test'$/);
  });

  test("a locked command's timeout grows by the lock wait; no timeout stays none", () => {
    expect(toolInput("bash", { command: "bun test", timeout: 30 }).timeout).toBe(210);
    expect(toolInput("bash", { command: "bun test" }).timeout).toBeUndefined();
    expect(toolInput("bash", { command: "ls", timeout: 30 }).timeout).toBe(30);
  });

  test("an unlocked command and a non-bash tool are left alone", () => {
    expect(toolCall("bash", "ls")).toBe("ls");
    expect(toolCall("read", "bun test")).toBe("bun test");
  });
});
