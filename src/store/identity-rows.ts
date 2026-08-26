import { randomUUID } from "node:crypto";
import { isRecord } from "../util.ts";
import { openStore } from "./connection.ts";

export interface SessionIdentity {
  readonly id: string;
  readonly label: string;
  readonly kind: "session";
}

interface SessionIdentityRow {
  id: string;
  label: string;
  kind: string;
  started_at: string;
}

function rowToSessionIdentity(row: SessionIdentityRow): SessionIdentity {
  if (row.kind !== "session") throw new Error(`malformed session identity kind: ${row.kind}`);
  return { id: row.id, label: row.label, kind: "session" };
}

/** The one place an identity read off the wire is verified, so a caller of `hello`
 *  can use the result without a cast. */
export function isSessionIdentity(value: unknown): value is SessionIdentity {
  return isRecord(value)
    && typeof value.id === "string" && value.id.length > 0
    && typeof value.label === "string"
    && value.kind === "session";
}

/** Return the identity for a session process, minting it once when first observed.
 *  Every caller keys on the same column: there is no second class of participant. */
export function getOrCreateSessionIdentity(orchDir: string, ancestorPid: number, startedAt: string, label: string): SessionIdentity {
  const db = openStore(orchDir);
  db.query(
    `INSERT INTO session_identities (ancestor_pid, id, label, kind, started_at)
     VALUES (?, ?, ?, 'session', ?)
     ON CONFLICT(ancestor_pid) DO UPDATE SET
       id = CASE WHEN session_identities.started_at = excluded.started_at
                THEN session_identities.id ELSE excluded.id END,
       label = excluded.label,
       started_at = excluded.started_at`,
  ).run(ancestorPid, randomUUID(), label, startedAt);
  const row = db.query("SELECT id, label, kind, started_at FROM session_identities WHERE ancestor_pid = ?").get(ancestorPid) as SessionIdentityRow | null;
  if (!row) throw new Error(`session identity disappeared for ancestor ${ancestorPid}`);
  return rowToSessionIdentity(row);
}

export function deleteSessionIdentitiesBefore(orchDir: string, cutoffIso: string): number {
  return openStore(orchDir).query("DELETE FROM session_identities WHERE started_at < ?").run(cutoffIso).changes;
}
