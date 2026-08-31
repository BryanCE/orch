import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settingsDefects } from "../src/settings/defects.ts";
import { createRepairState, plannedRepairs, repairReducer } from "../src/settings/repair.ts";
import { applySettingsRepairs } from "../src/settings/write.ts";
import { readSettingsFile } from "../src/settings/read.ts";
import type { RepairChoice, RepairState } from "../src/types/settings.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function orchDirWith(settings: Record<string, unknown>): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-repair-"));
  directories.push(directory);
  writeFileSync(join(directory, "settings.json"), JSON.stringify(settings, null, 2) + "\n");
  return directory;
}

/** Walk focus to a defect by key and choose an action, the way a person's keystrokes would. */
function choose(state: RepairState, path: string, choice: RepairChoice): RepairState {
  let current = state;
  while (current.defects[current.focusedIndex]?.path !== path) {
    const before = current.focusedIndex;
    current = repairReducer(current, { type: "move", direction: "down" });
    if (current.focusedIndex === before) throw new Error(`no defect at ${path}`);
  }
  return repairReducer(current, { type: "choose", choice });
}

/** The exact file this feature was built for: a settings.json written by an older orch,
 *  every key of which the current schema rejects. */
const STALE_FILE = {
  schemaVersion: 4,
  runtime: "bun",
  enabled: { adapters: ["pi", "claude"], backends: ["herdr", "headless", "tmux"] },
  defaults: { adapter: "pi", backend: "herdr", models: { pi: "openai-codex/gpt-5.6-luna:high" }, worktree: false },
  fleet: { spawn_cap: 8, pack_cap: 10, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false },
  workspaces: {},
};

describe("repairing a settings.json the schema rejects", () => {
  test("reports every rejected key without touching the file", () => {
    const directory = orchDirWith(STALE_FILE);
    const file = join(directory, "settings.json");
    const before = readFileSync(file, "utf8");

    const paths = settingsDefects(file).map((defect) => defect.path);
    expect(paths).toContain("schemaVersion");
    expect(paths).toContain("fleet.spawn_cap");
    expect(paths).toContain("fleet.pack_cap");
    expect(paths).toContain("fleet.workspace_caps");
    expect(paths).toContain("fleet.cross_workspace");
    expect(paths).toContain("workspaces");
    // Diagnosis is not repair: reading a broken file may not change it.
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  test("a removed key is never guessed at - it offers no rename", () => {
    const directory = orchDirWith(STALE_FILE);
    const defects = settingsDefects(join(directory, "settings.json"));
    const spawnCap = defects.find((defect) => defect.path === "fleet.spawn_cap");
    // fleet.max_agents_total is what replaced it, but that is a rename only a person
    // can intend. Proposing it would be orch inventing what the value meant.
    expect(spawnCap?.suggestion).toBeUndefined();
  });

  test("the choices a person makes leave the file loadable", () => {
    const directory = orchDirWith(STALE_FILE);
    const file = join(directory, "settings.json");

    let state = createRepairState(settingsDefects(file));
    state = choose(state, "schemaVersion", "set");
    for (const path of ["fleet.spawn_cap", "fleet.pack_cap", "fleet.workspace_caps", "fleet.cross_workspace", "workspaces"]) {
      state = choose(state, path, "drop");
    }
    applySettingsRepairs(directory, plannedRepairs(state));

    expect(settingsDefects(file)).toEqual([]);
    const loaded = readSettingsFile(file);
    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.runtime).toBe("bun");
    // Everything the person never touched survives the repair verbatim.
    expect(loaded?.defaults?.adapter).toBe("pi");
    expect(loaded?.enabled?.backends).toEqual(["herdr", "headless", "tmux"]);
  });

  test("a typo keeps its value: renaming carries it to the real key", () => {
    const directory = orchDirWith({ schemaVersion: 1, runtime: "node", fleet: { max_dpeth: 6 } });
    const file = join(directory, "settings.json");

    const defects = settingsDefects(file);
    const typo = defects.find((defect) => defect.path === "fleet.max_dpeth");
    expect(typo?.suggestion).toBe("fleet.max_depth");
    expect(typo?.value).toBe(6);

    applySettingsRepairs(directory, plannedRepairs(choose(createRepairState(defects), "fleet.max_dpeth", "rename")));

    expect(settingsDefects(file)).toEqual([]);
    // The whole point: the 6 someone typed is still a 6.
    expect(readSettingsFile(file)?.fleet?.max_depth).toBe(6);
  });

  test("leaving every defect alone writes nothing at all", () => {
    const directory = orchDirWith(STALE_FILE);
    const file = join(directory, "settings.json");
    const before = readFileSync(file, "utf8");

    const state = createRepairState(settingsDefects(file));
    expect(plannedRepairs(state)).toEqual([]);
    applySettingsRepairs(directory, plannedRepairs(state));

    expect(readFileSync(file, "utf8")).toBe(before);
  });
});
