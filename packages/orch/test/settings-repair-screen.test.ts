import { describe, expect, test } from "bun:test";
import { repairActionLabel, repairFrame, stripAnsi } from "../src/settings/view.ts";
import type { RepairScreen } from "../src/settings/view.ts";
import type { RepairChoice, SettingsDefect } from "../src/types/settings.ts";

const staleKey: SettingsDefect = { path: "fleet.spawn_cap", value: 8, problem: "not a settings key" };
const typo: SettingsDefect = { path: "fleet.max_dpeth", value: 2, problem: "not a settings key", suggestion: "fleet.max_depth" };
const staleVersion: SettingsDefect = { path: "schemaVersion", value: 4, problem: "expected 1", expected: 1 };

function screen(defects: readonly SettingsDefect[], choices: readonly RepairChoice[], focusedIndex = 0): RepairScreen {
  return { file: "/home/someone/.orch/settings.json", defects, choices, focusedIndex, status: undefined };
}

function frameLines(view: RepairScreen): string[] {
  return stripAnsi(repairFrame(view, 100, 24)).split("\n");
}

describe("repair action labels", () => {
  test("names the key a rename lands on, so the destination is never a guess", () => {
    expect(repairActionLabel(typo, "rename")).toBe("rename -> fleet.max_depth");
  });

  test("names the value a set writes", () => {
    expect(repairActionLabel(staleVersion, "set")).toBe("set 1");
  });

  test("drop and leave say only what they do", () => {
    expect(repairActionLabel(staleKey, "drop")).toBe("drop");
    expect(repairActionLabel(staleKey, "leave")).toBe("leave");
  });
});

describe("repair frame", () => {
  test("shows every defect with the value the person wrote", () => {
    const lines = frameLines(screen([staleKey, typo, staleVersion], ["leave", "leave", "leave"]));
    const body = lines.join("\n");
    expect(body).toContain("fleet.spawn_cap");
    expect(body).toContain("= 8");
    expect(body).toContain("not a settings key");
    expect(body).toContain("schemaVersion");
    expect(body).toContain("= 4");
  });

  test("promises that nothing changes before a save, because nothing does", () => {
    const body = frameLines(screen([staleKey], ["leave"])).join("\n");
    expect(body).toContain("Nothing changes until you save");
  });

  test("every defect starts at leave, so opening the screen destroys nothing", () => {
    const body = frameLines(screen([staleKey, typo], ["leave", "leave"])).join("\n");
    expect(body).toContain("[leave]");
    expect(body).not.toContain("[drop]");
  });

  test("a chosen repair is shown as what it will do", () => {
    const body = frameLines(screen([typo, staleVersion], ["rename", "set"])).join("\n");
    expect(body).toContain("[rename -> fleet.max_depth]");
    expect(body).toContain("[set 1]");
  });

  test("the focused row's offered keys are shown, so no choice has to be guessed", () => {
    const stale = frameLines(screen([staleKey, typo], ["leave", "leave"], 0)).join("\n");
    // A removed key offers no rename: there is nothing to rename it to.
    expect(stale).toContain("offers: d l");
    const misspelled = frameLines(screen([staleKey, typo], ["leave", "leave"], 1)).join("\n");
    expect(misspelled).toContain("offers: r d l");
  });

  test("the count reads as English for one defect and for many", () => {
    expect(frameLines(screen([staleKey], ["leave"])).join("\n")).toContain("1 key in this file");
    expect(frameLines(screen([staleKey, typo], ["leave", "leave"])).join("\n")).toContain("2 keys in this file");
  });

  test("no row runs past the terminal width, tag included", () => {
    const long: SettingsDefect = {
      path: "fleet.a_very_long_key_name_that_will_not_fit_in_a_narrow_terminal",
      value: "a value long enough to push the row past the edge on its own",
      problem: "not a settings key",
      suggestion: "fleet.max_depth",
    };
    const narrow = stripAnsi(repairFrame(screen([long], ["rename"]), 60, 24)).split("\n");
    for (const line of narrow) {
      expect(line.length).toBeLessThanOrEqual(60);
    }
  });

  test("the file being repaired is named in the header", () => {
    expect(frameLines(screen([staleKey], ["leave"]))[0]).toContain("/home/someone/.orch/settings.json");
  });
});
