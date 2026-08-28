import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { isRecord } from "../../util.ts";
import { extractVersion } from "../versions.ts";

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

type HerdrExecutor = (command: string, args: string[], options?: ExecFileSyncOptionsWithStringEncoding) => string;
let executeHerdr: HerdrExecutor = (command, args, options) => execFileSync(command, args, options) as string;

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

function herdrOutput(args: string[]): string {
  // Assume a mutation: listings must not serve pre-mutation state.
  listCache.clear();
  try {
    return executeHerdr("herdr", args, { timeout: 5000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
export function herdrAck(args: string[]): void {
  herdrOutput(args);
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
