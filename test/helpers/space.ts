import { openStore } from "../../src/store/connection.ts";

/**
 * Create a space the way `orch space create` does.
 *
 * TASKS/02-scope.md A7: a space is USER-created and never minted, so nothing in
 * `src/` conjures one behind a spawn — placing an agent in a space that does not
 * exist is refused. A fixture that spawns into a space therefore has to create
 * it first, exactly as a user would.
 */
export function seedSpace(orchDir: string, id: string, name = id): void {
  openStore(orchDir)
    .query("INSERT OR IGNORE INTO spaces (id, name, created_by, created_at) VALUES (?, ?, NULL, ?)")
    .run(id, name, 1);
}
