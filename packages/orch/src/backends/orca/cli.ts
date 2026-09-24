import { type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { z } from "zod";
import { hostOs } from "../../host.ts";
import { isRecord } from "../../util.ts";
import { extractVersion } from "../versions.ts";
import { buildCommandFailure, findFreshCacheEntry, parseCliJson } from "../shared-cli.ts";
import { DEFAULT_TOOL_RETRY, runTool, toolErrorDetail, toolOutputText } from "../tool-exec.ts";
import type { OrcaExecutor, OrcaTerminal } from "../../types/plexer.ts";
import type { RetryPolicy } from "../../types/core.ts";

const DEFAULT_ORCA_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
};

/** Orca's terminal-handle errors mean the caller must refresh its inventory. */
export const GONE_HANDLE_CODES: ReadonlySet<string> = new Set([
  "terminal_handle_stale",
  "terminal_gone",
  "terminal_not_found",
]);

/** The default runner uses orch's shared retry seam for every Orca command. */
const defaultOrcaExecutor: OrcaExecutor = (command, args, options, policy) =>
  runTool(command, args, policy ?? DEFAULT_TOOL_RETRY, options ?? DEFAULT_ORCA_OPTIONS);

function envelopeErrorCode(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.code !== "string") return null;
  return value.error.code;
}

function orcaErrorCode(error: unknown): string | null {
  if (error instanceof OrcaCommandError) return error.code;
  if (!isRecord(error)) return null;
  for (const field of ["stdout", "stderr"]) {
    const raw = error[field];
    if (raw === undefined) continue;
    try {
      const parsed: unknown = JSON.parse(toolOutputText(raw).trim());
      const code = envelopeErrorCode(parsed);
      if (code !== null) return code;
    } catch {}
  }
  return null;
}

/** A failed Orca command, retaining the stable wire-level error code. */
export class OrcaCommandError extends Error {
  constructor(public readonly code: string | null, message: string) {
    super(message);
    this.name = "OrcaCommandError";
  }
}

/** Input must surface a gone handle before retrying, while ordinary failures retry. */
export const ORCA_INPUT_RETRY: RetryPolicy = {
  ...DEFAULT_TOOL_RETRY,
  retryable: (error) => {
    const code = orcaErrorCode(error);
    return code === null || !GONE_HANDLE_CODES.has(code);
  },
};

/** Each Orca exec costs whole seconds under WSL load; one action must never pay twice for a listing.
 * Long-lived processes (orchd) stay fresh because entries expire after a short TTL. */
const LIST_CACHE_TTL_MS = 1500;
/** How long an Orca mutation may take before orch stops waiting. Enough for a command that only
 * edits Orca's own state, never for one that starts a process. */
const MUTATION_TIMEOUT_MS = 5000;

function isOrcaTerminal(value: unknown): value is OrcaTerminal {
  return isRecord(value)
    && typeof value.handle === "string"
    && (typeof value.ptyId === "string" || value.ptyId === null)
    && typeof value.worktreeId === "string"
    && typeof value.worktreePath === "string"
    && typeof value.branch === "string"
    && typeof value.tabId === "string"
    && typeof value.leafId === "string"
    && (typeof value.title === "string" || value.title === null)
    && typeof value.connected === "boolean"
    && typeof value.writable === "boolean"
    && (typeof value.lastOutputAt === "number" || value.lastOutputAt === null);
}

function unwrapEnvelope(output: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new OrcaCommandError(null, "orca returned an invalid JSON response");
  }
  if (!isRecord(parsed) || typeof parsed.ok !== "boolean" || !("id" in parsed)) {
    throw new OrcaCommandError(null, "orca returned a non-envelope response");
  }
  if (!parsed.ok) {
    const code = envelopeErrorCode(parsed);
    const message = isRecord(parsed.error) && typeof parsed.error.message === "string"
      ? parsed.error.message
      : "orca command failed";
    throw new OrcaCommandError(code, message);
  }
  if (!("result" in parsed)) throw new OrcaCommandError(null, "orca envelope has no result");
  return parsed.result;
}

export interface OrcaServerStatus {
  readonly running: boolean;
  readonly version: string | null;
}

export interface OrcaCli {
  json<S extends z.ZodType>(args: string[], schema: S): z.output<S>;
  ack(args: string[], timeoutMs?: number, policy?: RetryPolicy): void;
  version(): string | null;
  serverStatus(): OrcaServerStatus;
  reachable(): boolean;
  terminals(worktree?: string): OrcaTerminal[];
  exec(args: string[], options?: ExecFileSyncOptionsWithStringEncoding): string;
}

const ASK_ONCE: RetryPolicy = { attempts: 1, delayMs: 0, backoff: 1 };

function wrapOrcaFailure(error: unknown, args: readonly string[]): OrcaCommandError {
  if (error instanceof OrcaCommandError) return error;
  return new OrcaCommandError(orcaErrorCode(error), buildCommandFailure("orca", args, toolErrorDetail(error)));
}

function withJson(args: string[]): string[] {
  return [...args.filter((arg) => arg !== "--json"), "--json"];
}

export function orcaBinary(): string {
  return hostOs() === "linux" ? "orca-ide" : "orca";
}

export function createOrcaCli(executor: OrcaExecutor = defaultOrcaExecutor): OrcaCli {
  const listCache = new Map<string, { at: number; value: unknown }>();
  const read = (args: string[], policy?: RetryPolicy): unknown => {
    const cached = findFreshCacheEntry(listCache, args, LIST_CACHE_TTL_MS);
    if (cached.kind === "hit") return cached.value;
    try {
      const output = executor(orcaBinary(), withJson(args), { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, policy);
      const value = unwrapEnvelope(output);
      listCache.set(cached.key, { at: Date.now(), value });
      return value;
    } catch (error: unknown) {
      throw wrapOrcaFailure(error, args);
    }
  };
  const mutation = (args: string[], timeoutMs = MUTATION_TIMEOUT_MS, policy?: RetryPolicy): unknown => {
    listCache.clear();
    try {
      const output = executor(orcaBinary(), withJson(args), { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, policy);
      return unwrapEnvelope(output);
    } catch (error: unknown) {
      throw wrapOrcaFailure(error, args);
    }
  };
  const cli: OrcaCli = {
    json<S extends z.ZodType>(args: string[], schema: S): z.output<S> {
      return parseCliJson(read(args), schema, `orca ${args.join(" ")}`, (message) => new OrcaCommandError(null, message));
    },
    ack: (args, timeoutMs, policy) => { mutation(args, timeoutMs, policy); },
    version: () => {
      try { return extractVersion(cli.exec(["--version"])); } catch { return null; }
    },
    serverStatus: () => {
      try {
        const result = read(["status"], ASK_ONCE);
        if (!isRecord(result)) throw new OrcaCommandError(null, "orca status returned invalid response");
        return { running: true, version: typeof result.appVersion === "string" ? result.appVersion : null };
      } catch (error: unknown) {
        if (error instanceof OrcaCommandError && error.code === null) return { running: false, version: null };
        throw error;
      }
    },
    reachable: () => cli.serverStatus().running,
    terminals: (worktree) => {
      const args = worktree === undefined ? ["terminal", "list"] : ["terminal", "list", "--worktree", worktree];
      const result = read(args);
      if (!isRecord(result) || !Array.isArray(result.terminals)) {
        throw new OrcaCommandError(null, "orca terminal list returned invalid response");
      }
      return result.terminals.filter(isOrcaTerminal);
    },
    exec: (args, options = { encoding: "utf8" }) => {
      try { return executor(orcaBinary(), args, options); }
      catch (error: unknown) {
        throw wrapOrcaFailure(error, args);
      }
    },
  };
  return cli;
}
