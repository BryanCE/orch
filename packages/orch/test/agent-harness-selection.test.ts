import { afterAll, describe, expect, test } from "bun:test";
// Imported first: entering at the registry keeps the adapter import cycle out of its TDZ.
import "../src/adapters/registry.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { agentAdapter } from "../src/commands/selection.ts";
import { admitAgentModel, refuseModelChange } from "../src/commands/spawn/models.ts";
import type { ModelCatalogue } from "../src/types/adapter.ts";
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

describe("a model the agent's harness does not offer", () => {
  const claudeModels = JSON.stringify({ type: "control_response", response: { subtype: "success", request_id: "models", response: { models: [{ value: "haiku" }] } } });
  const piModels = "provider model context max-out thinking images\nopenai gpt-5.6-luna 400K 128K yes yes\n";
  const catalogue: ModelCatalogue = {
    ...testServices({ orchDir }).models,
    read: (bin) => (bin === "claude" ? `${claudeModels}\n` : piModels),
  };

  // A pi agent sent claude/haiku got only pi's model list and no way forward.
  test("names the harness that offers it and the restart that moves the agent there", () => {
    expect(() => admitAgentModel(settings, "pi", catalogue, "claude/haiku", "d-paytype"))
      .toThrow("d-paytype runs pi, and only a restart changes its harness. Run orch restart d-paytype --harness claude --model haiku, then try again.");
  });

  test("admits a model the agent's own harness offers", () => {
    expect(admitAgentModel(settings, "pi", catalogue, "openai/gpt-5.6-luna", "d-paytype")).toBe("openai/gpt-5.6-luna");
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
