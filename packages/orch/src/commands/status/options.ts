import { spaceName as resolveSpaceName, withinSpaceCeiling } from "../../policy/space.ts";
import type { CallerSelf } from "../self.ts";
import { parseCommand } from "../registry.ts";
import { usageError } from "../../cli/usage.ts";
import type { CommandAt } from "../../cli/usage.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
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

export function callerScope(self: CallerSelf): CallerScope {
  return { id: self.id, ceiling: self.kind === "operator" || self.id === null ? null : self.space, kind: self.kind };
}

export interface FleetScope {
  all: boolean;
  /** `--only`: the states a row must be in, or null for every state. */
  only?: ReadonlySet<string> | null;
  /** `--hide`: the states whose rows are dropped. */
  hide?: ReadonlySet<string>;
  agent?: string;
  space?: string;
  caller?: CallerScope;
}

/** Whether a row's state survives `--only` and `--hide`. */
function keepsState(row: StatusRow, only: ReadonlySet<string> | null | undefined, hide: ReadonlySet<string> | undefined): boolean {
  const state = displayStatusState(row);
  if (only != null && !only.has(state)) return false;
  return hide?.has(state) !== true;
}

export function scopeFleetRows(rows: readonly StatusRow[], opts: FleetScope): StatusRow[] {
  const caller: CallerScope = opts.caller ?? { id: null, ceiling: null, kind: "operator" };
  return rows.filter((row) => {
    if (opts.space !== undefined && row.spaceId !== opts.space) return false;
    if (opts.agent !== undefined && !statusRowMatches(row, opts.agent)) return false;
    if (!opts.all && !row.managed) return false;
    if (!withinSpaceCeiling(row.spaceId, caller.ceiling)) return false;
    if (caller.kind !== "operator" && !opts.all && (caller.id === null || row.lease?.holderId !== caller.id)) return false;
    if (!keepsState(row, opts.only, opts.hide)) return false;
    // The table is the fleet as it is NOW. An agent that has exited is history —
    // `orch result` and `orch tail` still read it — and keeping every dead one
    // that ever recorded a line buried ten working agents under thirty corpses.
    // Naming one agent in `--agent` is how you ask for it back.
    return opts.agent !== undefined || (row.alive && !row.exited);
  });
}

/** `--agent=<target>`: the row's minted id, presence key, name, or current handle. */
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

/** `--hide=a,b`: the trimmed names in the list, lower-cased; null when the flag is absent.
 *  A list that names nothing selects nothing, so it is a typo and refused. */
export function readNameList(invocation: CommandAt, flag: string, list: string | undefined): readonly string[] | null {
  if (list === undefined) return null;
  const names = list.split(",").map((name) => name.trim().toLowerCase()).filter((name) => name.length > 0);
  if (names.length === 0) throw usageError(invocation, `${flag} names nothing`);
  return names;
}

/** Every table column by its lower-cased header, with the JSON row keys that carry the same fact. */
const STATUS_COLUMN_KEYS: Readonly<Record<string, readonly (keyof StatusRow)[]>> = {
  host: ["host"],
  id: ["key", "agentId"],
  env: ["paneId"],
  name: ["name"],
  owner: ["lease", "leaseKnown"],
  branch: ["branch"],
  tab: ["tab"],
  agent: ["agent"],
  harness: ["agent"],
  cwd: ["cwd"],
  worktree: ["worktree"],
  model: ["model"],
  state: ["state", "stateFallback", "exited"],
  cost: ["cost"],
  ctx: ["ctxPercent"],
  task: ["task"],
  last: ["lastText"],
};

export interface StatusHide {
  columns: ReadonlySet<string>;
  states: ReadonlySet<string>;
}

export const NO_STATUS_HIDE: StatusHide = { columns: new Set(), states: new Set() };

/** `--hide=owner,env,done`: a column name drops that column; any other name drops rows in that state. */
function statusHide(names: readonly string[] | null): StatusHide {
  if (names === null) return NO_STATUS_HIDE;
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

/** `--agent=<target>`: one agent to show, whatever its state. */
function readAgentTarget(invocation: CommandAt, given: string | undefined): string | undefined {
  const target = given?.trim();
  if (target === undefined) return undefined;
  if (target.length === 0) throw usageError(invocation, "--agent needs a target, e.g. --agent=ctx-edges");
  return target;
}

export interface StatusOptions {
  json: boolean;
  human: boolean;
  /** `--all`: the other orchs' agents in the caller's space, and panes orch did not spawn. */
  all: boolean;
  /** The states `--only` keeps, or null for every state. */
  only: ReadonlySet<string> | null;
  /** The columns and states `--hide` removes; both empty by default. */
  hide: StatusHide;
  /** The one agent named with `--agent`; undefined means the fleet. */
  agent?: string;
  local: boolean;
  offline: boolean;
  live: boolean;
  capacity: boolean;
  space?: string;
}

export function parseStatusOptions(args: readonly string[]): StatusOptions {
  const invocation = parseCommand("status", args);
  const { flags, positional } = invocation;
  if (positional.length) throw usageError(invocation);
  const agent = readAgentTarget(invocation, flags.value("--agent"));
  const only = readNameList(invocation, "--only", flags.value("--only"));
  const space = flags.value("--space");
  return {
    json: flags.has("--json"),
    human: flags.has("--human"),
    all: flags.has("--all"),
    only: only === null ? null : new Set(only),
    hide: statusHide(readNameList(invocation, "--hide", flags.value("--hide"))),
    ...(agent === undefined ? {} : { agent }),
    local: flags.has("--local"),
    offline: flags.has("--offline"),
    live: flags.has("--live"),
    capacity: flags.has("--capacity"),
    ...(space === undefined ? {} : { space }),
  };
}
