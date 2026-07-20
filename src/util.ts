import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path of the package root — the directory holding package.json.
 * Walks up from this module's own location so it resolves correctly whether orch
 * runs from live source (`src/util.ts` → repo root) or the bundled entrypoint
 * (`dist/bin/orch.js` → repo root in dev, `node_modules/orch` when published).
 * A hardcoded "two levels up from the entry file" breaks the moment the entry
 * moves from `bin/` to `dist/bin/`.
 */
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
export function binaryPath(bin: string): string | null {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const exts = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
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

/** A parsed JSON object. The one spelling of this shape repo-wide. */
export type JsonRecord = Record<string, unknown>;

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
export function truncate(value: string, max: number): string {
  const text = String(value ?? "");
  return text.length <= max ? text : text.slice(0, Math.max(0, max - 1)) + "…";
}

/** {@link truncate} over an optional field: undefined in, undefined out. */
export function truncateOptional(value: unknown, max: number): string | undefined {
  const text = textValue(value);
  return text === undefined ? undefined : truncate(text, max);
}

/** Parse a JSON file, or undefined when it is absent or unparseable. */
export function readJsonFile(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return undefined;
  }
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
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
