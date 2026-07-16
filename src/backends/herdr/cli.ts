import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHerdrOutput(output: string): unknown {
  const value = JSON.parse(output) as unknown;
  return isRecord(value) && value.result !== undefined ? value.result : value;
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error)) {
    const detail = error.stderr ?? error.stdout ?? error.message;
    if (detail !== undefined) return JSON.stringify(detail) ?? "";
  }
  return String(error);
}

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

function herdr(args: string[]): unknown {
  const cacheKey = args.join(" ");
  const cached = listCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LIST_CACHE_TTL_MS) return cached.value;
  let value: unknown;
  try {
    const output: string = execFileSync("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    value = parseHerdrOutput(output);
  } catch {
    value = null;
  }
  listCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

export function herdrJSON<T = unknown>(args: string[]): T {
  // Assume a mutation: listings must not serve pre-mutation state.
  listCache.clear();
  let output: string;
  try {
    output = execFileSync("herdr", args, { timeout: 5000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error: unknown) {
    throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
  }
  try {
    return parseHerdrOutput(output) as T;
  } catch {
    throw new Error(`herdr ${args.join(" ")} returned non-JSON: ${output.slice(0, 200)}`);
  }
}

/** True only when the herdr control socket responds. */
export function herdrReachable(): boolean {
  return herdr(["pane", "list"]) !== null;
}

export function herdrPanes(): HerdrPane[] {
  const result = herdr(["pane", "list"]);
  return isRecord(result) && Array.isArray(result.panes) ? result.panes.filter(isHerdrPane) : [];
}

export function herdrNames(): Map<string, string> {
  const result = herdr(["agent", "list"]);
  const names = new Map<string, string>();
  if (isRecord(result) && Array.isArray(result.agents)) {
    for (const agent of result.agents.filter(isHerdrAgent)) {
      if (agent.pane_id && agent.name) names.set(agent.pane_id, agent.name);
    }
  }
  return names;
}

export function herdrTabs(): Map<string, HerdrTab> {
  const result = herdr(["tab", "list"]);
  const tabs = new Map<string, HerdrTab>();
  if (isRecord(result) && Array.isArray(result.tabs)) {
    for (const tab of result.tabs.filter(isHerdrTab)) tabs.set(tab.tab_id, tab);
  }
  return tabs;
}

export function herdrBestEffort(args: string[]): boolean {
  // Assume a mutation: listings must not serve pre-mutation state.
  listCache.clear();
  try {
    execFileSync("herdr", args, { timeout: 8000, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch (error: unknown) {
    process.stderr.write(`warning: herdr ${args.join(" ")} failed: ${errorDetail(error)}\n`);
    return false;
  }
}

export function herdrExec(args: string[], options: ExecFileSyncOptionsWithStringEncoding = { encoding: "utf8" }): string {
  return execFileSync("herdr", args, options);
}
