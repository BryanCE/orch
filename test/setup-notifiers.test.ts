import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.ts";
import {
  buildSelectedNotifyEntries,
  collectRequiredConfig,
  probeNotifiers,
  renderNotifyEntry,
} from "../src/setup/notifiers.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

describe("notifier setup logic", () => {
  test("probes the built-in adapters", async () => {
    const choices = await probeNotifiers();
    expect(choices.map((choice) => choice.id)).toEqual(["herdr", "desktop", "webhook", "command"]);
    expect(choices.every((choice) => typeof choice.available === "boolean")).toBe(true);
    expect(choices.find((choice) => choice.id === "webhook")?.requiredFields.map((field) => field.name)).toEqual(["url"]);
  });

  test("collects only declared fields and rejects a missing webhook URL", () => {
    expect(collectRequiredConfig("webhook", { extra: "ignored" })).toEqual({ ok: false, missing: ["url"] });
    expect(collectRequiredConfig("command", { command: ["sh", "-c", "echo ok"], extra: true })).toEqual({
      ok: true,
      config: { command: ["sh", "-c", "echo ok"] },
    });
  });

  test("renders a command entry that loadConfig can parse", () => {
    const entry = renderNotifyEntry("command", { command: ["sh", "-c", "echo ok"], ignored: "not collected" });
    expect(entry).toEqual({ id: "command", command: ["sh", "-c", "echo ok"] });
    const directory = mkdtempSync(join(tmpdir(), "orch-setup-notifiers-"));
    try {
      writeSettingsFixture(directory, { notify: [entry] });
      expect(loadConfig(directory).notify).toEqual([{
        id: "command",
        command: ["sh", "-c", "echo ok"],
      }]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("builds valid entries and reports invalid selections", async () => {
    const result = await buildSelectedNotifyEntries([
      { id: "webhook", config: {} },
      { id: "command", config: { command: ["sh"] } },
    ]);
    expect(result.errors).toEqual([{ id: "webhook", missing: ["url"] }]);
    expect(result.entries).toEqual([{ id: "command", command: ["sh"] }]);
  });
});
