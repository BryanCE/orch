import { accessSync, chmodSync, constants, existsSync, linkSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { delimiter, dirname, join, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonRecord, OsSide } from "./types/core.ts";

export function osSide(platform: NodeJS.Platform = process.platform): OsSide {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  throw new Error(`unsupported host OS ${platform}`);
}

export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 16; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`packageRoot: no package.json found above ${fileURLToPath(import.meta.url)}`);
}

/**
 * Absolute path of an executable named `bin` on PATH, or null when absent
 * (node-compatible). Callers that write a command into a THIRD-PARTY config file
 * should prefer this over the bare name: the tool spawning that command (claude,
 * codex) may run with a different PATH than orch did — version managers (nvm,
 * fnm, volta, asdf) and Windows-vs-WSL shells routinely differ — so a bare name
 * can resolve to a different binary, or to none at all.
 */
/** Single-quote one value for a POSIX sh command string. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function binaryPath(bin: string): string | null {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const exts = osSide() === "windows" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, bin + ext);
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {}
    }
  }
  return null;
}

/** True when an executable named `bin` is found on PATH (node-compatible). */
export function binaryOnPath(bin: string): boolean {
  return binaryPath(bin) !== null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Read a Node syscall error code only when the thrown value actually carries a string code. */
export function errnoCode(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("code" in value)) return undefined;
  return typeof value.code === "string" ? value.code : undefined;
}

/** The message plus its traceback, for logs a human reads after the fact. */
export function errorTrace(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

/**
 * True for a plain object — a JSON record, not an array.
 *
 * Arrays are excluded deliberately: `typeof [] === "object"`, so a check that
 * only tests for object-and-not-null accepts `[]` as a record and hands callers
 * an array they will then index by string key.
 *
 * Imported by the harness shims too. This module is node built-ins only, so it
 * is safe to pull into the standalone claude/codex/pi bundles (Rule 6 constrains
 * which APIs runtime code may call, not whether it may import orch core).
 */
export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** A string field, or undefined when absent or the wrong type. */
export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** A non-blank string field, trimmed; undefined when absent, blank, or not a string. */
export function textValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

/**
 * Shorten `text` to at most `max` characters, ellipsis included.
 *
 * The ellipsis counts toward the budget — the result is never longer than
 * `max`, which is what makes this safe for fixed-width table columns.
 */
/** The elided-tail marker. ASCII, for the same reason the table rule is: U+2026
 *  reaches a cp1252 console as "â¦". */
const ELLIPSIS = "...";

export function truncate(value: string, max: number): string {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return max <= ELLIPSIS.length ? text.slice(0, max) : text.slice(0, max - ELLIPSIS.length) + ELLIPSIS;
}

/** {@link truncate} over an optional field: undefined in, undefined out. */
export function truncateOptional(value: unknown, max: number): string | undefined {
  const text = textValue(value);
  return text === undefined ? undefined : truncate(text, max);
}

/** Parse a JSON file, or undefined when it is absent or unparseable. */
export function readJsonFile(file: string): unknown {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * The project this process acts for: the spawner's stamp, else the working dir.
 * Spawners hand ORCH_PROJECT down so a worker in a worktree (or any other
 * launch dir) still carries its fleet's project identity, and every presence
 * scope (peer discovery, HUD) walls on it — one machine runs many projects,
 * and only same-project agents are one fleet.
 */
export function projectRoot(): string {
  return process.env.ORCH_PROJECT ?? process.cwd();
}

/**
 * True when a process with this pid exists and we may signal it.
 *
 * `pid <= 0` is rejected rather than passed through: on POSIX `process.kill(0)`
 * targets the caller's own process group and a negative pid targets the group
 * with that id, so a bad pid would report a bogus "alive" for something that is
 * not the process asked about.
 */
export function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    // EPERM means the process exists but belongs to another user.
    return errnoCode(error) === "EPERM";
  }
}

/**
 * A positive-integer pid from a number or an all-digit string, else undefined.
 * The one spelling shared by the harness shims (claude/codex), which read pids
 * from env vars and hook payloads where the type is unknown.
 */
export function parsePid(text: unknown): number | undefined {
  if (typeof text === "number" && Number.isInteger(text) && text > 0) return text;
  if (typeof text === "string" && /^\d+$/.test(text)) {
    const parsed = Number(text);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

/**
 * Create a directory orch owns, private to this uid, and tighten it if it is not.
 *
 * TASKS/02-scope.md B2: the credential is the `0600` token file in `$ORCH_DIR`
 * and SAME-UID IS THE WHOLE TRUST BOUNDARY — B4 rejects peer credentials
 * outright, so the file modes are the only boundary there is. A plain
 * `mkdirSync(orchDir, { recursive: true })` takes the user's umask, which on a
 * default 022 is `0755`: the token stays unreadable, but every presence dir,
 * agent name, cwd and session path beside it is readable by any other account
 * on the machine.
 *
 * The chmod is not redundant with the `mode` option: `mkdirSync` applies mode
 * only when it CREATES, so a directory an earlier run left at `0755` would keep
 * it forever.
 */
/**
 * Create `path` with its content ALREADY IN IT, or report that it is taken.
 *
 * `writeFileSync(path, text, { flag: "wx" })` is open(O_CREAT|O_EXCL) followed by
 * write(2), and between those two syscalls the file EXISTS and is EMPTY. That
 * window is not theoretical: a reader racing a writer on this machine saw it on
 * 6.5% of reads, and it widens under load.
 *
 * Every caller is an exclusive LOCK whose waiter reads the file to decide whether
 * the holder is still alive — and an empty file parses as NO holder. The waiter
 * then deletes a live holder's lock and takes it: two `orch lock run` commands
 * overlapping, or the machine-wide daemon registration evicted so a second orchd
 * starts. `link(2)` is atomic and fails with EEXIST, so the record is complete
 * before the path exists at all.
 *
 * Returns false when something already holds `path`.
 */
export function createFileExclusively(path: string, content: string, mode = 0o600): boolean {
  // The staging name carries the pid and a random suffix so two acquirers racing
  // for the same lock never stage over each other.
  const staging = `${path}.${process.pid}.${randomBytes(6).toString("hex")}`;
  try {
    writeFileSync(staging, content, { encoding: "utf8", flag: "wx", mode });
    try {
      linkSync(staging, path);
      return true;
    } catch (error: unknown) {
      if (errnoCode(error) === "EEXIST") return false;
      throw error;
    }
  } finally {
    try {
      unlinkSync(staging);
    } catch (error: unknown) {
      if (errnoCode(error) !== "ENOENT") throw error;
    }
  }
}

/**
 * A session file path, or undefined when the harness handed back something that
 * is not one.
 *
 * The test is ABSOLUTE, on either convention. `path.isAbsolute` answers for the
 * convention THIS PROCESS runs on, and orch spans both sides of one machine — a
 * WSL daemon routinely reports for a Windows-side session — so on Linux
 * `path.isAbsolute("C:\\Users\\...")` is false and a host-local check drops
 * exactly the paths this exists to keep. `startsWith("/")` is the same mistake
 * spelled shorter: TASKS/10-review-findings.md 1.12 is the win32 agent that got
 * no session tail, model or cost fallback because of it.
 *
 * One decision, imported: it is made where a harness context is read (the
 * presence writer) and where a pane reports to herdr, and those two must never
 * disagree about whether a given string is a path.
 */
export function sessionFilePath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return posix.isAbsolute(value) || win32.isAbsolute(value) ? value : undefined;
}

export function ensurePrivateDir(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if ((statSync(path).mode & 0o777) !== 0o700) chmodSync(path, 0o700);
}
