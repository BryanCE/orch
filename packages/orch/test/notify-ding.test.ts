import { describe, expect, test } from "bun:test";
import { commandArgv, createBuiltinNotifiers, hostShell } from "../src/notify/sinks.ts";
import { soundTierBinaries } from "../src/notify/ding.ts";
import { notifierRemediation } from "../src/notify/remediation.ts";
import { NOTIFY_IDS, NOTIFY_SIMPLE_IDS } from "../src/settings/schema.ts";
import { renderNotifyEntry } from "../src/setup/notifiers.ts";

describe("notify/ding", () => {
  test("the sound sink is a declared sink that takes no configuration", () => {
    const sound = createBuiltinNotifiers().find((notifier) => notifier.id === "sound");
    expect(sound?.metadata.requiredConfig).toEqual([]);
    expect(NOTIFY_IDS).toContain("sound");
    expect(NOTIFY_SIMPLE_IDS).toContain("sound");
    expect(renderNotifyEntry("sound", { on: ["done"] })).toEqual({ id: "sound", on: ["done"] });
  });

  test("this host names the players it would use, and says how to get one", () => {
    const tiers = soundTierBinaries();
    expect(tiers.length).toBeGreaterThan(0);
    expect(notifierRemediation("sound")).toContain(tiers[0]!);
  });

  test("a command string runs through the host's own shell; argv is passed through untouched", () => {
    const shell = hostShell();
    expect(shell.length).toBeGreaterThan(1);
    expect(commandArgv("orch-ding")).toEqual([...shell, "orch-ding"]);
    // Already argv: nothing is prepended, so a command sink never depends on a shell existing.
    expect(commandArgv(["orch-ding", "--now"])).toEqual(["orch-ding", "--now"]);
  });
});
