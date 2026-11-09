import type { OrchDir } from "../src/types/core.ts";
import { describe, expect, test } from "bun:test";



import { fileSettingsManager } from "../src/settings/manager.ts";
import { probeNotifiers } from "../src/daemon/server/notifier-probe.ts";
import {
  buildSelectedNotifyEntries,
  collectRequiredConfig,
  renderNotifyEntry,
} from "../src/setup/notifiers.ts";
import { notifierPromptOptions } from "../src/setup/wizard.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/** The fields the webhook and command notifiers declare, as orchd's probe reports them. */
const URL_FIELD = { name: "url", label: "URL" };
const COMMAND_FIELD = { name: "command", label: "Command" };

describe("notifier setup logic", () => {
  test("probes the built-in adapters", async () => {
    const choices = await probeNotifiers(null);
    expect(choices.map((choice) => choice.id)).toEqual(["herdr", "desktop", "webhook", "sound", "command"]);
    expect(choices.every((choice) => typeof choice.available === "boolean")).toBe(true);
    expect(choices.find((choice) => choice.id === "webhook")?.requiredFields.map((field) => field.name)).toEqual(["url"]);
  });

  test("lists unavailable notifiers with remediation and disables selection", () => {
    const options = notifierPromptOptions([
      {
        id: "desktop",
        label: "Desktop",
        available: false,
        remediation: "fix: install notify-send",
        requiredFields: [],
      },
      {
        id: "webhook",
        label: "Webhook",
        available: true,
        remediation: "fix: verify the adapter installation and configuration",
        requiredFields: [],
      },
    ]);
    expect(options).toEqual([
      {
        value: "desktop",
        label: "Desktop (unavailable)",
        hint: "fix: install notify-send",
        checked: false,
        disabled: true,
      },
      { value: "webhook", label: "Webhook", hint: "", checked: false },
    ]);
    expect(options.find((option) => option.value === "desktop")?.disabled).toBe(true);
    expect(options.find((option) => option.value === "webhook")?.disabled).toBeUndefined();
  });

  test("collects only declared fields and rejects a missing webhook URL", () => {
    expect(collectRequiredConfig([URL_FIELD], { extra: "ignored" })).toEqual({ ok: false, missing: ["url"] });
    expect(collectRequiredConfig([COMMAND_FIELD], { command: ["sh", "-c", "echo ok"], extra: true })).toEqual({
      ok: true,
      config: { command: ["sh", "-c", "echo ok"] },
    });
  });

  test("renders a command entry that loadSettings can parse", () => {
    const entry = renderNotifyEntry("command", { command: ["sh", "-c", "echo ok"], ignored: "not collected" });
    expect(entry).toEqual({ id: "command", command: ["sh", "-c", "echo ok"] });
    const directory: OrchDir = tempOrchDir("orch-setup-notifiers-");
    try {
      writeSettingsFixture(directory, { notify: [entry] });
      expect(fileSettingsManager(directory).current().notify).toEqual([{
        id: "command",
        command: ["sh", "-c", "echo ok"],
      }]);
    } finally {
      removeTempDir(directory);
    }
  });

  test("builds valid entries and reports invalid selections", () => {
    const result = buildSelectedNotifyEntries([
      { id: "webhook", requiredFields: [URL_FIELD], config: {} },
      { id: "command", requiredFields: [COMMAND_FIELD], config: { command: ["sh"] } },
    ]);
    expect(result.errors).toEqual([{ id: "webhook", missing: ["url"] }]);
    expect(result.entries).toEqual([{ id: "command", command: ["sh"] }]);
  });
});
