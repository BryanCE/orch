import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupOrchState, restoreOrchState } from "../src/store/backup.ts";
import { databasePath } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) removeTempDir(dir);
  }
});

describe("orch state backups", () => {
  test("restore returns settings and store files and removes newly created siblings", () => {
    const orchDir = tempOrchDir("orch-state-backup-");
    dirs.push(orchDir);
    const settings = writeSettingsFixture(orchDir, { defaults: { thinking: "high" } });
    const store = databasePath(orchDir);
    const originalSettings = readFileSync(settings);
    const originalStore = Buffer.from("original store bytes");
    writeFileSync(store, originalStore);

    const backup = backupOrchState(orchDir, "test");
    writeFileSync(settings, "changed settings");
    writeFileSync(store, "changed store");
    const wal = `${store}-wal`;
    writeFileSync(wal, "new wal");

    restoreOrchState(backup);

    expect(readFileSync(settings)).toEqual(originalSettings);
    expect(readFileSync(store)).toEqual(originalStore);
    expect(existsSync(wal)).toBe(false);
    expect(backup.dir).toContain(join(orchDir, "backups"));
  });
});
