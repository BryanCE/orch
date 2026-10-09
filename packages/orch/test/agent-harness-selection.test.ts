import { afterAll, describe, expect, test } from "bun:test";
// Imported first: entering at the registry keeps the adapter import cycle out of its TDZ.
import "../src/adapters/registry.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { agentAdapter } from "../src/commands/selection.ts";
import { refuseModelChange } from "../src/commands/spawn/models.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";

const orchDir = tempOrchDir("orch-agent-harness-");
const settings = testServices({ orchDir, settings: { enabled: { adapters: ["pi", "claude"], backends: ["headless"] }, defaults: { adapter: "pi" } } }).settings.current();

afterAll(() => removeTempDir(orchDir));

describe("the harness a control verb drives", () => {
  test("is the one recorded for the agent, never the configured default", () => {
    expect(agentAdapter({}, settings, "claude")).toBe("claude");
    expect(agentAdapter({ adapterFlag: "claude" }, settings, "claude")).toBe("claude");
  });

  test("falls back to the selection only for an agent with no record", () => {
    expect(agentAdapter({}, settings, null)).toBe("pi");
    expect(agentAdapter({ adapterFlag: "claude" }, settings, undefined)).toBe("claude");
  });

  test("refuses a --harness that names another harness", () => {
    expect(() => agentAdapter({ adapterFlag: "pi" }, settings, "claude")).toThrow("this agent runs claude; --harness pi cannot change it");
  });
});

describe("a model change on a running session", () => {
  test("is refused for a harness that cannot change a running session's model", () => {
    expect(() => refuseModelChange(claudeAdapter, "haiku", "sonnet")).toThrow("claude cannot change a running session's model (haiku)");
  });

  test("passes when the model stays, when nothing was recorded, or when the harness can change it", () => {
    expect(() => refuseModelChange(claudeAdapter, "haiku", "haiku")).not.toThrow();
    expect(() => refuseModelChange(claudeAdapter, null, "haiku")).not.toThrow();
    expect(() => refuseModelChange(piAdapter, "openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol")).not.toThrow();
  });
});
