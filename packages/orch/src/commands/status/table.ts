import { renderTable } from "../../table.ts";
import { collapse, truncate } from "../../util.ts";
import { dim } from "../../tui/screen.ts";
import { DEAD_HOLDER_DRIVER, NO_ORCH_DRIVER } from "../../agent/drive-state.ts";
import { formatSpace, displayStatusState, NO_STATUS_HIDE, isTTY, callerNameLabel, ownsLiveWorker } from "./options.ts";
import { modelShort } from "../../policy/thinking.ts";
import type { StatusRow } from "../../types/command.ts";
import type { FleetNames, FleetStatus } from "../../types/daemon.ts";

const DETACHED_ENVIRONMENT = "headless";

/** Who drives the row, as the OWNER column says it: the holder's name, or why there is none. */
export function ownerLabel(row: StatusRow, names: FleetNames): string | null {
  if (row.warning) return null;
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
  if (row.warning) return "-";
  return (row.agentId ?? row.key) + (row.focused ? "*" : "");
}

function environmentCell(row: StatusRow): string {
  if (row.warning) return "-";
  const handle = row.paneId;
  if (handle === null || handle.startsWith("{")) return DETACHED_ENVIRONMENT;
  return handle;
}

function localNameCell(row: StatusRow, names: FleetNames, flags: TableFlags, callerId: string | null, ownsOthers: boolean): string {
  const baseName = row.name ?? (row.warning ? "WARNING" : "");
  const name = callerNameLabel(baseName, row, callerId, ownsOthers);
  return flags.showSpace ? `${formatSpace(row.spaceId, row.spaceId ? names.spaces[row.spaceId] : null)} / ${name}` : name;
}

function tableStateCell(row: StatusRow, includeFallback: boolean, callerId: string | null): string {
  const state = displayStatusState(row);
  if (row.key === callerId && row.stateFallback && state === "unknown") return "-";
  return state + (includeFallback && row.stateFallback ? "?" : "");
}

function tableCostCell(row: StatusRow): string {
  return row.cost > 0 ? "$" + row.cost.toFixed(2) : "";
}

function tableContextCell(row: StatusRow): string {
  return row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "";
}

function humanTableCells(row: StatusRow, names: FleetNames, host: boolean, callerId: string | null, name: string): string[] {
  return [
    ...(host ? [row.host ?? "local"] : []), name,
    row.agent ?? "-", truncate(row.cwd ?? "-", 30), truncate(row.worktree ?? "-", 24),
    truncate(row.branch ?? "-", 20), formatOwnerCell(row, names, callerId), tableStateCell(row, true, callerId),
  ];
}

function standardTableCells(row: StatusRow, names: FleetNames, flags: TableFlags, host: boolean, callerId: string | null, ownsOthers: boolean): string[] {
  const prefix = host
    ? [row.host ?? "local", localIdCell(row), environmentCell(row), localNameCell(row, names, flags, callerId, ownsOthers)]
    : [localIdCell(row), environmentCell(row), localNameCell(row, names, flags, callerId, ownsOthers)];
  return [
    ...prefix, ...tableOptionalCells(row, names, flags, callerId), row.tab ?? "-", row.agent ?? "-",
    modelShort(row.model) || "-", tableStateCell(row, true, callerId), tableCostCell(row),
    tableContextCell(row), truncate(collapse(row.task ?? ""), 40), truncate(collapse(row.lastText ?? ""), 50),
  ];
}

function tableRow(row: StatusRow, names: FleetNames, flags: TableFlags, host: boolean, callerId: string | null, ownsOthers: boolean): string[] {
  const baseName = row.name ?? (row.warning ? "WARNING" : "-");
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
      headers: [...(host ? ["HOST"] : []), "NAME", "HARNESS", "CWD", "WORKTREE", "BRANCH", "OWNER", "STATE"],
      caps: [...(host ? [10] : []), 32, 10, 30, 24, 20, 32, 12],
    };
  }
  return {
    headers: [...(host ? ["HOST"] : []), "ID", "ENV", "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [...(host ? [10] : []), 12, 10, 32, ...ownerBranchCaps(flags), 8, 6, 20, 10, 6, 4, 24, 34],
  };
}

function visibleColumns<T>(cells: readonly T[], headers: readonly string[], columns: ReadonlySet<string>): T[] {
  return cells.filter((_, index) => !columns.has((headers[index] ?? "").toLowerCase()));
}

function appendRenderedRows(out: string[], rendered: readonly string[], rows: readonly StatusRow[]): void {
  for (let index = 0; index < rows.length; index++) {
    const line = rendered[index + 2] ?? "";
    out.push(rows[index]?.exited ? (isTTY ? dim(line) : line) : line);
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
  appendRenderedRows(out, rendered, rows);
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
