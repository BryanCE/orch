import { randomUUID } from "node:crypto";
import { orm, registerMemoReset, withTransaction } from "./connection.ts";
import { storeIdentity } from "../db/schema.ts";
import type { OrchDir } from "../types/core.ts";

const held = new Map<OrchDir, string>();
registerMemoReset(() => held.clear());

/** This store's identity, minted on first ask. A rebuilt store answers with another. */
export function storeId(orchDir: OrchDir): string {
  const known = held.get(orchDir);
  if (known !== undefined) return known;
  const id = withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const row = db.select({ id: storeIdentity.id }).from(storeIdentity).get();
    if (row !== undefined) return row.id;
    const minted = randomUUID();
    db.insert(storeIdentity).values({ id: minted, createdAt: Date.now() }).run();
    return minted;
  });
  held.set(orchDir, id);
  return id;
}
