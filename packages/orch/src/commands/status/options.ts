import { spaceName as resolveSpaceName, withinSpaceCeiling } from "../../policy/space.ts";
import { selfId, spaceOfAgent } from "../../identity/self.ts";
import { callerKind } from "../../policy/caller.ts";
import { die, splitOptionFlags } from "../target.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
import type { OrchDir } from "../../types/core.ts";
import type { CallerKind } from "../../types/policy.ts";

export const isTTY = process.stdout.isTTY;

export function formatSpace(id: string | null | undefined, name: string | null | undefined): string {
  if (!id) return "-";
  return name && name !== id ? `${name} (${id})` : name ?? id;
}

export function displaySpace(id: string | null | undefined, resolver: OrchSettings["spaces"]): string {
  return formatSpace(id, resolveSpaceName(id, resolver));
}

export interface CallerScope {
  /** The caller's agent id, or null for an operator without an agent row. */
  id: string | null;
  /** The space a session or agent caller may never see past. */
  ceiling: string | null;
  kind: CallerKind;
}

export function callerScope(orchDir: OrchDir): CallerScope {
  const kind = callerKind(orchDir);
  const id = selfId(orchDir) ?? null;
  return { id, ceiling: kind === "operator" || id === null ? null : spaceOfAgent(orchDir, id), kind };
}

export function scopeFleetRows(
  rows: readonly StatusRow[],
  opts: { spaceWide: boolean; allPanes: boolean; states?: ReadonlySet<string>; agent?: string; space?: string; caller?: CallerScope },
): StatusRow[] {
  const caller: CallerScope = opts.caller ?? { id: null, ceiling: null, kind: "operator" };
  return rows.filter((row) => {
    if (opts.space !== undefined && row.spaceId !== opts.space) return false;
    if (opts.agent !== undefined && !statusRowMatches(row, opts.agent)) return false;
    if (!opts.allPanes && !row.managed) return false;
    if (!withinSpaceCeiling(row.spaceId, caller.ceiling)) return false;
    if (caller.kind !== "operator" && !opts.spaceWide && (caller.id === null || row.ownerId !== caller.id)) return false;
    if (opts.states?.has(displayStatusState(row))) return false;
    // The table is the fleet as it is NOW. An agent that has exited is history —
    // `orch result` and `orch tail` still read it — and keeping every dead one
    // that ever recorded a line buried ten working agents under thirty corpses.
    // Naming one agent in `--agent` is how you ask for it back.
    return opts.agent !== undefined || (row.alive && !row.exited);
  });
}

/** `--agent=<name|id>`: the row's minted id, presence key, name, or current handle. */
export function statusRowMatches(row: StatusRow, target: string): boolean {
  return row.agentId === target || row.key === target || row.name === target || row.paneId === target;
}

export function formatNoRowsMessage(info: { agentsSeen: number; alive: number; backendAnswered: boolean }): string {
  const backend = info.backendAnswered ? "; backend answered: yes" : "";
  return `No agents found (agent records seen: ${info.agentsSeen}; alive: ${info.alive}${backend}).\n`;
}

export function displayStatusState(row: Pick<StatusRow, "state" | "alive" | "exited">): string {
  return row.exited || !row.alive ? "exited" : row.state;
}

/** `--flag=a,b`: the trimmed names after the flag, or null when the caller named none. */
function parseNameList(args: readonly string[], flag: string): Set<string> | null {
  const argument = args.find((candidate) => candidate.startsWith(flag));
  if (argument === undefined) return null;
  const names = argument.slice(flag.length).split(",").map((name) => name.trim()).filter((name) => name.length > 0);
  return names.length === 0 ? null : new Set(names);
}

/** Every table column by its lower-cased header, with the JSON row keys that carry the same fact. */
const STATUS_COLUMN_KEYS: Readonly<Record<string, readonly (keyof StatusRow)[]>> = {
  host: ["host"],
  id: ["key", "agentId"],
  env: ["paneId"],
  name: ["name"],
  owner: ["owner"],
  branch: ["branch"],
  tab: ["tab"],
  agent: ["agent"],
  harness: ["agent"],
  cwd: ["cwd"],
  worktree: ["worktree"],
  model: ["model", "modelShort"],
  state: ["state", "stateFallback", "exited"],
  cost: ["cost"],
  ctx: ["ctxPercent"],
  task: ["task"],
  last: ["lastText"],
};

export interface StatusFilter {
  columns: ReadonlySet<string>;
  states: ReadonlySet<string>;
}

export const NO_STATUS_FILTER: StatusFilter = { columns: new Set(), states: new Set() };

/** `--filter=owner,env,done`: a column name drops that column; any other name drops rows in that state. */
function parseStatusFilter(args: readonly string[]): StatusFilter {
  const names = [...(parseNameList(args, "--filter=") ?? [])].map((name) => name.toLowerCase());
  return {
    columns: new Set(names.filter((name) => name in STATUS_COLUMN_KEYS)),
    states: new Set(names.filter((name) => !(name in STATUS_COLUMN_KEYS))),
  };
}

export function filterRowKeys(row: StatusRow, columns: ReadonlySet<string>): Partial<StatusRow> {
  const visible: Partial<StatusRow> = { ...row };
  for (const column of columns) {
    for (const key of STATUS_COLUMN_KEYS[column] ?? []) delete visible[key];
  }
  return visible;
}

/** `--flag value` or `--flag=value`: the value, or undefined when the caller gave neither. */
function parseValueFlag(args: readonly string[], flag: string): string | undefined {
  for (let index = 0; index < args.length; index++) {
    const argument = args[index] ?? "";
    if (argument === flag) return args[index + 1];
    if (argument.startsWith(`${flag}=`)) return argument.slice(flag.length + 1);
  }
  return undefined;
}

function parseSpace(args: readonly string[]): string | undefined {
  return parseValueFlag(args, "--space");
}

/** `--agent=<name|id>`: one agent to show, whatever its state. */
function parseAgentTarget(args: readonly string[]): string | undefined {
  const target = parseValueFlag(args, "--agent")?.trim();
  if (target === undefined) return undefined;
  if (target.length === 0) die("--agent needs a name or id, e.g. --agent=ctx-edges");
  return target;
}

export interface StatusOptions {
  json: boolean;
  human: boolean;
  spaceWide: boolean;
  allPanes: boolean;
  /** The columns and states `--filter` removes; both empty by default. */
  filter: StatusFilter;
  /** The one agent named with `--agent`, by name or id; undefined means the fleet. */
  agent?: string;
  local: boolean;
  offline: boolean;
  live: boolean;
  capacity: boolean;
  space?: string;
}

export function parseStatusOptions(args: readonly string[]): StatusOptions {
  const { enabled } = splitOptionFlags([...args], ["--json", "--human", "--space-wide", "--local", "--all-panes", "--offline", "--live", "--capacity"]);
  return {
    json: enabled.has("--json"),
    human: enabled.has("--human"),
    spaceWide: enabled.has("--space-wide"),
    allPanes: enabled.has("--all-panes"),
    filter: parseStatusFilter(args),
    agent: parseAgentTarget(args),
    local: enabled.has("--local"),
    offline: enabled.has("--offline"),
    live: enabled.has("--live"),
    capacity: enabled.has("--capacity"),
    space: parseSpace(args),
  };
}
