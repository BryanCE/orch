import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { finishUpdate, type FinishSteps } from "../src/update/finish.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { settingsRepair } from "../src/settings/auto-repair.ts";
import { SETTINGS_SCHEMA, settingsPath } from "../src/settings/schema.ts";
import type { CheckResult } from "../src/types/doctor.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) removeTempDir(directory);
});

function makeServices(settings: Record<string, unknown> = {}) {
  const orchDir = tempOrchDir("orch-update-finish-");
  directories.push(orchDir);
  writeSettingsFixture(orchDir, settings);
  const base = testServices({ orchDir, settings: null });
  return { ...base, settings: fileSettingsManager(orchDir) };
}

function steps(results: CheckResult[], started: () => void = () => undefined): FinishSteps {
  return {
    doctor: () => Promise.resolve(results),
    startDaemon: () => {
      started();
      return Promise.resolve();
    },
  };
}

describe("finishUpdate", () => {
  test("repairs a typo before returning a clean settings file", async () => {
    const services = makeServices({ fleet: { max_dpeth: 3 } });
    const report = await finishUpdate(services, steps([]));
    expect(report).toMatchObject({ kind: "finished", settingsChanges: ["fleet.max_dpeth: rename → fleet.max_depth"] });
    expect(JSON.parse(readFileSync(settingsPath(services.orchDir), "utf8"))).toMatchObject({ fleet: { max_depth: 3 } });
    expect(settingsRepair(services.settings).plan.kind).toBe("clean");
  });

  test("refuses newer settings and does not start the daemon", async () => {
    const services = makeServices();
    writeFileSync(settingsPath(services.orchDir), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA + 1, runtime: "node" }));
    let started = false;
    const report = await finishUpdate(services, steps([], () => { started = true; }));
    expect(report).toMatchObject({ kind: "failed", step: "settings" });
    expect(started).toBe(false);
  });

  test("applies fixable doctor rows and reports failures that remain", async () => {
    const services = makeServices();
    let applied = false;
    const rows: CheckResult[] = [
      { id: "fix", label: "Fixable row", status: "fail", detail: "needs repair", fix: { description: "repair row", apply: () => { applied = true; } } },
      { id: "environment", label: "Environment row", status: "fail", detail: "not installed" },
    ];
    const report = await finishUpdate(services, steps(rows));
    expect(applied).toBe(true);
    expect(report).toMatchObject({ kind: "finished", fixes: ["repair row"], failing: [{ label: "Fixable row", detail: "needs repair" }, { label: "Environment row", detail: "not installed" }] });
  });
});
