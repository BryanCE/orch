import { renderTable } from "../../table.ts";
import { collapse, truncate } from "../../util.ts";
import { dim } from "../../tui/screen.ts";
import { DEAD_HOLDER_DRIVER, NO_ORCH_DRIVER } from "../../agent/drive-state.ts";
import { formatSpace, displayStatusState, NO_STATUS_FILTER, isTTY } from "./options.ts";
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

function formatOwnerCell(row: StatusRow, names: FleetNames): string {
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
  spaceWide: boolean;
  host: boolean;
  human?: boolean;
  /** Columns `--filter` removed. */
  columns: ReadonlySet<string>;
}

function tableFlags(fleet: FleetStatus, spaceWide: boolean, human: boolean): TableFlags {
  return {
    showSpace: spaceWide && new Set(fleet.rows.map((row) => row.spaceId ?? "-")).size > 1,
    showOwner: new Set(fleet.rows.map((row) => ownerLabel(row, fleet.names) ?? "-")).size > 1,
    showBranch: fleet.rows.some((row) => row.branch),
    human,
  };
}

function tableOptionalCells(row: StatusRow, names: FleetNames, flags: TableFlags): string[] {
  const cells: string[] = [];
  if (flags.showOwner) cells.push(formatOwnerCell(row, names));
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

function localNameCell(row: StatusRow, names: FleetNames, flags: TableFlags): string {
  const name = row.name ?? (row.warning ? "WARNING" : "");
  return flags.showSpace ? `${formatSpace(row.spaceId, row.spaceId ? names.spaces[row.spaceId] : null)} / ${name}` : name;
}

function tableStateCell(row: StatusRow, includeFallback: boolean): string {
  return displayStatusState(row) + (includeFallback && row.stateFallback ? "?" : "");
}

function tableCostCell(row: StatusRow): string {
  return row.cost > 0 ? "$" + row.cost.toFixed(2) : "";
}

function tableContextCell(row: StatusRow): string {
  return row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "";
}

function tableRow(row: StatusRow, names: FleetNames, flags: TableFlags, host: boolean): string[] {
  if (flags.human) {
    return [
      ...(host ? [row.host ?? "local"] : []), row.name ?? (row.warning ? "WARNING" : "-"),
      row.agent ?? "-", truncate(row.cwd ?? "-", 30), truncate(row.worktree ?? "-", 24),
      truncate(row.branch ?? "-", 20), formatOwnerCell(row, names), tableStateCell(row, true),
    ];
  }
  const prefix = host
    ? [row.host ?? "local", localIdCell(row), environmentCell(row), localNameCell(row, names, flags)]
    : [localIdCell(row), environmentCell(row), localNameCell(row, names, flags)];
  return [
    ...prefix, ...tableOptionalCells(row, names, flags), row.tab ?? "-", row.agent ?? "-",
    modelShort(row.model) || "-", tableStateCell(row, true), tableCostCell(row),
    tableContextCell(row), truncate(collapse(row.task ?? ""), 40), truncate(collapse(row.lastText ?? ""), 50),
  ];
}

function ownerBranchHeaders(flags: TableFlags): string[] {
  const columns: string[] = [];
  if (flags.showOwner) columns.push("OWNER");
  if (flags.showBranch) columns.push("BRANCH");
  return columns;
}

function sharedOwner(fleet: FleetStatus): string | null {
  const labels = fleet.rows.map((row) => ownerLabel(row, fleet.names));
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
      caps: [...(host ? [10] : []), 20, 10, 30, 24, 20, 32, 12],
    };
  }
  return {
    headers: [...(host ? ["HOST"] : []), "ID", "ENV", "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [...(host ? [10] : []), 12, 10, 14, ...ownerBranchCaps(flags), 8, 6, 20, 10, 6, 4, 24, 34],
  };
}

function visibleColumns<T>(cells: readonly T[], headers: readonly string[], columns: ReadonlySet<string>): T[] {
  return cells.filter((_, index) => !columns.has((headers[index] ?? "").toLowerCase()));
}

export function renderStatusTable(fleet: FleetStatus, flags: TableFlags, options: { host: boolean; columns: ReadonlySet<string> }): string {
  const { names, rows } = fleet;
  if (!rows.length) return "";
  const { headers, caps } = tableColumns(flags, options.host);
  const cells = rows.map((row) => visibleColumns(tableRow(row, names, flags, options.host), headers, options.columns));
  const rendered = renderTable(visibleColumns(headers, headers, options.columns), cells, visibleColumns(caps, headers, options.columns)).split("\n");
  const out: string[] = [rendered[0] ?? "", rendered[1] ?? ""];
  for (let index = 0; index < rows.length; index++) {
    const line = rendered[index + 2] ?? "";
    out.push(rows[index]?.exited ? (isTTY ? dim(line) : line) : line);
  }
  const shared = sharedOwner(fleet);
  if (!flags.showOwner && !options.columns.has("owner") && shared !== null) out.push(`owner: ${shared}`);
  return out.join("\n");
}

export function formatStatusTable(fleet: FleetStatus, options: StatusTableOptions): string {
  return renderStatusTable(fleet, tableFlags(fleet, options.spaceWide, options.human === true), { host: options.host, columns: options.columns });
}

export function localStatusTable(fleet: FleetStatus, spaceWide: boolean): string {
  return formatStatusTable(fleet, { spaceWide, host: false, columns: NO_STATUS_FILTER.columns });
}
