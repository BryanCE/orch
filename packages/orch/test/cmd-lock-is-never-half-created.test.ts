import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireCommandLock, releaseCommandLock } from "../src/control/cmd-lock.ts";
import { createFileExclusively } from "../src/util.ts";
import { isRecord } from "../src/util.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * The command lock file must never be observable HALF-CREATED.
 *
 * `createLock` used to `openSync(path, "wx")` and then `writeSync` the record.
 * Between those two syscalls the file EXISTS and is EMPTY, and that window is
 * not theoretical: a reader racing a writer on this machine saw it on 21,948 of
 * 340,048 reads.
 *
 * A waiter landing in that window is the bug. `loadLock` parses nothing, returns
 * null, and `acquireCommandLock` reads null as "there is no lock here", unlinks
 * the file and takes the lock — while the holder that created it is still
 * running its command. Two commands then run at once, which is the one thing
 * this lock exists to prevent. It surfaced as `cmd-lock-serialize` failing its
 * non-overlap assertion only under full-suite load, because load is what widens
 * the window.
 *
 * `src/daemon/lifecycle.ts` wrote its two locks the same way, with the same
 * consequence one level up: `readDaemonRegistration` parses nothing, so
 * `registerDaemon` evicts the LIVE machine-wide registration and a second orchd
 * starts, and `canReclaim(undefined, ...)` reads an unparseable record as
 * "nobody holds this" and hands away a running daemon's lock. All three now go
 * through `createFileExclusively`, so this covers the one helper.
 *
 * Existence and content have to land in ONE step, so this asserts the property
 * directly rather than re-rolling the dice on a race.
 */

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) removeTempDir(root); });

const WATCH_MS = 1_500;

/** A separate process, because the window is only observable ACROSS processes:
 *  `createLock` is synchronous, so nothing in this runtime can interleave. */
function watchLockFile(path: string) {
  const script = [
    "const { readFileSync, existsSync } = require('node:fs');",
    `const path = ${JSON.stringify(path)};`,
    `const deadline = Date.now() + ${WATCH_MS};`,
    "let seen = 0, bad = 0;",
    "while (Date.now() < deadline) {",
    "  if (!existsSync(path)) continue;",
    "  let text;",
    "  try { text = readFileSync(path, 'utf8'); }",
    // Vanishing between the check and the read is the holder RELEASING, which is
    // correct behaviour and not what this test is looking for.
    "  catch (error) { if (error && error.code !== 'ENOENT') bad++; continue; }",
    "  seen++;",
    "  if (text.length === 0) { bad++; continue; }",
    "  try {",
    "    const value = JSON.parse(text);",
    "    if (typeof value.pid !== 'number' || typeof value.start_token !== 'string') bad++;",
    "  } catch { bad++; }",
    "}",
    "process.stdout.write(JSON.stringify({ seen, bad }));",
  ].join(" ");
  return Bun.spawn([process.execPath, "-e", script], { stdout: "pipe", stderr: "pipe" });
}

describe("the command lock file is never observable half-created", () => {
  test("a reader racing acquire/release never sees an existing but incomplete lock", async () => {
    const root = mkdtempSync(join(tmpdir(), "orch-cmd-lock-atomic-"));
    roots.push(root);
    const path = join(root, "cmd-lock.json");
    const watcher = watchLockFile(path);

    const deadline = Date.now() + WATCH_MS;
    let cycles = 0;
    while (Date.now() < deadline) {
      const lock = await acquireCommandLock(root, { holder: "cycle", timeoutMs: 5_000, pollMs: 10 });
      releaseCommandLock(root, lock.pid, lock.start_token);
      cycles++;
    }

    const [, output] = await Promise.all([watcher.exited, new Response(watcher.stdout).text()]);
    const observed: unknown = JSON.parse(output.trim() || "{}");
    expect(isRecord(observed)).toBe(true);
    // The test proves nothing if the reader never caught the file at all.
    expect(cycles).toBeGreaterThan(0);
    expect(isRecord(observed) && typeof observed.seen === "number" && observed.seen).toBeGreaterThan(0);
    // The whole assertion: every time the file existed, it held a complete
    // record. An empty one is a live holder a waiter would delete.
    expect(isRecord(observed) ? observed.bad : -1).toBe(0);
  }, 30_000);

  test("createFileExclusively refuses a taken path and leaves no staging file behind", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-exclusive-create-"));
    roots.push(root);
    const path = join(root, "held.json");

    expect(createFileExclusively(path, JSON.stringify({ holder: "first" }))).toBe(true);
    // The second caller is TOLD it is taken. It never truncates, never
    // overwrites, and never sees the file mid-write.
    expect(createFileExclusively(path, JSON.stringify({ holder: "second" }))).toBe(false);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ holder: "first" });
    // A refused attempt leaves nothing: a staging file that survived would look
    // like a lock nobody holds to anything scanning the directory.
    expect(readdirSync(root)).toEqual(["held.json"]);
  });
});
