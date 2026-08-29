import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { agentViews } from "../src/store/agent-view.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-instants-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

describe("epoch-millisecond store instants", () => {
  test("a lease records its holding as an integer instant", () => {
    const dir = fixture();
    recordSpawned("aaaaaaaaa1", { adapter: "pi", backend: "headless", owner: "bbbbbbbbb1" });

    expect(openStore(dir).query("SELECT typeof(since) AS kind FROM agent_leases WHERE agent_id = 'aaaaaaaaa1'").get())
      .toEqual({ kind: "integer" });
  });

  test("agents order numerically by their creation instant, never lexically", () => {
    const dir = fixture();
    // These ISO spellings misorder lexicographically: the -01:00 value is later
    // in UTC despite its earlier wall-clock prefix.
    const later = Date.parse("2026-01-01T00:30:00.000-01:00");
    const earlier = Date.parse("2026-01-01T01:00:00.000Z");
    expect(later).toBeGreaterThan(earlier);

    const db = openStore(dir);
    db.query("INSERT OR IGNORE INTO harnesses (id, name, enabled_at) VALUES ('pi','pi',NULL)").run();
    for (const [id, createdAt] of [["laaaaaaaaa", later], ["eaaaaaaaaa", earlier]] as const) {
      db.query("INSERT INTO agents (id, root_agent_id, harness_id, cwd, name, created_at) VALUES (?,?,?,?,?,?)")
        .run(id, id, "pi", dir, id, createdAt);
    }

    expect(agentViews(dir).map((view) => [view.id, view.createdAt]))
      .toEqual([["eaaaaaaaaa", earlier], ["laaaaaaaaa", later]]);
  });

  test("all time-named columns use integer declarations", () => {
    const source = readFileSync(join(import.meta.dir, "../src/db/schema.ts"), "utf8");
    const lines = source.split("\n");
    const timeName = /(?:At$|^ts$|^since$|^until$|^started|^finished|_at\")/i;
    const violations = lines.filter((line) => timeName.test(line) && /:\s*text\(/.test(line));
    expect(violations).toEqual([]);
  });
});
