import { type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { isRecord } from "../../util.ts";
import { extractVersion } from "../versions.ts";
import { type RetryPolicy } from "../../retry.ts";
import { DEFAULT_TOOL_RETRY, runTool } from "../tool-exec.ts";

export interface HerdrPane {
  pane_id: string;
  tab_id?: string;
  workspace_id?: string;
  agent_status?: string;
  name?: string;
  focused?: boolean;
  agent?: string;
  agent_session?: { kind: string; value: string } | null;
  rect?: { width: number; height: number; x: number; y: number };
}

export interface HerdrTab {
  tab_id: string;
  label?: string;
  workspace_id?: string;
  focused?: boolean;
  number?: number;
  pane_count?: number;
  agent_status?: string;
}

export interface HerdrWorkspace {
  workspace_id: string;
  label?: string;
  focused?: boolean;
  number?: number;
  tab_count?: number;
  pane_count?: number;
  agent_status?: string;
}

interface HerdrAgent {
  pane_id?: string;
  name?: string;
}

function parseHerdrOutput(output: string): unknown {
  const value = JSON.parse(output) as unknown;
  return isRecord(value) && value.result !== undefined ? value.result : value;
}

function outputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString("utf8");
  if (value === undefined) return "";
  const json = JSON.stringify(value);
  return json ?? "";
}

function errorDetail(error: unknown): string {
  if (isRecord(error)) {
    const status = typeof error.status === "number" ? `exit status ${error.status}` : undefined;
    const stderr = error.stderr === undefined ? "" : outputText(error.stderr).trim();
    const stdout = error.stdout === undefined ? "" : outputText(error.stdout).trim();
    const message = error.message === undefined ? outputText(error) : outputText(error.message);
    return [status, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`, message].filter(Boolean).join("; ");
  }
  return error instanceof Error ? error.message : outputText(error);
}

type HerdrExecutor = (
  command: string,
  args: string[],
  options?: ExecFileSyncOptionsWithStringEncoding,
  policy?: RetryPolicy,
) => string;

const DEFAULT_HERDR_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
};
/** The default runner goes through orch's shared tool seam, so every herdr
 *  command - not just `agent start` - rides the same backoff. A test that
 *  injects its own executor replaces this wholesale and retries nothing. */
let executeHerdr: HerdrExecutor = (command, args, options, policy) =>
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
const listCache = new Map<string, { at: number; value: unknown }>();

/** Inject the process runner for a scoped seam test; the returned function restores it. */
export function setHerdrExecutor(executor: HerdrExecutor): () => void {
  const previous = executeHerdr;
  listCache.clear();
  executeHerdr = executor;
  return () => {
    executeHerdr = previous;
    listCache.clear();
  };
}

function herdr(args: string[]): unknown {
  const cacheKey = args.join(" ");
  const cached = listCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LIST_CACHE_TTL_MS) return cached.value;
  try {
    const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const value = parseHerdrOutput(output);
    listCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (error: unknown) {
    throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
  }
}

function herdrOutput(args: string[], timeoutMs = MUTATION_TIMEOUT_MS): string {
  // Assume a mutation: listings must not serve pre-mutation state.
  listCache.clear();
  try {
    return executeHerdr("herdr", args, { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error: unknown) {
    throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
  }
}

export function herdrJSON<T = unknown>(args: string[]): T {
  const output = herdrOutput(args);
  try {
    return parseHerdrOutput(output) as T;
  } catch {
    throw new Error(`herdr ${args.join(" ")} returned non-JSON: ${output.slice(0, 200)}`);
  }
}

/** A herdr command whose acknowledgement is its exit code: `pane run` answers
 *  with an empty body, so demanding JSON from it fails an already-run command. */
export function herdrAck(args: string[], timeoutMs?: number): void {
  herdrOutput(args, timeoutMs);
}

/** Run a herdr command and hand back what it ANSWERED. Exit code alone is not the
 *  answer: herdr reports a refused notification as `{"shown":false}` and still
 *  exits 0, so a caller that reads only the exit code reports a drop as a delivery. */
export function herdrAnswer(args: string[], timeoutMs?: number): string {
  return herdrOutput(args, timeoutMs);
}

/** herdr reports why a start failed as a JSON error code on stderr. */
function herdrErrorCode(error: unknown): string | null {
  if (!isRecord(error) || error.stderr === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(outputText(error.stderr).trim());
    return isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.code === "string"
      ? parsed.error.code
      : null;
  } catch {
    return null;
  }
}

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

/** Start a harness in an existing pane. Blocking on both sides by nature: herdr
 *  settles the process before answering, and orch waits out the budget it set. */
export function herdrStartAgent(args: string[], agentArgs: readonly string[] = []): void {
  // herdr's grammar is `agent start <name> [OPTIONS] [-- [AGENT_ARG]...]`; the
  // separator must come after every option or herdr reads the flags as agent args.
  const fullArgs = [...args, "--timeout", String(AGENT_START_TIMEOUT_MS),
    ...(agentArgs.length > 0 ? ["--", ...agentArgs] : [])];
  listCache.clear();
  try {
    executeHerdr("herdr", fullArgs, { timeout: AGENT_START_EXEC_TIMEOUT_MS, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, START_RETRY);
  } catch (error: unknown) {
    // A harness that started but has not painted its first frame is not a failure.
    if (herdrErrorCode(error) === "agent_not_ready") return;
    throw new Error(`herdr ${fullArgs.join(" ")} failed: ${errorDetail(error)}`);
  }
}

/** Read herdr's installed semantic version from its CLI. A missing binary or
 * an unexpected response is unknown rather than a fabricated version. */
export function version(): string | null {
  try {
    return extractVersion(herdrExec(["--version"]));
  } catch {
    return null;
  }
}

/** True only when the herdr control socket responds. */
export function herdrReachable(): boolean {
  herdrPanes();
  return true;
}

export function herdrPanes(): HerdrPane[] {
  const result = herdr(["pane", "list"]);
  if (!isRecord(result) || !Array.isArray(result.panes)) throw new Error("herdr pane list returned invalid response");
  return result.panes.filter(isHerdrPane);
}

export function herdrNames(): Map<string, string> {
  const result = herdr(["agent", "list"]);
  if (!isRecord(result) || !Array.isArray(result.agents)) throw new Error("herdr agent list returned invalid response");
  const names = new Map<string, string>();
  for (const agent of result.agents.filter(isHerdrAgent)) {
    if (agent.pane_id && agent.name) names.set(agent.pane_id, agent.name);
  }
  return names;
}

export function herdrTabs(): Map<string, HerdrTab> {
  const result = herdr(["tab", "list"]);
  if (!isRecord(result) || !Array.isArray(result.tabs)) throw new Error("herdr tab list returned invalid response");
  const tabs = new Map<string, HerdrTab>();
  for (const tab of result.tabs.filter(isHerdrTab)) tabs.set(tab.tab_id, tab);
  return tabs;
}

export function herdrExec(args: string[], options: ExecFileSyncOptionsWithStringEncoding = { encoding: "utf8" }): string {
  try {
    return executeHerdr("herdr", args, options);
  } catch (error: unknown) {
    throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
  }
}
