import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VOCABULARY, roleOf, term } from "../src/policy/vocabulary.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent, renameAgent } from "../src/store/agent-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";
import { stringField } from "./helpers/rows.ts";

/**
 * Vocabulary (orch / slave / pack / space) is a display map, never stored — roles
 * are derived from the tree. User-configurable terms are later polish, but the
 * ONE-MAP constraint holds from day one.
 */

function withStore(body: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "orch-vocabulary-"));
  const db = orm(directory);
  db.run(sql`INSERT INTO harnesses (id, name) VALUES ('pi', 'pi') ON CONFLICT DO NOTHING`);
  try {
    body(directory);
  } finally {
    closeAllStores();
    removeTempDir(directory);
  }
}

/** Every .ts file orch ships, so a new module cannot quietly spell its own terms. */
function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) found.push(path);
  }
  return found;
}

describe("vocabulary is a display map, and a role is tree position", () => {
  test("a role is derived from the tree, never stored", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "root", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "lead", createdAt: 1 });
      insertAgent(directory, { id: "child", spawnedBy: "root", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 2 });

      // A11: orch = pack root, slave = any non-root member. Nothing writes this
      // down — it is read off rootAgentId, which is provenance and immutable.
      expect(roleOf(agentView(directory, "root")!)).toBe("orch");
      expect(roleOf(agentView(directory, "child")!)).toBe("slave");
    });
  });

  test("no table carries a role column: there is nothing to disagree with the tree", () => {
    withStore((directory) => {
      const db = orm(directory);
      const tables = db.all(sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
      for (const table of tables) {
        const name = stringField(table, "name");
        // A pragma names its table as an identifier, never as a bound value.
        const columns = db.all(sql.raw(`PRAGMA table_info(${name})`));
        const names = columns.map((column) => stringField(column, "name"));
        // A role is the only thing A8 forbids storing. `grant_requests.kind` is
        // a grant kind, not a rank, and is none of this row's business.
        expect(names).not.toContain("role");
        expect(names).not.toContain("is_orch");
        expect(names).not.toContain("is_slave");
      }
    });
  });

  test("renaming an agent or moving its lease never changes its role", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "root", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "lead", createdAt: 1 });
      insertAgent(directory, { id: "child", spawnedBy: "root", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 2 });

      // A name is for the human and a lease is mutual exclusion. Neither is a
      // role, so neither may move one. Losing a holder costs a driver, not a
      // rank (Rule 11).
      renameAgent(directory, "child", "promoted");
      acquireLease(directory, "child", "root", 10);
      expect(roleOf(agentView(directory, "child")!)).toBe("slave");

      releaseLease(directory, "child", "root", 20);
      expect(roleOf(agentView(directory, "child")!)).toBe("slave");
      expect(roleOf(agentView(directory, "root")!)).toBe("orch");
    });
  });

  test("every role term orch displays comes from the one map", () => {
    expect(term("orch")).toBe(VOCABULARY.orch);
    expect(term("slave")).toBe(VOCABULARY.slave);
    expect(term("pack")).toBe(VOCABULARY.pack);
    expect(term("space")).toBe(VOCABULARY.space);
  });

  test("no module outside the map spells a role term into a user-facing string", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(import.meta.dir, "../src"))) {
      if (file.endsWith(join("policy", "vocabulary.ts"))) continue;
      // The `Role` type is `Extract<Term, ...>` over that same map — the map's own
      // declaration, in the types layer where every type now lives. It quotes the
      // terms by necessity, exactly as reading the map does, and displays nothing.
      if (file.endsWith(join("types", "policy.ts"))) continue;
      // Rule 10: a shipped bundle's OUTPUT name is an artifact the installed
      // tree and doctor already know. It is an identifier, not a word orch
      // displays, and renaming a term must never rename it.
      if (file.endsWith(join("extensions", "bundles.ts"))) continue;
      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        // Reading the map IS the correct usage, and both forms quote the term
        // by necessity. Strip them so the check sees only hand-spelled words.
        .replace(/\bterm\(\s*["'`]\w+["'`]\s*\)/g, "")
        .replace(/\bVOCABULARY\.\w+/g, "");
      // The role nouns, in a string literal. "space" is excluded: it is a
      // column, a flag and a command name, and A8 governs how a term is
      // DISPLAYED, not that the word may never appear.
      for (const match of source.matchAll(/["'`][^"'`]*\b(orchestrator|slave)s?\b[^"'`]*["'`]/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    // Every one of these must build its text from `term()`, or the day Bryan
    // renames "slave" the word survives in half the messages.
    expect(offenders).toEqual([]);
  });
});
