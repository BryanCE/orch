/**
 * The mid-run half of the presence protocol: the inbox drain and the ack marker.
 * Part of the ONE presence writer (see writer.ts) — harness artifacts import
 * these, none reimplements them.
 *
 * Same runtime constraint as writer.ts: node built-ins only, leaf imports only
 * (Rule 6) — the harness shims are bundled standalone and run under node, deno,
 * or bun.
 */
import { appendFileSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { ACK_FILE, INBOX_FILE } from "./schema.ts";
import { presenceFile } from "./writer.ts";

/** Path to the agent's inbox. Exported so a watcher can compare against it. */
export function inboxPath(directory: string): string {
  return presenceFile(directory, INBOX_FILE);
}

/** True when a directory-watch event names the inbox. Keeps the filename
 * comparison on this side of the boundary rather than in each harness. */
export function isInboxFilename(filename: string | Buffer | null | undefined): boolean {
  return filename?.toString() === INBOX_FILE;
}

/** Truncate the inbox, discarding steers addressed to a previous life of this
 * agent. Called once at presence init, never mid-run. */
export function resetInbox(directory: string): void {
  try {
    writeFileSync(inboxPath(directory), "");
  } catch { /* best-effort */ }
}

/**
 * Atomically claim the inbox and return its lines.
 *
 * The claim is a rename, not a read-then-truncate: lines the orchestrator
 * appends mid-drain land in a fresh inbox and are never lost, and a second
 * concurrent drain loses the rename race and returns empty rather than
 * double-delivering. Returns the raw split — blank lines included — so callers
 * see exactly the file's contents.
 */
export function drainInbox(directory: string): string[] {
  const inbox = inboxPath(directory);
  const claim = `${inbox}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.draining`;
  try {
    renameSync(inbox, claim);
  } catch {
    return []; // another drain won the race, or the file does not exist yet
  }
  let chunk = "";
  try {
    chunk = readFileSync(claim, "utf8");
  } catch {
    // Claimed but unreadable: the lines are gone either way; do not re-deliver.
  } finally {
    try { unlinkSync(claim); } catch { /* best-effort */ }
  }
  return chunk.split("\n");
}

/**
 * Append a delivery marker for one inbox message.
 *
 * ack.jsonl is agent-append / daemon-consume: the daemon reads it to mark the
 * matching outbox row delivered exactly once, then truncates it. Never cleared
 * on this side.
 */
export function appendAck(directory: string, id: string, key: string): void {
  try {
    const line = JSON.stringify({ id, key, ts: new Date().toISOString() });
    appendFileSync(presenceFile(directory, ACK_FILE), `${line}\n`);
  } catch { /* best-effort */ }
}
