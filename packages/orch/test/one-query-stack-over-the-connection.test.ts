import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import * as connection from "../src/store/connection.ts";

/**
 * TASKS/10-review-findings.md 2.3 — "pick one."
 *
 * `OpenDatabase` held a hand-rolled raw-SQL port AND a drizzle handle over the
 * same connection, so every query chose a stack and every schema change touched
 * two definitions. Drizzle is the one that stayed: it derives its row types from
 * `src/db/schema.ts`, which is what removes the `.get(...) as {...}` casts Rule 13
 * forbids. The raw port is only gone when nothing can reach it.
 */
const packageRoot = join(import.meta.dir, "..");
const THIS_FILE = join(import.meta.dir, "one-query-stack-over-the-connection.test.ts");

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (path.endsWith(".ts")) found.push(path);
  }
  return found;
}

describe("one query stack over the connection (2.3)", () => {
  test("the store exposes no raw-SQL port beside the typed one", () => {
    const exported: Record<string, unknown> = connection;
    expect(Object.keys(exported).filter((name) => name === "openStore" || name === "transaction")).toEqual([]);
  });

  // The port is deleted only when nothing anywhere still prepares a statement
  // through it. A src-only scan passes while sixty test files hold the old
  // stack open, which is exactly the half-migration 2.3 names.
  test("nothing in the repo prepares a statement through the deleted port", () => {
    const callers = ["src", "test", "scripts", "extensions"]
      .flatMap((dir) => sourceFiles(join(packageRoot, dir)))
      .filter((file) => file !== THIS_FILE)
      .flatMap((file) => {
        const lines = readFileSync(file, "utf8").split("\n");
        return lines.flatMap((line, index) => line.includes(".query(") ? [`${file}:${index + 1}`] : []);
      });
    expect(callers).toEqual([]);
  });
});
