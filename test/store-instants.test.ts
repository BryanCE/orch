import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { insertSpawnedRecord, selectSpawnedRecords } from "../src/store/spawned-rows.ts";
import { setOwner } from "../src/store/ownership-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-instants-"));
  dirs.push(dir);
  return dir;
}

describe("epoch-millisecond store instants", () => {
  test("round-trips instants as numbers and orders numerically", () => {
    const dir = fixture();
    setOwner(dir, "worker", "orch");
    expect(openStore(dir).query("SELECT typeof(updated_at) AS kind FROM ownership WHERE agent_key='worker'").get()).toEqual({ kind: "integer" });

    // These ISO spellings misorder lexicographically: the -01:00 value is later
    // in UTC despite its earlier wall-clock prefix.
    const later = Date.parse("2026-01-01T00:30:00.000-01:00");
    const earlier = Date.parse("2026-01-01T01:00:00.000Z");
    expect(later).toBeGreaterThan(earlier);
    insertSpawnedRecord(dir, { pane: "later", ts: later });
    insertSpawnedRecord(dir, { pane: "earlier", ts: earlier });
    expect(selectSpawnedRecords(dir).map((row) => [row.pane, row.ts])).toEqual([["earlier", earlier], ["later", later]]);
  });

  test("all time-named columns use integer declarations", () => {
    const source = readFileSync(join(import.meta.dir, "../src/store/tables.ts"), "utf8");
    const lines = source.split("\n");
    const timeName = /(?:At$|^ts$|^since$|^until$|^started|^finished|_at\")/i;
    const violations = lines.filter((line) => timeName.test(line) && /:\s*text\(/.test(line));
    expect(violations).toEqual([]);
  });
});
