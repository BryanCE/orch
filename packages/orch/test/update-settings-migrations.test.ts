import { describe, expect, test } from "bun:test";
import { planSettingsMigration, type SettingsMigration } from "../src/update/settings-migrations.ts";

describe("settings migration planning", () => {
  const migrations: readonly SettingsMigration[] = [
    {
      summary: "first shape change",
      migrate: (root) => ({ ...root, first: true }),
    },
    {
      summary: "second shape change",
      migrate: (root) => ({ ...root, second: true }),
    },
  ];

  test("recognizes current, unversioned, and newer settings", () => {
    expect(planSettingsMigration({ schemaVersion: 3 }, migrations)).toEqual({ kind: "current" });
    expect(planSettingsMigration(null, migrations)).toEqual({ kind: "unversioned" });
    expect(planSettingsMigration({ schemaVersion: "1" }, migrations)).toEqual({ kind: "unversioned" });
    expect(planSettingsMigration({ schemaVersion: 4 }, migrations)).toEqual({
      kind: "newer",
      found: 4,
      current: 3,
    });
  });

  test("applies every migration in order to a copy and stamps each version", () => {
    const input = { schemaVersion: 1, retained: "value" };
    const outcome = planSettingsMigration(input, migrations);

    expect(outcome).toEqual({
      kind: "migrate",
      from: 1,
      to: 3,
      steps: [
        "schemaVersion 1 -> 2: first shape change",
        "schemaVersion 2 -> 3: second shape change",
      ],
      migrated: { schemaVersion: 3, retained: "value", first: true, second: true },
    });
    expect(input).toEqual({ schemaVersion: 1, retained: "value" });
  });

  test("starts at the matching migration when the input is already versioned", () => {
    expect(planSettingsMigration({ schemaVersion: 2, retained: "value" }, migrations)).toEqual({
      kind: "migrate",
      from: 2,
      to: 3,
      steps: ["schemaVersion 2 -> 3: second shape change"],
      migrated: { schemaVersion: 3, retained: "value", second: true },
    });
  });
});
