import { loadConfigOrNull, type OrchConfig } from "../config.ts";
import { isBridgeExtensionStale, shippedBundleHashes } from "../doctor/extensions.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
import { deriveDriveState, NO_ORCH_DRIVER, type DriveState } from "../agent/drive-state.ts";
import { agentById } from "../store/agent-rows.ts";
import { currentSpace } from "../store/interval-rows.ts";
import { openStore } from "../store/connection.ts";
import { getAdapter } from "../adapters/registry.ts";
import { collapse, buildEntities, entitySpace, sortEntities, type Entity } from "../entities.ts";
import type {  } from "../backends/backend.ts";
import { getBackend } from "../backends/registry.ts";
import { runRemoteAsync } from "../remote.ts";
import { orchDir, type PresenceEntry } from "../presence/store.ts";
import type { AgentView } from "../store/agent-view.ts";
import { renderTable } from "../table.ts";
import { spaceName as resolveSpaceName } from "../policy/space.ts";
import { ensureDaemonOrWarn } from "./daemon.ts";
import { rpcCall } from "../daemon/rpc.ts";
import {
  agentViewIndex,
  firstNonEmptyText,
  resultText,
  splitOptionFlags,
  viewForKey,
} from "./target.ts";
import { isRecord, truncate } from "../util.ts";
import type { AgentAdapter, SessionView } from "../types/adapter.ts";

const isTTY = process.stdout.isTTY;
const dim = (text: string) => (isTTY ? `\x1b[2m${text}\x1b[0m` : text);

export function formatSpace(id: string | null | undefined, name: string | null | undefined): string {
  if (!id) return "-";
  return name && name !== id ? `${name} (${id})` : name ?? id;
}

export function displaySpace(id: string | null | undefined, resolver: OrchConfig["spaces"]): string {
  return formatSpace(id, resolveSpaceName(id, resolver));
}

interface View {
  entity: Entity;
  paneLabel: string;
  name: string;
  tab: string;
  agent: string;
  /** Orchestrator that spawned this agent; null for panes orch never recorded. */
  owner: string | null;
  /** Exact session that spawned this agent; null when unreported. */
  spawnedBy: string | null;
  /** Human label for the spawning session; null when unreported. */
  spawnedByLabel: string | null;
  /** Git worktree and branch used for this agent; null when unreported. */
  worktree: string | null;
  branch: string | null;
  /** Directory the agent works in; the repo boundary a wandering worker crossed. */
  cwd: string | null;
  model: string; // display, provider stripped
  modelFull: string;
  state: string;
  stateFallback: boolean; // true → append †
  staleExtension: boolean; // true → append (stale)
  cost: number;
  ctxPercent: number | null;
  task: string;
  /** Id of the dispatch the agent reports running, for diffing against what was sent. */
  dispatchId: string | null;
  last: string;
  exited: boolean;
  sview: SessionView | null;
}

/** Resolve the adapter recorded for one entity (spawn registry, then presence, then backend report). */
export function entityAdapter(ent: Entity, views: ReadonlyMap<string, AgentView> = agentViewIndex()): AgentAdapter | undefined {
  return getAdapter(viewForKey(views, ent.key)?.harnessId ?? ent.presence?.status?.agent ?? ent.agent ?? "");
}

function currentOrchId(): string | null {
  const key = spawnerIdentity().key;
  return tryParseIdentity(key)?.id ?? null;
}

export function formatOwnerCell(row: Pick<StatusRow, "owner">): string {
  if (row.owner === null) return "-";
  return row.owner.startsWith(NO_ORCH_DRIVER) ? dim(row.owner) : row.owner;
}

/** Format a provider/model pair with its optional thinking suffix. */
function formatModel(provider: string | null | undefined, model: string, thinking: string | null | undefined): string {
  const suffix = thinking ? `:${thinking}` : "";
  return `${provider ?? ""}/${model}${suffix}`;
}

/** Build a model string from a presence status when one is reported. */
function presenceModelString(pres: PresenceEntry | null): string | null {
  const model = pres?.status?.model;
  if (!model?.id) return null;
  return formatModel(model.provider, model.id, pres?.status?.thinking);
}

/** Build a model string from a session tail when one is reported. */
function sessionModelString(sview: SessionView | null): string | null {
  if (!sview?.model) return null;
  return formatModel(sview.provider, sview.model, sview.thinking);
}

/** Build the "provider/model:thinking" display string from presence, session, then adapter default. */
function deriveModelString(pres: PresenceEntry | null, sview: SessionView | null, adapter: AgentAdapter | undefined): string {
  const presenceModel = presenceModelString(pres);
  if (presenceModel) return presenceModel;
  const sessionModel = sessionModelString(sview);
  if (sessionModel) return sessionModel;
  const adapterDefault = adapter?.defaultModel?.defaultModelString();
  return adapterDefault ? `${adapterDefault} (default)` : "-";
}

/** Pick the state label plus its fallback/exited flags: live bridge wins, else backend/session fallback. */
function deriveState(pres: PresenceEntry | null, ent: Entity, sview: SessionView | null): { state: string; stateFallback: boolean; exited: boolean } {
  if (!pres?.status) {
    // no live bridge → backend status or session fallback
    return { state: ent.backendStatus ?? sview?.state ?? (sview ? "idle" : "unknown"), stateFallback: true, exited: false };
  }
  // presence = live bridge → no fallback marker
  if (!pres.alive) return { state: "exited", stateFallback: false, exited: true };
  return { state: pres.status.asking ? "asking" : pres.status.state ?? "unknown", stateFallback: false, exited: false };
}

/** Pick the reported cost: presence first, then session view, else zero. */
function deriveCost(pres: PresenceEntry | null, sview: SessionView | null): number {
  if (pres?.status && typeof pres.status.cost === "number") return pres.status.cost;
  if (typeof sview?.cost === "number") return sview.cost;
  return 0;
}

/** Read the context-window percent from presence, or null when unreported. */
function deriveContextPercent(pres: PresenceEntry | null): number | null {
  if (pres?.status?.context && typeof pres.status.context.percent === "number") return pres.status.context.percent;
  return null;
}

/** Read a session tail only when the adapter declares that capability. */
function sessionViewFor(ent: Entity, adapter: AgentAdapter | undefined): SessionView | null {
  if (!adapter?.sessionView || !ent.sessionPath) return null;
  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath }) ?? null;
}

function deriveViewTask(pres: PresenceEntry | null, sview: SessionView | null): string {
  const question = pres?.status?.asking?.question;
  return firstNonEmptyText(question ? `Q: ${question}` : undefined, pres?.status?.task, sview?.task);
}

function deriveViewLast(pres: PresenceEntry | null, sview: SessionView | null): string {
  return firstNonEmptyText(pres?.status?.lastText, resultText(pres?.result), sview?.lastText);
}

function viewAgent(ent: Entity, pres: PresenceEntry | null, view: AgentView | undefined): string {
  return pres?.status?.agent ?? view?.harnessId ?? ent.agent ?? "-";
}

/**
 * The four facts, read apart (A1). Ownership is the open lease; provenance is
 * the immutable spawner; worktree/branch are environment axes; cwd is the
 * agent's own. Nothing here reads a second copy of any of them off one wide row.
 */
function viewProvenance(
  pres: PresenceEntry | null,
  view: AgentView | undefined,
): Pick<View, "owner" | "spawnedBy" | "spawnedByLabel" | "worktree" | "branch" | "cwd"> {
  const status = pres?.status ?? null;
  return {
    owner: view?.heldBy?.orchId ?? null,
    spawnedBy: view?.spawnedBy ?? status?.spawnedBy ?? null,
    // The spawner's name is a JOIN the composer already makes; a second copy
    // beside the child goes stale the moment the spawner is renamed.
    spawnedByLabel: view?.spawnedByName ?? status?.spawnedByLabel ?? null,
    worktree: view?.environment.worktree ?? status?.worktree ?? null,
    branch: view?.environment.branch ?? status?.branch ?? null,
    cwd: view?.cwd ?? status?.cwd ?? null,
  };
}

export function deriveView(ent: Entity, views: ReadonlyMap<string, AgentView>, staleHashes?: ReadonlySet<string>): View {
  const pres = ent.presence;
  const adapter = entityAdapter(ent, views);
  const sview = sessionViewFor(ent, adapter);
  const agent = viewForKey(views, ent.key);
  const modelFull = deriveModelString(pres, sview, adapter);
  const { state, stateFallback, exited } = deriveState(pres, ent, sview);
  const provenance = viewProvenance(pres, agent);
  return {
    entity: ent,
    paneLabel: (ent.paneId ?? ent.key) + (ent.focused ? "*" : ""),
    name: ent.name ?? "",
    tab: ent.tabLabel ?? "-",
    agent: viewAgent(ent, pres, agent),
    ...provenance,
    model: modelFull.replace(/^openai-codex\//, ""),
    modelFull,
    state,
    stateFallback,
    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash, undefined, staleHashes),
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    task: collapse(deriveViewTask(pres, sview)),
    dispatchId: pres?.status?.dispatchId ?? null,
    last: collapse(deriveViewLast(pres, sview)),
    exited,
    sview,
  };
}

/**
 * The fleet, from the daemon when it answers and from presence files when it does not.
 * orchd already holds this state, so asking it is the cheap path AND the one that keeps a
 * single source of truth; the file scan stays because `orch status` is specified to work
 * with orchd absent.
 */
interface FleetSnapshot {
  rows: StatusRow[];
  agentsSeen: number;
  alive: number;
  /** Whether a backend inventory actually contributed rows to this snapshot. */
  backendAnswered: boolean;
}

/** Apply liveness-derived state at the row boundary, before any renderer sees it. */
export function normalizeStatusRow(row: StatusRow): StatusRow {
  return { ...row, state: displayStatusState(row) };
}

function snapshot(rows: StatusRow[], backendAnswered: boolean): FleetSnapshot {
  const normalized = rows.map(normalizeStatusRow);
  return {
    rows: normalized,
    agentsSeen: normalized.length,
    alive: normalized.filter((row) => row.alive).length,
    backendAnswered,
  };
}

async function readFleetRows(spaces: OrchConfig["spaces"], offline: boolean): Promise<FleetSnapshot> {
  if (offline) {
    const rows = fleetStatusRows(spaces, { offline: true });
    return snapshot(rows, rows.some((row) => row.backend != null));
  }
  try {
    const answer = await rpcCall(orchDir(), "status");
    if (isRecord(answer) && Array.isArray(answer.rows)) {
      const rows = answer.rows as StatusRow[];
      // RPC availability is not backend availability; only inventory-bearing rows count.
      return snapshot(rows, rows.some((row) => row.backend != null));
    }
  } catch {
    // Daemon absent or refusing: fall through to the file protocol.
  }
  const rows = fleetStatusRows(spaces);
  return snapshot(rows, rows.some((row) => row.backend != null));
}

/**
 * The rows this caller should see: every space by default, and the agents orch spawned
 * unless `--all-panes`. `--all` retains its historical meaning of including unmanaged panes.
 * A backend reports every pane it owns — the orchestrator's own included — and listing those
 * made "is anyone idle?" count the asker.
 */
export function scopeFleetRows(rows: readonly StatusRow[], opts: { all: boolean; allPanes: boolean; space?: string }): StatusRow[] {
  return rows.filter((row) => {
    if (opts.space !== undefined && row.spaceId !== opts.space) return false;
    if (!opts.allPanes && !row.managed) return false;
    if (opts.all) return true;
    return !(row.presenceOnly && (row.exited || !row.alive));
  });
}

export function formatNoRowsMessage(info: { agentsSeen: number; alive: number; backendAnswered: boolean }): string {
  return `No panes found (agent records seen: ${info.agentsSeen}; alive: ${info.alive}; backend answered: ${info.backendAnswered ? "yes" : "no"}).\n`;
}

export function displayStatusState(row: Pick<StatusRow, "state" | "alive" | "exited">): string {
  return row.exited || !row.alive ? "exited" : row.state;
}

function parseSpace(args: readonly string[]): string | undefined {
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--space") return args[index + 1];
  }
  return undefined;
}

interface TableFlags {
  showSpace: boolean;
  showOwner: boolean;
  showBranch: boolean;
}

function localStatusOptions(args: readonly string[]): { json: boolean; all: boolean; allPanes: boolean; local: boolean; offline: boolean; space?: string } {
  const { enabled } = splitOptionFlags([...args], ["--json", "--all", "--local", "--all-panes", "--offline"]);
  return {
    json: enabled.has("--json"),
    all: enabled.has("--all"),
    allPanes: enabled.has("--all-panes"),
    local: enabled.has("--local"),
    offline: enabled.has("--offline"),
    space: parseSpace(args),
  };
}

function tableFlags(rows: readonly StatusRow[], all: boolean): TableFlags {
  return {
    showSpace: all && new Set(rows.map((row) => row.spaceId ?? "-")).size > 1,
    // A known lease fact must remain visible even when every row shares it.
    showOwner: rows.some((row) => row.owner !== null),
    showBranch: rows.some((row) => row.branch),
  };
}

function tableOptionalCells(row: StatusRow, flags: TableFlags): string[] {
  const cells: string[] = [];
  if (flags.showOwner) cells.push(formatOwnerCell(row));
  if (flags.showBranch) cells.push(row.branch ?? "-");
  return cells;
}

function localPaneCell(row: StatusRow): string {
  return (row.paneId ?? row.key) + (row.focused ? "*" : "");
}

function localNameCell(row: StatusRow, flags: TableFlags): string {
  const name = row.name ?? "";
  return flags.showSpace ? `${formatSpace(row.spaceId, row.spaceName)} / ${name}` : name;
}

function tableStateCell(row: StatusRow, includeFallback: boolean): string {
  return displayStatusState(row) + (includeFallback && row.stateFallback ? "?" : "") + (row.staleExtension ? " (stale)" : "");
}

function tableCostCell(row: StatusRow): string {
  return row.cost > 0 ? "$" + row.cost.toFixed(2) : "";
}

function tableContextCell(row: StatusRow): string {
  return row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "";
}

function localTableRow(row: StatusRow, flags: TableFlags): string[] {
  return [
    localPaneCell(row), localNameCell(row, flags), ...tableOptionalCells(row, flags),
    row.tab ?? "-", row.agent ?? "-", row.modelShort || row.model || "-", tableStateCell(row, true),
    tableCostCell(row), tableContextCell(row), truncate(collapse(row.task ?? ""), 40), truncate(collapse(row.lastText ?? ""), 50),
  ];
}

function ownerBranchHeaders(flags: TableFlags): string[] {
  const columns: string[] = [];
  if (flags.showOwner) columns.push("OWNER");
  if (flags.showBranch) columns.push("BRANCH");
  return columns;
}

function ownerBranchCaps(flags: TableFlags): number[] {
  const caps: number[] = [];
  // Wide enough for the whole unleased sentence: F6 says the row must READ as
  // "no orch driving it (holder gone)", and "no orch driving i..." does not.
  // The column only grows to the cap when a value needs it.
  if (flags.showOwner) caps.push(32);
  if (flags.showBranch) caps.push(24);
  return caps;
}

function localTableColumns(flags: TableFlags): { headers: string[]; caps: number[] } {
  return {
    headers: ["PANE", "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [12, 14, ...ownerBranchCaps(flags), 10, 6, 30, 12, 8, 5, 40, 50],
  };
}

/**
 * The local status table as text: header, rule, one line per row.
 *
 * Exported because the ASSEMBLY is the thing worth guarding — a column that the
 * header announces must carry its cell in every row. Verifying the owner FACT on
 * a row said nothing about whether the rendered table still shows it.
 */
export function localStatusTable(visible: readonly StatusRow[], all: boolean): string {
  const flags = tableFlags(visible, all);
  const rows = visible.map((row) => localTableRow(row, flags));
  if (!rows.length) return "";
  const { headers, caps } = localTableColumns(flags);
  const lines = renderTable(headers, rows, caps).split("\n");
  const out: string[] = [lines[0] ?? "", lines[1] ?? ""];
  for (let i = 0; i < rows.length; i++) out.push(visible[i]?.exited ? dim(lines[i + 2] ?? "") : lines[i + 2] ?? "");
  return out.join("\n");
}

function renderLocalTable(visible: readonly StatusRow[], all: boolean): void {
  const table = localStatusTable(visible, all);
  if (!table) return;
  process.stdout.write(table + "\n");
}

async function cmdStatusLocal(args: string[], spaces: OrchConfig["spaces"]): Promise<void> {
  const options = localStatusOptions(args);
  const fleet = await readFleetRows(spaces, options.offline);
  const visible = scopeFleetRows(fleet.rows, options);
  if (options.json) {
    process.stdout.write(JSON.stringify(visible, null, 2) + "\n");
    return;
  }
  if (!visible.length) {
    process.stdout.write(formatNoRowsMessage(fleet));
    return;
  }
  renderLocalTable(visible, options.all);
}

interface OrchNames {
  agentId: string | null;
  agentName: string | null;
  rootAgentId: string | null;
  rootAgentName: string | null;
  spaceId: string | null;
  spaceName: string | null;
}

/** Read display names from orch's normalized rows. Plexer coordinates are never names. */
function emptyOrchNames(agentId: string | null): OrchNames {
  return { agentId, agentName: null, rootAgentId: null, rootAgentName: null, spaceId: null, spaceName: null };
}

function agentOrchNames(agentId: string, agent: ReturnType<typeof agentById>, root: ReturnType<typeof agentById>): OrchNames {
  return {
    agentId,
    agentName: agent?.name ?? null,
    rootAgentId: root?.id ?? agent?.rootAgentId ?? null,
    rootAgentName: root?.name ?? null,
    spaceId: null,
    spaceName: null,
  };
}

function readSpaceInfo(directory: string, spaceId: string): { id: string | null; name: string | null } {
  const space = openStore(directory).query("SELECT id, name FROM spaces WHERE id = ?").get(spaceId) as { id?: string; name?: string } | undefined;
  return {
    id: typeof space?.id === "string" ? space.id : null,
    name: typeof space?.name === "string" ? space.name : null,
  };
}

function orchNames(key: string, directory = orchDir()): OrchNames {
  const identity = tryParseIdentity(key);
  if (!identity) return emptyOrchNames(null);
  try {
    const agent = agentById(directory, identity.id);
    const root = agent ? agentById(directory, agent.rootAgentId) : null;
    const names = agentOrchNames(identity.id, agent, root);
    const current = currentSpace(directory, identity.id);
    if (!current || typeof current.space_id !== "string") return names;
    const space = readSpaceInfo(directory, current.space_id);
    return { ...names, spaceId: space.id, spaceName: space.name };
  } catch {
    return emptyOrchNames(identity.id);
  }
}

/** A rendered snapshot of which roles an environment composes. Data for display,
 *  never a thing to branch on — the code reads the role itself. */
export interface EnvironmentCapabilityView {
  readonly spaceHome: boolean;
  readonly identity: boolean;
  readonly handleLookup: boolean;
  readonly logPruning: boolean;
}

export interface StatusRow {
  key: string;
  /** Orch-minted id; distinct from every plexer coordinate. */
  agentId?: string | null;
  paneId: string | null;
  /** False for panes orch did not spawn (the orchestrator's own, the user's). */
  managed: boolean;
  name: string | null;
  tab: string | null;
  agent: string | null;
  /** Current live lease holder, or an explicit no-driving status when unleased. */
  owner: string | null;
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  worktree: string | null;
  branch: string | null;
  /** Directory the agent works in; the repo boundary a wandering worker crossed. */
  cwd: string | null;
  focused: boolean;
  model: string;
  modelShort: string;
  /** What the AGENT reports about itself through its presence record — the only
   *  field that answers "is the work finished". It moves ahead of `backendStatus`
   *  by design: an agent is done the moment it says so, whatever its pane shows. */
  state: string;
  /** True when no live bridge answered and `state` came from the backend or session. */
  stateFallback: boolean;
  staleExtension?: boolean;
  exited: boolean;
  /** False once the agent's pid is gone; the visibility filter's only liveness input. */
  alive: boolean;
  cost: number;
  ctxPercent: number | null;
  task: string | null;
  /** Id of the dispatch the agent reports running; diff against the id `orch
   *  dispatch` printed to prove a pane runs the prompt it was sent. */
  dispatchId: string | null;
  lastText: string | null;
  /** What the MULTIPLEXER reports about the pane the agent runs in. It lags `state`
   *  and is a routing/diagnostic fact, never a completion signal — read `state`. */
  backendStatus: string | null;
  /** Backend that supplied this row, when known. */
  backend: string | null;
  /** What the owning backend can do with this agent. Every renderer branches on
   *  these, never on the backend's id (Rule 9). Null when no backend owns it. */
  capabilities: EnvironmentCapabilityView | null;
  sessionPath: string | null;
  presenceDir: string | null;
  presenceOnly: boolean;
  tokens: unknown;
  turns: unknown;
  /** Orch-owned space identity and display name. */
  spaceId?: string | null;
  spaceName?: string | null;
  /** Immutable provenance root (pack) identity and display name. */
  rootAgentId?: string | null;
  rootAgentName?: string | null;
  host?: string;
  warning?: string;
}

/** Format the task cell: a pending question wins, else the presence/session task text, else null. */
function viewTask(v: View): string | null {
  const question = v.entity.presence?.status?.asking?.question;
  if (question) return `Q: ${question}`;
  return v.entity.presence?.status?.task ?? v.sview?.task ?? null;
}

/** Pick the last-message text: presence lastText, then result payload, then session tail. */
function viewLastText(v: View): string | null {
  return v.entity.presence?.status?.lastText ?? resultText(v.entity.presence?.result) ?? v.sview?.lastText ?? null;
}

function rowIdentity(v: View, drive: DriveState, names: OrchNames): Pick<StatusRow, "key" | "agentId" | "rootAgentId" | "rootAgentName" | "paneId" | "managed" | "name" | "tab" | "agent" | "owner" | "spawnedBy" | "spawnedByLabel" | "worktree" | "branch" | "cwd" | "focused"> {
  return {
    key: v.entity.key,
    agentId: names.agentId,
    rootAgentId: names.rootAgentId,
    rootAgentName: names.rootAgentName,
    paneId: v.entity.paneId,
    managed: v.entity.managed,
    name: names.agentName ?? (v.entity.managed === false ? null : v.entity.name),
    tab: v.entity.tabLabel,
    agent: v.entity.agent,
    owner: drive.owner,
    spawnedBy: v.spawnedBy ?? null,
    spawnedByLabel: v.spawnedByLabel ?? null,
    worktree: v.worktree ?? null,
    branch: v.branch ?? null,
    cwd: v.cwd ?? null,
    focused: v.entity.focused,
  };
}

function rowRuntime(v: View): Pick<StatusRow, "state" | "stateFallback" | "exited" | "alive" | "cost" | "ctxPercent" | "task" | "dispatchId" | "lastText"> {
  const alive = v.entity.presence?.alive ?? false;
  return {
    state: displayStatusState({ state: v.state, alive, exited: v.exited }),
    stateFallback: v.stateFallback,
    exited: v.exited,
    alive,
    cost: v.cost,
    ctxPercent: v.ctxPercent,
    task: viewTask(v),
    dispatchId: v.dispatchId,
    lastText: viewLastText(v),
  };
}

/** What this environment can actually do, read from WHICH ROLES IT COMPOSES rather
 *  than from a flags bag (`TASKS/02-scope.md` E13 deleted `BackendCapabilities`).
 *  Reported as data for the human and the web view, never branched on. */
function backendCapabilities(v: View): EnvironmentCapabilityView | null {
  if (v.entity.backend === null) return null;
  const backend = getBackend(v.entity.backend);
  if (!backend) return null;
  return {
    spaceHome: backend.spaceHome !== null,
    identity: backend.identity !== null,
    handleLookup: backend.handleLookup !== null,
    logPruning: backend.logPruning !== null,
  };
}

function rowTokens(v: View): unknown {
  return v.sview?.tokens ?? v.entity.presence?.status?.tokens ?? null;
}

function rowTurns(v: View): unknown {
  return v.entity.presence?.status?.turns ?? v.sview?.turns ?? null;
}

function rowBackend(v: View, spaces: OrchConfig["spaces"], names: OrchNames): Pick<StatusRow, "backendStatus" | "backend" | "capabilities" | "sessionPath" | "presenceDir" | "presenceOnly" | "tokens" | "turns" | "spaceId" | "spaceName" | "staleExtension"> {
  // One space identity per row: orch's own when the agent has been put in a
  // space, else the grouping its environment was recorded under.
  const spaceId = names.spaceId ?? entitySpace(v.entity);
  return {
    backendStatus: v.entity.backendStatus,
    backend: v.entity.backend,
    capabilities: backendCapabilities(v),
    sessionPath: v.entity.sessionPath,
    presenceDir: v.entity.presence?.dir ?? null,
    presenceOnly: v.entity.presenceOnly,
    tokens: rowTokens(v),
    turns: rowTurns(v),
    spaceId,
    spaceName: names.spaceName ?? resolveSpaceName(spaceId, spaces),
    staleExtension: v.staleExtension,
  };
}

/** The one status-row shape shared by the local json branch and the merged table rows. */
export function statusRowFromView(v: View, spaces: OrchConfig["spaces"], orchId: string | null = currentOrchId(), directory: string = orchDir()): StatusRow {
  const drive = deriveDriveState(v.entity.key, { currentOrchId: orchId, directory });
  const names = orchNames(v.entity.key, directory);
  return { ...rowIdentity(v, drive, names), model: v.modelFull, modelShort: v.model, ...rowRuntime(v), ...rowBackend(v, spaces, names) };
}

/**
 * Every agent orch knows about, in the ONE row shape the daemon serves and every
 * renderer consumes. Unscoped and unfiltered on purpose: the daemon cannot know the
 * caller's space, so scoping and visibility belong to the command that renders.
 */
interface FleetStatusOptions {
  offline?: boolean;
  bundleHashes?: () => ReadonlySet<string>;
  orchId?: () => string | null;
}

export function fleetStatusRows(spaces: OrchConfig["spaces"], options: FleetStatusOptions = {}): StatusRow[] {
  const views = agentViewIndex();
  const staleHashes = options.bundleHashes?.() ?? new Set(shippedBundleHashes());
  const orchId = options.orchId?.() ?? currentOrchId();
  return sortEntities(buildEntities({ skipBackends: options.offline === true }))
    .map((entity) => statusRowFromView(deriveView(entity, views, staleHashes), spaces, orchId));
}

/** The local half of a merged remote listing: the same scoped rows, stamped `local`. */
async function localStatusRows(args: string[], spaces: OrchConfig["spaces"]): Promise<FleetSnapshot> {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local", "--all-panes", "--offline"]);
  const snapshot = await readFleetRows(spaces, enabled.has("--offline"));
  const scoped = scopeFleetRows(snapshot.rows, {
    all: enabled.has("--all"),
    allPanes: enabled.has("--all-panes"),
    space: parseSpace(args),
  });
  return { ...snapshot, rows: scoped.map((row) => ({ ...row, host: "local" })) };
}

export function warningStatusRow(host: string, warning: string): StatusRow {
  return {
    key: `warning:${host}`, paneId: null, managed: false, name: "WARNING", owner: null,
    spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null, tab: null, agent: null,
    focused: false, model: "", modelShort: "", state: "warning", stateFallback: false, staleExtension: false,
    exited: false, alive: false, cost: 0, ctxPercent: null, task: warning, dispatchId: null, lastText: null,
    backendStatus: null, backend: null, capabilities: null, sessionPath: null, presenceDir: null, presenceOnly: false,
    tokens: null, turns: null, host, warning,
  };
}

type RemoteStatusResult = Awaited<ReturnType<typeof runRemoteAsync>>;

async function remoteStatusResults(hosts: OrchConfig["hosts"], offline: boolean): Promise<{ name: string; result: RemoteStatusResult }[]> {
  return Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
}

function validRemoteValues(result: RemoteStatusResult): StatusRow[] {
  if (!result.ok || !Array.isArray(result.value)) return [];
  return result.value.filter((value) => Boolean(value) && typeof value === "object") as StatusRow[];
}

function remoteRowsFromResult(name: string, result: RemoteStatusResult, space?: string): StatusRow[] {
  if (!result.ok) return [warningStatusRow(name, result.failure.message)];
  if (!Array.isArray(result.value)) return [warningStatusRow(name, `Host "${name}" returned an invalid status payload.`)];
  return validRemoteValues(result).map((value) => normalizeStatusRow(value))
    .filter((row) => space === undefined || row.spaceId === space)
    .map((row) => ({ ...row, host: name }));
}

function mergeRemoteStatusRows(local: readonly StatusRow[], remoteResults: readonly { name: string; result: RemoteStatusResult }[], space?: string): StatusRow[] {
  return [...local, ...remoteResults.flatMap(({ name, result }) => remoteRowsFromResult(name, result, space))];
}

function remoteSummary(remoteResults: readonly { result: RemoteStatusResult }[]): { rows: StatusRow[]; alive: number; backendAnswered: boolean } {
  const rows = remoteResults.flatMap(({ result }) => validRemoteValues(result));
  return { rows, alive: rows.filter((row) => row.alive).length, backendAnswered: rows.some((row) => row.backend != null) };
}


function remotePaneCell(row: StatusRow): string {
  return row.warning ? "-" : row.paneId ?? row.key;
}

function remoteNameCell(row: StatusRow): string {
  return row.name ?? (row.warning ? "WARNING" : "");
}

function remoteTableRow(row: StatusRow, flags: TableFlags): string[] {
  return [
    row.host ?? "local", remotePaneCell(row), ...(flags.showSpace ? [formatSpace(row.spaceId, row.spaceName)] : []), remoteNameCell(row), ...tableOptionalCells(row, flags),
    row.tab ?? "-", row.agent ?? "-", row.modelShort || row.model || "-", tableStateCell(row, false),
    tableCostCell(row), tableContextCell(row), truncate(row.task ?? "", 40), truncate(row.lastText ?? "", 50),
  ];
}

function remoteTableColumns(flags: TableFlags): { headers: string[]; caps: number[] } {
  return {
    headers: ["HOST", "PANE", ...(flags.showSpace ? ["WORKSPACE"] : []), "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [10, 14, ...(flags.showSpace ? [20] : []), 14, ...ownerBranchCaps(flags), 10, 8, 30, 12, 8, 5, 40, 50],
  };
}

function renderRemoteTable(rows: readonly StatusRow[], flags: TableFlags): void {
  const { headers, caps } = remoteTableColumns(flags);
  process.stdout.write(renderTable(headers, rows.map((row) => remoteTableRow(row, flags)), caps) + "\n");
}

export async function cmdStatus(args: string[]): Promise<void> {
  const options = localStatusOptions(args);
  if (!options.offline) await ensureDaemonOrWarn(orchDir());
  const config = loadConfigOrNull(orchDir());
  const hosts = config?.hosts ?? {};
  const spaces = config?.spaces ?? {};
  if (options.local || Object.keys(hosts).length === 0) {
    await cmdStatusLocal(args, spaces);
    return;
  }
  const localSnapshot = await localStatusRows(args, spaces);
  const remoteResults = await remoteStatusResults(hosts, options.offline);
  const rows = mergeRemoteStatusRows(localSnapshot.rows, remoteResults, options.space);
  if (options.json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  if (!rows.length) {
    const remote = remoteSummary(remoteResults);
    process.stdout.write(formatNoRowsMessage({
      agentsSeen: localSnapshot.agentsSeen + remote.rows.length,
      alive: localSnapshot.alive + remote.alive,
      backendAnswered: localSnapshot.backendAnswered || remote.backendAnswered,
    }));
    return;
  }
  renderRemoteTable(rows, tableFlags(rows, options.all));
}
