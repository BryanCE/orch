import { PI_IDENTITY } from "../extensions/pi/vocabulary.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { createAgentPresence } from "../src/agent/presence.ts";
import { registerAgentTools } from "../src/agent/tools.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { stubDaemonLink } from "./helpers/daemon-client.ts";
import { testServices } from "./helpers/services.ts";
import { projectViewSettingsManager } from "../src/settings/manager.ts";
import { writeProjectSettingsFixture, writeProjectSettingsText } from "./helpers/settings.ts";
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

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the command the tool would run. */
function toolCall(toolName: string, command: string): unknown {
  return toolInput(toolName, { command }).command;
}

/** Fire one tool_call at a bridge whose settings lock `bun test`; returns the input the tool would run with. */
function toolInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const root = tempOrchDir("orch-bridge-gate-");
  roots.push(root);
  const settings = testServices({ orchDir: root, settings: { locked_commands: { commands: ["bun test"] } } }).settings;
  return bridgeInputs(settings, [{ toolName, input }], () => undefined)[0] ?? {};
}

function projectToolCalls(project: string, commands: readonly string[], between: () => void): unknown[] {
  const root = tempOrchDir("orch-bridge-gate-");
  roots.push(root);
  const settings = projectViewSettingsManager(project, testServices({ orchDir: root, settings: { locked_commands: { commands: ["go test"] } } }).settings);
  return bridgeInputs(settings, commands.map(command => ({ toolName: "bash", input: { command } })), between).map(input => input.command);
}

function bridgeInputs(
  settings: ReturnType<typeof projectViewSettingsManager>,
  calls: readonly { toolName: string; input: Record<string, unknown> }[],
  between: () => void,
): Record<string, unknown>[] {
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
  registerAgentTools(harness, { presence, daemon, identity, notify: () => undefined, refreshLabels: () => Promise.resolve(), readOnly: null }, settings);
  try {
    return calls.map((call, index) => {
      const event = { toolName: call.toolName, input: { ...call.input } };
      for (const handler of handlers.get("tool_call") ?? []) void handler(event, harnessContext());
      if (index === 0) between();
      return event.input;
    });
  } finally {
    presence.stopPresence();
  }
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


describe("the gate reads the project's lists", () => {
  function projectDirectory(): OrchDir {
    const project = tempOrchDir("orch-bridge-project-");
    roots.push(project);
    return project;
  }

  test("a project's lock list replaces the install's", () => {
    const project = projectDirectory();
    writeProjectSettingsFixture(project, { locked_commands: { commands: ["bun test"] } });
    const calls = projectToolCalls(project, ["bun test", "go test"], () => undefined);
    expect(calls[0]).toMatch(/ lock -- 'bun test'$/);
    expect(calls[1]).toBe("go test");
  });

  test("a project file changed between two calls applies to the second", () => {
    const project = projectDirectory();
    const calls = projectToolCalls(project, ["bun test", "bun test"], () => {
      writeProjectSettingsFixture(project, { locked_commands: { commands: ["bun test"] } });
    });
    expect(calls[0]).toBe("bun test");
    expect(calls[1]).toMatch(/ lock -- 'bun test'$/);
  });

  test("an invalid project file leaves the install's lists", () => {
    const project = projectDirectory();
    writeProjectSettingsText(project, "{ nope");
    expect(projectToolCalls(project, ["go test"], () => undefined)[0]).toMatch(/ lock -- 'go test'$/);
  });
});
