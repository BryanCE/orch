import { renderTable } from "../../table.ts";
import { collapse, truncate } from "../../util.ts";
import { dim } from "../../tui/screen.ts";
import { DEAD_HOLDER_DRIVER, NO_ORCH_DRIVER } from "../../shared/drive-state.ts";
import { formatSpace, displayStatusState, NO_STATUS_HIDE, isTTY, callerNameLabel, ownsLiveWorker } from "./options.ts";
import { modelShort } from "../../policy/thinking.ts";
import { formatAge, formatHostOffline } from "../../format.ts";
import type { StatusRow } from "../../types/command.ts";
import type { FleetNames, FleetStatus } from "../../types/daemon.ts";
import { FORM_IDS } from "../../types/form.ts";

const DETACHED_ENVIRONMENT = "headless";
const FORM_CAP = Math.max(...FORM_IDS.map((form) => form.length));

/** A host's name is shown whole: two hosts whose names share a prefix must never read alike. */
const HOST_CAP = Number.POSITIVE_INFINITY;

/** Who drives the row, as the OWNER column says it: the holder's name, or why there is none. */
export function ownerLabel(row: StatusRow, names: FleetNames): string | null {
  if (row.lease === null) return NO_ORCH_DRIVER;
  if (!row.lease.holderAlive) return DEAD_HOLDER_DRIVER;
  return names.agents[row.lease.holderId] ?? row.lease.holderId;
}

function formatOwnerCell(row: StatusRow, names: FleetNames, callerId: string | null): string {
  if (row.key === callerId) return "-";
  const owner = ownerLabel(row, names);
  if (owner === null) return "-";
  return owner.startsWith(NO_ORCH_DRIVER) && isTTY ? dim(owner) : owner;
}

export interface TableFlags {
  showSpace: boolean;
  showOwner: boolean;
  showBranch: boolean;
  human?: boolean;
}

export interface StatusTableOptions {
  /** `--all`: the table may span spaces, so it shows SPACE when the rows do. */
  all: boolean;
  host: boolean;
  callerId?: string | null;
  human?: boolean;
  /** Columns `--hide` removed. */
  columns: ReadonlySet<string>;
}

function tableFlags(fleet: FleetStatus, all: boolean, human: boolean, callerId: string | null): TableFlags {
  const otherRows = fleet.rows.filter((row) => row.key !== callerId);
  return {
    showSpace: all && new Set(fleet.rows.map((row) => row.spaceId ?? "-")).size > 1,
    showOwner: new Set(otherRows.map((row) => ownerLabel(row, fleet.names) ?? "-")).size > 1,
    showBranch: fleet.rows.some((row) => row.branch),
    human,
  };
}

function tableOptionalCells(row: StatusRow, names: FleetNames, flags: TableFlags, callerId: string | null): string[] {
  const cells: string[] = [];
  if (flags.showOwner) cells.push(formatOwnerCell(row, names, callerId));
  if (flags.showBranch) cells.push(row.branch ?? "-");
  return cells;
}

function localIdCell(row: StatusRow): string {
  return (row.agentId ?? row.key) + (row.focused ? "*" : "");
}

/** Where the agent sits: its pane here, else the environment it runs in, wherever that is. */
function environmentCell(row: StatusRow): string {
  const handle = row.paneId;
  if (handle === null || handle.startsWith("{")) return row.backend ?? DETACHED_ENVIRONMENT;
  return handle;
}

/** What a row is, stated from the kind orch recorded for it. */
function whatItIs(row: StatusRow): string {
  switch (row.kind) {
    case "operator":
      return "operator terminal";
    case "session":
      return `${row.agent ?? "harness"} session`;
    case "agent":
      return "spawned agent";
    case null:
      return "pane orch did not spawn";
    default: {
      const exhaustive: never = row.kind;
      throw new Error(`unknown row kind ${String(exhaustive)}`);
    }
  }
}

/** Who made it: a root was started here; a spawned agent names its spawner, and the host that
 *  asked for it when another host's orchd did. */
function whoMadeIt(row: StatusRow, names: FleetNames, callerId: string | null): string {
  const asked = row.askedBy === null ? "" : `asked for by host ${row.askedBy}, `;
  if (row.kind !== "agent") return row.key === callerId ? "started here, this is you" : "started here";
  if (row.spawnedBy === null) return `${asked}no spawner recorded`;
  if (row.spawnedBy === callerId) return `${asked}spawned by you`;
  return `${asked}spawned by ${names.agents[row.spawnedBy] ?? row.spawnedBy}`;
}

/** The line under each row: what it is, who made it, where it runs (its host, whole, and its
 *  directory), and when orch made it; then, whole, that its host is offline or why it ended. */
function provenanceLine(row: StatusRow, names: FleetNames, callerId: string | null, columns: ReadonlySet<string>): string {
  // `--hide cwd` keeps the directory off this line too.
  const where = columns.has("cwd") ? row.host.name : `${row.host.name}:${row.cwd ?? "-"}`;
  const when = row.createdAt === null ? "creation unrecorded" : `created ${formatAge(row.createdAt)} ago`;
  // Whatever the LAST column cuts short of an offline host or an ending is said here whole.
  const note = row.hostOffline !== undefined || row.endReason !== null ? [lastText(row)] : [];
  return `  ${[whatItIs(row), whoMadeIt(row, names, callerId), where, when, ...note].join(" | ")}`;
}

function localNameCell(row: StatusRow, names: FleetNames, flags: TableFlags, callerId: string | null, ownsOthers: boolean): string {
  const baseName = row.name ?? "";
  const name = callerNameLabel(baseName, row, callerId, ownsOthers);
  return flags.showSpace ? `${formatSpace(row.spaceId, row.spaceId ? names.spaces[row.spaceId] : null)} / ${name}` : name;
}

function tableStateCell(row: StatusRow, includeFallback: boolean, callerId: string | null): string {
  const state = displayStatusState(row);
  if (row.key === callerId && row.stateFallback && state === "unknown") return "-";
  // A host that is offline cannot confirm the state it last reported.
  return state + (includeFallback && (row.stateFallback || row.hostOffline !== undefined) ? "?" : "");
}

function tableCostCell(row: StatusRow): string {
  return row.cost > 0 ? "$" + row.cost.toFixed(2) : "";
}

function tableContextCell(row: StatusRow): string {
  return row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "";
}

/** The LAST cell: what the agent last said, or, while its host's link is down, that the
 *  host is offline and when it was last seen. */
function tableLastCell(row: StatusRow): string {
  return truncate(lastText(row), 50);
}

/** What the row last says: that its host is offline, else why it ended, else what it last said. */
function lastText(row: StatusRow): string {
  if (row.hostOffline !== undefined) return formatHostOffline(row.host.name, row.hostOffline.lastSeen);
  if (row.endReason !== null) return `ended: ${collapse(row.endReason)}`;
  return collapse(row.lastText ?? "");
}

function humanTableCells(row: StatusRow, names: FleetNames, host: boolean, callerId: string | null, name: string): string[] {
  return [
    ...(host ? [row.host.name] : []), name,
    row.agent ?? "-", row.form ?? "-", truncate(row.cwd ?? "-", 30), truncate(row.worktree ?? "-", 24),
    truncate(row.branch ?? "-", 20), formatOwnerCell(row, names, callerId), tableStateCell(row, true, callerId),
  ];
}

function standardTableCells(row: StatusRow, names: FleetNames, flags: TableFlags, host: boolean, callerId: string | null, ownsOthers: boolean): string[] {
  const prefix = host
    ? [row.host.name, localIdCell(row), environmentCell(row), localNameCell(row, names, flags, callerId, ownsOthers)]
    : [localIdCell(row), environmentCell(row), localNameCell(row, names, flags, callerId, ownsOthers)];
  return [
    ...prefix, ...tableOptionalCells(row, names, flags, callerId), row.tab ?? "-", row.agent ?? "-", row.form ?? "-", 
    modelShort(row.model) || "-", tableStateCell(row, true, callerId), tableCostCell(row),
    tableContextCell(row), truncate(collapse(row.task ?? ""), 40), tableLastCell(row),
  ];
}

function tableRow(row: StatusRow, names: FleetNames, flags: TableFlags, host: boolean, callerId: string | null, ownsOthers: boolean): string[] {
  const baseName = row.name ?? "-";
  const name = callerNameLabel(baseName, row, callerId, ownsOthers);
  return flags.human
    ? humanTableCells(row, names, host, callerId, name)
    : standardTableCells(row, names, flags, host, callerId, ownsOthers);
}

function ownerBranchHeaders(flags: TableFlags): string[] {
  const columns: string[] = [];
  if (flags.showOwner) columns.push("OWNER");
  if (flags.showBranch) columns.push("BRANCH");
  return columns;
}

function sharedOwner(fleet: FleetStatus, callerId: string | null): string | null {
  const labels = fleet.rows.filter((row) => row.key !== callerId).map((row) => ownerLabel(row, fleet.names));
  const owners = new Set(labels.filter((owner): owner is string => owner !== null));
  return owners.size === 1 && labels.every((owner) => owner !== null) ? [...owners][0]! : null;
}

function ownerBranchCaps(flags: TableFlags): number[] {
  const caps: number[] = [];
  if (flags.showOwner) caps.push(32);
  if (flags.showBranch) caps.push(24);
  return caps;
}

function tableColumns(flags: TableFlags, host: boolean): { headers: string[]; caps: number[] } {
  if (flags.human) {
    return {
      headers: [...(host ? ["HOST"] : []), "NAME", "HARNESS", "FORM", "CWD", "WORKTREE", "BRANCH", "OWNER", "STATE"],
      caps: [...(host ? [HOST_CAP] : []), 32, 10, FORM_CAP, 30, 24, 20, 32, 12],
    };
  }
  return {
    headers: [...(host ? ["HOST"] : []), "ID", "ENV", "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "FORM", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [...(host ? [HOST_CAP] : []), 12, 10, 32, ...ownerBranchCaps(flags), 8, 6, FORM_CAP, 20, 10, 6, 4, 24, 34],
  };
}

function visibleColumns<T>(cells: readonly T[], headers: readonly string[], columns: ReadonlySet<string>): T[] {
  return cells.filter((_, index) => !columns.has((headers[index] ?? "").toLowerCase()));
}

function appendRenderedRows(out: string[], rendered: readonly string[], rows: readonly StatusRow[], provenance: (row: StatusRow) => string): void {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row === undefined) continue;
    const line = rendered[index + 2] ?? "";
    out.push(row.exited ? (isTTY ? dim(line) : line) : line);
    const under = provenance(row);
    out.push(isTTY ? dim(under) : under);
  }
}

function hasOwnerFooter(fleet: FleetStatus, flags: TableFlags, columns: ReadonlySet<string>, callerId: string | null): string | null {
  const shared = sharedOwner(fleet, callerId);
  const otherRows = fleet.rows.filter((row) => row.key !== callerId);
  return !flags.showOwner && !columns.has("owner") && shared !== null && otherRows.some((row) => !row.owned)
    ? shared
    : null;
}

export function renderStatusTable(fleet: FleetStatus, flags: TableFlags, options: { host: boolean; columns: ReadonlySet<string>; callerId?: string | null }): string {
  const { names, rows } = fleet;
  if (!rows.length) return "";
  const { headers, caps } = tableColumns(flags, options.host);
  const ownsOthers = ownsLiveWorker(rows, options.callerId ?? null);
  const cells = rows.map((row) => visibleColumns(tableRow(row, names, flags, options.host, options.callerId ?? null, ownsOthers), headers, options.columns));
  const rendered = renderTable(visibleColumns(headers, headers, options.columns), cells, visibleColumns(caps, headers, options.columns)).split("\n");
  const out: string[] = [rendered[0] ?? "", rendered[1] ?? ""];
  appendRenderedRows(out, rendered, rows, (row) => provenanceLine(row, names, options.callerId ?? null, options.columns));
  const owner = hasOwnerFooter(fleet, flags, options.columns, options.callerId ?? null);
  if (owner !== null) out.push(`owner: ${owner}`);
  return out.join("\n");
}

export function formatStatusTable(fleet: FleetStatus, options: StatusTableOptions): string {
  const callerId = options.callerId ?? null;
  return renderStatusTable(fleet, tableFlags(fleet, options.all, options.human === true, callerId), { host: options.host, columns: options.columns, callerId });
}

export function localStatusTable(fleet: FleetStatus, all: boolean): string {
  return formatStatusTable(fleet, { all, host: false, columns: NO_STATUS_HIDE.columns });
}
