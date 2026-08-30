import { describe, expect, test } from "bun:test";
import { isTable } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import * as schema from "../src/db/schema.ts";

/**
 * TASKS/02-scope.md A1 — "Entity model: an orch is an agent; **four** facts
 * never welded — identity, provenance, lease, environment. Lifetime is not one
 * of them."
 *
 * The rule is structural, so the test is structural: it reads the schema's own
 * tables rather than a hand-kept list, and fails the moment a column reappears
 * where the model says it cannot live. A row that welds two facts cannot be
 * caught by any behavioural test — every read of it looks correct right up to
 * the moment one fact changes and takes the other three with it.
 */

/** Every table the schema declares, by its SQL name. */
function tableNames(): string[] {
  const names: string[] = [];
  // `isTable` is drizzle's own narrowing, so views and helpers are excluded by
  // the type system rather than by catching the error they would have thrown.
  for (const value of Object.values(schema)) {
    if (isTable(value)) names.push(getTableConfig(value).name);
  }
  return names.sort();
}

function columnNames(table: string): string[] {
  for (const value of Object.values(schema)) {
    if (!isTable(value)) continue;
    const config = getTableConfig(value);
    if (config.name === table) return config.columns.map((column) => column.name).sort();
  }
  throw new Error(`no table named ${table} in src/db/schema.ts`);
}

/** Environment is where an agent is, and A1 says it never sits on identity. */
const ENVIRONMENT_COLUMNS = ["backend", "plexer", "plexer_id", "space", "space_id", "handle", "pane", "worktree", "branch"];

/** Ownership is a lease on its own timeline, never a column on the thing owned. */
const OWNERSHIP_COLUMNS = ["owner", "owner_key", "held_by", "leased_by"];

/** "Lifetime is not one of them" — an agent has an ending, never a lifetime. */
const LIFETIME_COLUMNS = ["lifetime", "detached", "ephemeral", "persistent"];

describe("A1 — the four facts are never welded", () => {
  test("no table welds identity, provenance, ownership and environment into one row", () => {
    // `spawned` carried all four at once: a pane id for identity, spawned_by for
    // provenance, backend/space/handle/cwd/worktree/branch for environment, and
    // adapter/model for tuning. Moving one of them meant rewriting the identity.
    expect(tableNames()).not.toContain("spawned");
  });

  test("ownership is a lease table, not a second id space", () => {
    // `ownership` keyed on `agent_key` — a second identity for the same agent,
    // with its own liveness story. Rule 11: one entity, one id, one lease.
    expect(tableNames()).not.toContain("ownership");
    expect(tableNames()).toContain("agent_leases");
  });

  test("the agents hub carries identity and provenance only", () => {
    const columns = columnNames("agents");
    for (const forbidden of [...ENVIRONMENT_COLUMNS, ...OWNERSHIP_COLUMNS, ...LIFETIME_COLUMNS]) {
      expect(columns).not.toContain(forbidden);
    }
  });

  test("no table anywhere carries a lifetime", () => {
    for (const table of tableNames()) {
      for (const forbidden of LIFETIME_COLUMNS) {
        expect(columnNames(table)).not.toContain(forbidden);
      }
    }
  });
});
