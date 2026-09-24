import { type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { z } from "zod";
import { isRecord } from "../../util.ts";
import { extractVersion } from "../versions.ts";
import { buildCommandFailure, findFreshCacheEntry, parseCliJson } from "../shared-cli.ts";
import { DEFAULT_TOOL_RETRY, runTool, toolErrorDetail, toolOutputText } from "../tool-exec.ts";
import type { HerdrPane, HerdrTab } from "../../types/plexer.ts";
import type { RetryPolicy } from "../../types/core.ts";

interface HerdrAgent {
  pane_id?: string;
  name?: string;
}

function parseHerdrOutput(output: string): unknown {
  const value = JSON.parse(output) as unknown;
  return isRecord(value) && value.result !== undefined ? value.result : value;
}

export type HerdrExecutor = (
  command: string,
  args: string[],
  options?: ExecFileSyncOptionsWithStringEncoding,
  policy?: RetryPolicy,
) => string;

const DEFAULT_HERDR_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
};

/** herdr's own codes for "that handle no longer exists". They stay in this
 * adapter; what crosses the boundary is orch's AgentGoneError. */
export const GONE_HANDLE_CODES = new Set(["pane_not_found", "agent_not_found"]);
/** The default runner goes through orch's shared tool seam, so every herdr
 *  command - not just `agent start` - rides the same backoff. A test that
 *  injects its own executor replaces this wholesale and retries nothing. */
const defaultHerdrExecutor: HerdrExecutor = (command, args, options, policy) =>
  runTool(command, args, policy ?? DEFAULT_TOOL_RETRY, options ?? DEFAULT_HERDR_OPTIONS);

function isHerdrPane(value: unknown): value is HerdrPane {
  return isRecord(value) && typeof value.pane_id === "string";
}

function isHerdrTab(value: unknown): value is HerdrTab {
  return isRecord(value) && typeof value.tab_id === "string";
}

function isHerdrAgent(value: unknown): value is HerdrAgent {
  return isRecord(value)
    && (value.pane_id === undefined || typeof value.pane_id === "string")
    && (value.name === undefined || typeof value.name === "string");
}

/** Each herdr exec costs whole seconds under WSL load; one CLI action must
 *  never pay twice for the same listing. Long-lived processes (orchd) stay
 *  fresh because entries expire after a short TTL. */
const LIST_CACHE_TTL_MS = 1500;
/** How long a herdr mutation may take before orch stops waiting. Enough for a
 *  command that only edits herdr's own state, never for one that starts a process. */
const MUTATION_TIMEOUT_MS = 5000;
/** `agent start` blocks while the harness boots: herdr enforces a 3s settle and
 *  defaults to a 30s ceiling. orch hands herdr this budget and outwaits it, so the
 *  two sides can never disagree about who gave up first. */
export const AGENT_START_TIMEOUT_MS = 30_000;
const AGENT_START_EXEC_TIMEOUT_MS = AGENT_START_TIMEOUT_MS + MUTATION_TIMEOUT_MS;

/** A failed herdr command, carrying the code herdr answered with. The code is
 *  herdr's wire format and stays inside this adapter; callers read `code` rather
 *  than matching on the message text. */
export class HerdrCommandError extends Error {
  constructor(public readonly code: string | null, message: string) {
    super(message);
    this.name = "HerdrCommandError";
  }
}

/** herdr reports why a start failed as a JSON error code on stderr. */
function herdrErrorCode(error: unknown): string | null {
  if (!isRecord(error) || error.stderr === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(toolOutputText(error.stderr).trim());
    return isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.code === "string"
      ? parsed.error.code
      : null;
  } catch {
    return null;
  }
}

/** Input must surface a gone handle before retrying, while ordinary failures
 * still receive herdr's standard retry budget. */
export const HERDR_INPUT_RETRY: RetryPolicy = {
  ...DEFAULT_TOOL_RETRY,
  retryable: (error) => {
    const code = herdrErrorCode(error);
    return code === null || !GONE_HANDLE_CODES.has(code);
  },
};

/** A pane whose shell has not finished coming up answers `agent_pane_busy`.
 *  herdr retries that itself, but only for 2s (PANE_SHELL_READINESS_RETRY_TIMEOUT
 *  in its cli/agent.rs) - a loaded or slow machine takes longer than that to reach
 *  a prompt, and the spawn then fails for a reason that was never an error. */
const START_RETRY: RetryPolicy = {
  attempts: 5,
  delayMs: 500,
  backoff: 2,
  retryable: (error) => herdrErrorCode(error) === "agent_pane_busy",
};

export interface HerdrServerStatus {
  readonly running: boolean;
  readonly version: string | null;
  readonly socket: string | null;
  readonly endpointCompatible: boolean | null;
}

export interface HerdrCli {
  json<S extends z.ZodType>(args: string[], schema: S): z.output<S>;
  ack(args: string[], timeoutMs?: number, policy?: RetryPolicy): void;
  answer(args: string[], timeoutMs?: number): string;
  startAgent(args: string[], agentArgs?: readonly string[]): void;
  version(): string | null;
  serverStatus(): HerdrServerStatus;
  reachable(): boolean;
  panes(): HerdrPane[];
  names(): Map<string, string>;
  tabs(): Map<string, HerdrTab>;
  exec(args: string[], options?: ExecFileSyncOptionsWithStringEncoding): string;
}

const ASK_ONCE: RetryPolicy = { attempts: 1, delayMs: 0, backoff: 1 };

export function createHerdrCli(executor: HerdrExecutor = defaultHerdrExecutor): HerdrCli {
  const listCache = new Map<string, { at: number; value: unknown }>();
  const herdr = (args: string[], policy?: RetryPolicy): unknown => {
    const cached = findFreshCacheEntry(listCache, args, LIST_CACHE_TTL_MS);
    if (cached.kind === "hit") return cached.value;
    try {
      const output = executor("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, policy);
      const value = parseHerdrOutput(output);
      listCache.set(cached.key, { at: Date.now(), value });
      return value;
    } catch (error: unknown) {
      throw new Error(buildCommandFailure("herdr", args, toolErrorDetail(error)));
    }
  };
  const herdrOutput = (args: string[], timeoutMs = MUTATION_TIMEOUT_MS, policy?: RetryPolicy): string => {
    listCache.clear();
    try {
      return executor("herdr", args, { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, policy);
    } catch (error: unknown) {
      throw new HerdrCommandError(herdrErrorCode(error), buildCommandFailure("herdr", args, toolErrorDetail(error)));
    }
  };
  const cli: HerdrCli = {
    json<S extends z.ZodType>(args: string[], schema: S): z.output<S> {
      const output = herdrOutput(args);
      return parseCliJson(parseHerdrOutput(output), schema, `herdr ${args.join(" ")}`, (message) => new HerdrCommandError(null, message));
    },
    ack: (args, timeoutMs, policy) => { herdrOutput(args, timeoutMs, policy); },
    answer: (args, timeoutMs) => herdrOutput(args, timeoutMs),
    startAgent: (args, agentArgs = []) => {
      const fullArgs = [...args, "--timeout", String(AGENT_START_TIMEOUT_MS), ...(agentArgs.length > 0 ? ["--", ...agentArgs] : [])];
      listCache.clear();
      try { executor("herdr", fullArgs, { timeout: AGENT_START_EXEC_TIMEOUT_MS, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, START_RETRY); }
      catch (error: unknown) {
        if (herdrErrorCode(error) === "agent_not_ready") return;
        throw new Error(buildCommandFailure("herdr", fullArgs, toolErrorDetail(error)));
      }
    },
    version: () => {
      try { return extractVersion(cli.exec(["--version"])); } catch { return null; }
    },
    serverStatus: () => {
      const result = herdr(["status", "server", "--json"], ASK_ONCE);
      if (!isRecord(result)) throw new Error("herdr status server returned invalid response");
      return { running: result.running === true, version: typeof result.version === "string" ? result.version : null, socket: typeof result.socket === "string" ? result.socket : null, endpointCompatible: typeof result.endpoint_compatible === "boolean" ? result.endpoint_compatible : null };
    },
    reachable: () => { cli.panes(); return true; },
    panes: () => {
      const result = herdr(["pane", "list"]);
      if (!isRecord(result) || !Array.isArray(result.panes)) throw new Error("herdr pane list returned invalid response");
      return result.panes.filter(isHerdrPane);
    },
    names: () => {
      const result = herdr(["agent", "list"]);
      if (!isRecord(result) || !Array.isArray(result.agents)) throw new Error("herdr agent list returned invalid response");
      const names = new Map<string, string>();
      for (const agent of result.agents.filter(isHerdrAgent)) if (agent.pane_id && agent.name) names.set(agent.pane_id, agent.name);
      return names;
    },
    tabs: () => {
      const result = herdr(["tab", "list"]);
      if (!isRecord(result) || !Array.isArray(result.tabs)) throw new Error("herdr tab list returned invalid response");
      const tabs = new Map<string, HerdrTab>();
      for (const tab of result.tabs.filter(isHerdrTab)) tabs.set(tab.tab_id, tab);
      return tabs;
    },
    exec: (args, options = { encoding: "utf8" }) => {
      try { return executor("herdr", args, options); }
      catch (error: unknown) { throw new Error(buildCommandFailure("herdr", args, toolErrorDetail(error))); }
    },
  };
  return cli;
}
