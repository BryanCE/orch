import { orm } from "../../src/store/connection.ts";
import { sql } from "drizzle-orm";

/**
 * Create a space the way `orch space create` does.
 *
 * A space is USER-created and never minted, so nothing in `src/` conjures one
 * behind a spawn — placing an agent in a space that does not
 * exist is refused. A fixture that spawns into a space therefore has to create
 * it first, exactly as a user would.
 */
export function seedSpace(orchDir: string, id: string, name = id): void {
  orm(orchDir)
    .run(sql`INSERT OR IGNORE INTO spaces (id, name, created_by, created_at) VALUES (${id}, ${name}, NULL, ${1})`);
}
