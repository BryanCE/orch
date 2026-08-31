import { loadSettingsOrNull } from "../settings/read.ts";
import { isBridgeExtensionStale, shippedBundleHashes } from "../doctor/extensions.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
import { deriveDriveState, NO_ORCH_DRIVER } from "../agent/drive-state.ts";

import { getAdapter } from "../adapters/registry.ts";
import { collapse, buildEntities, entitySpace, sortEntities } from "../entities.ts";
import { getBackend } from "../backends/registry.ts";
import { runRemoteAsync } from "../remote.ts";
import { orchDir } from "../presence/store.ts";
import { renderTable } from "../table.ts";
import { spaceName as resolveSpaceName } from "../policy/space.ts";
import { ensureDaemonOrWarn } from "../daemon/reach.ts";
import { rpcCall } from "../daemon/rpc/client.ts";
import {
  agentViewIndex,
  firstNonEmptyText,
  resultText,
  splitOptionFlags,
  viewForKey,
} from "./target.ts";
import { isRecord, truncate } from "../util.ts";
import type { AgentAdapter, SessionView } from "../types/adapter.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { EnvironmentCapabilityView, StatusRow } from "../types/command.ts";
import type { Entity } from "../types/core.ts";

const isTTY = process.stdout.isTTY;
const dim = (text: string) => (isTTY ? `\x1b[2m${text}\x1b[0m` : text);

export function formatSpace(id: string | null | undefined, name: string | null | undefined): string {
  if (!id) return "-";
  return name && name !== id ? `${name} (${id})` : name ?? id;
}

export function displaySpace(id: string | null | undefined, resolver: OrchSettings["spaces"]): string {
  return formatSpace(id, resolveSpaceName(id, resolver));
}

interface Provenance {
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  worktree: string | null;
  branch: string | null;
  cwd: string | null;
}

/** Resolve the adapter recorded for one entity (spawn registry, then presence, then backend report). */
export function entityAdapter(ent: Entity, views: ReadonlyMap<string, AgentView> = agentViewIndex()): AgentAdapter | undefined {
  return getAdapter(viewForKey(views, ent.key)?.harnessId ?? ent.presence?.status?.agent ?? ent.agent ?? "");
}

function currentOrchId(): string | null {
  return tryParseIdentity(spawnerIdentity().key)?.id ?? null;
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

/**
 * The four facts, read apart (A1). Ownership is the open lease; provenance is
 * the immutable spawner; worktree/branch are environment axes; cwd is the
 * agent's own. Nothing here reads a second copy of any of them off one wide row.
 */
function viewProvenance(
  pres: PresenceEntry | null,
  view: AgentView | undefined,
): Provenance {
  const status = pres?.status ?? null;
  return {
    spawnedBy: view?.spawnedBy ?? status?.spawnedBy ?? null,
    // The spawner's name is a JOIN the composer already makes; a second copy
    // beside the child goes stale the moment the spawner is renamed.
    spawnedByLabel: view?.spawnedByName ?? status?.spawnedByLabel ?? null,
    worktree: view?.environment.worktree ?? status?.worktree ?? null,
    branch: view?.environment.branch ?? status?.branch ?? null,
    cwd: view?.cwd ?? status?.cwd ?? null,
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

/**
 * A status row that arrived from OUTSIDE this process — the daemon's RPC answer
 * or a remote host's `orch status --json`.
 *
 * Rule 13: this used to be `answer.rows as StatusRow[]`, which is a promise to
 * the compiler about data neither end of the wire has checked. A row that is
 * missing `state` or carries a number where a string belongs then reaches every
 * renderer, and the crash lands far from the boundary that let it in.
 */
function isStatusRow(value: unknown): value is StatusRow {
  if (!isRecord(value)) return false;
  const strings = ["key", "model", "modelShort", "state"] as const;
  const nullableStrings = [
    "paneId", "name", "tab", "agent", "owner", "spawnedBy", "spawnedByLabel", "worktree",
    "branch", "cwd", "task", "dispatchId", "lastText", "backendStatus", "backend",
    "sessionPath", "presenceDir",
  ] as const;
  const booleans = ["managed", "focused", "stateFallback", "exited", "alive", "presenceOnly"] as const;
  for (const field of strings) if (typeof value[field] !== "string") return false;
  for (const field of nullableStrings) if (value[field] !== null && typeof value[field] !== "string") return false;
  for (const field of booleans) if (typeof value[field] !== "boolean") return false;
  if (typeof value.cost !== "number") return false;
  if (value.ctxPercent !== null && typeof value.ctxPercent !== "number") return false;
  // `capabilities` is a nullable composed view, not a flag bag: null means no
  // backend owns the row, which is an answer renderers already read (E13/E14).
  return value.capabilities === null || isRecord(value.capabilities);
}

/** Keep only the rows that really are rows. A malformed one is dropped at the
 *  boundary rather than carried inward as a lie about its shape. */
function statusRowsFrom(values: readonly unknown[]): StatusRow[] {
  return values.filter(isStatusRow);
}

async function readFleetRows(spaces: OrchSettings["spaces"], offline: boolean): Promise<FleetSnapshot> {
  if (offline) {
    const rows = fleetStatusRows(spaces, { offline: true });
    return snapshot(rows, rows.some((row) => row.backend != null));
  }
  try {
    const answer = await rpcCall(orchDir(), "status");
    if (isRecord(answer) && Array.isArray(answer.rows)) {
      const rows = statusRowsFrom(answer.rows);
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

export interface TableFlags {
  showSpace: boolean;
  showOwner: boolean;
  showBranch: boolean;
}

interface StatusOptions {
  json: boolean;
  all: boolean;
  allPanes: boolean;
  local: boolean;
  offline: boolean;
  space?: string;
}

function parseStatusOptions(args: readonly string[]): StatusOptions {
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
  if (row.warning) return "-";
  return (row.paneId ?? row.key) + (row.focused ? "*" : "");
}

function localNameCell(row: StatusRow, flags: TableFlags): string {
  const name = row.name ?? (row.warning ? "WARNING" : "");
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

function tableRow(row: StatusRow, flags: TableFlags, host: boolean): string[] {
  const prefix = host
    ? [row.host ?? "local", localPaneCell(row), localNameCell(row, flags)]
    : [localPaneCell(row), localNameCell(row, flags)];
  return [
    ...prefix, ...tableOptionalCells(row, flags), row.tab ?? "-", row.agent ?? "-",
    row.modelShort || row.model || "-", tableStateCell(row, true), tableCostCell(row),
    tableContextCell(row), truncate(collapse(row.task ?? ""), 40), truncate(collapse(row.lastText ?? ""), 50),
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

function tableColumns(flags: TableFlags, host: boolean): { headers: string[]; caps: number[] } {
  return {
    headers: [...(host ? ["HOST"] : []), "PANE", "NAME", ...ownerBranchHeaders(flags), "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"],
    caps: [...(host ? [10] : []), 12, 14, ...ownerBranchCaps(flags), 10, 6, 30, 12, 8, 5, 40, 50],
  };
}

/**
 * The local status table as text: header, rule, one line per row.
 *
 * Exported because the ASSEMBLY is the thing worth guarding — a column that the
 * header announces must carry its cell in every row. Verifying the owner FACT on
 * a row said nothing about whether the rendered table still shows it.
 */
/** Render either local or merged rows. The merged form differs only by HOST. */
export function renderStatusTable(rows: readonly StatusRow[], flags: TableFlags, options: { host: boolean }): string {
  if (!rows.length) return "";
  const { headers, caps } = tableColumns(flags, options.host);
  const rendered = renderTable(headers, rows.map((row) => tableRow(row, flags, options.host)), caps).split("\n");
  const out: string[] = [rendered[0] ?? "", rendered[1] ?? ""];
  for (let index = 0; index < rows.length; index++) {
    const line = rendered[index + 2] ?? "";
    out.push(rows[index]?.exited ? dim(line) : line);
  }
  return out.join("\n");
}

export function localStatusTable(visible: readonly StatusRow[], all: boolean): string {
  return renderStatusTable(visible, tableFlags(visible, all), { host: false });
}

function renderLocalTable(visible: readonly StatusRow[], all: boolean): void {
  const table = localStatusTable(visible, all);
  if (table) process.stdout.write(table + "\n");
}

async function cmdStatusLocal(options: StatusOptions, spaces: OrchSettings["spaces"]): Promise<void> {
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

/** Read names and environment from the already-loaded normalized agent views. */
function orchNames(key: string, views: ReadonlyMap<string, AgentView>): OrchNames {
  const identity = tryParseIdentity(key);
  if (!identity) return { agentId: null, agentName: null, rootAgentId: null, rootAgentName: null, spaceId: null, spaceName: null };
  const agent = views.get(identity.id);
  if (!agent) return { agentId: identity.id, agentName: null, rootAgentId: null, rootAgentName: null, spaceId: null, spaceName: null };
  const root = views.get(agent.rootAgentId);
  return {
    agentId: identity.id,
    agentName: agent.name,
    rootAgentId: agent.rootAgentId,
    rootAgentName: root?.name ?? null,
    spaceId: agent.environment.space,
    spaceName: null,
  };
}

/** What this environment can actually do, read from the roles it composes. */
function backendCapabilities(entity: Entity): EnvironmentCapabilityView | null {
  if (entity.backend === null) return null;
  const backend = getBackend(entity.backend);
  if (!backend) return null;
  return {
    spaceHome: backend.spaceHome !== null,
    identity: backend.identity !== null,
    handleLookup: backend.handleLookup !== null,
    logPruning: backend.logPruning !== null,
  };
}

/** Compose one entity directly into the single row shape used everywhere. */
export function statusRowFromEntity(
  entity: Entity,
  views: ReadonlyMap<string, AgentView>,
  staleHashes: ReadonlySet<string> | undefined = new Set(shippedBundleHashes()),
  spaces: OrchSettings["spaces"] = {},
  orchId: string | null = currentOrchId(),
  directory: string = orchDir(),
): StatusRow {
  const pres = entity.presence;
  const adapter = entityAdapter(entity, views);
  const sview = sessionViewFor(entity, adapter);
  const agentView = viewForKey(views, entity.key);
  const modelFull = deriveModelString(pres, sview, adapter);
  const { state, stateFallback, exited } = deriveState(pres, entity, sview);
  const provenance = viewProvenance(pres, agentView);
  const alive = pres?.alive ?? false;
  const spaceNames = orchNames(entity.key, views);
  const spaceId = spaceNames.spaceId ?? entitySpace(entity);
  return {
    key: entity.key,
    agentId: spaceNames.agentId,
    rootAgentId: spaceNames.rootAgentId,
    rootAgentName: spaceNames.rootAgentName,
    paneId: entity.paneId,
    managed: entity.managed,
    name: spaceNames.agentName ?? (entity.managed === false ? null : entity.name),
    tab: entity.tabLabel,
    agent: entity.agent,
    owner: deriveDriveState(entity.key, { currentOrchId: orchId, directory }).owner,
    ...provenance,
    focused: entity.focused,
    model: modelFull,
    modelShort: modelFull.replace(/^openai-codex\//, ""),
    state: displayStatusState({ state, alive, exited }),
    stateFallback,
    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash, undefined, staleHashes),
    exited,
    alive,
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    // Collapse deliberately at the row boundary so JSON and table cells agree.
    task: collapse(deriveViewTask(pres, sview)),
    dispatchId: pres?.status?.dispatchId ?? null,
    lastText: collapse(deriveViewLast(pres, sview)),
    backendStatus: entity.backendStatus,
    backend: entity.backend,
    capabilities: backendCapabilities(entity),
    sessionPath: entity.sessionPath,
    presenceDir: pres?.dir ?? null,
    presenceOnly: entity.presenceOnly,
    tokens: sview?.tokens ?? pres?.status?.tokens ?? null,
    turns: pres?.status?.turns ?? sview?.turns ?? null,
    spaceId,
    spaceName: spaceNames.spaceName ?? resolveSpaceName(spaceId, spaces),
  };
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
  /** Resolve the store root once per fleet build (injectable for cost tests). */
  directory?: () => string;
}

export function fleetStatusRows(spaces: OrchSettings["spaces"], options: FleetStatusOptions = {}): StatusRow[] {
  const directory = options.directory?.() ?? orchDir();
  const views = agentViewIndex();
  const staleHashes = options.bundleHashes?.() ?? new Set(shippedBundleHashes());
  // Resolve these process-wide inputs once so a fleet never performs a caller
  // lookup for every individual row.
  const orchId = options.orchId?.() ?? currentOrchId();
  return sortEntities(buildEntities({ skipBackends: options.offline === true }))
    .map((entity) => statusRowFromEntity(entity, views, staleHashes, spaces, orchId, directory));
}

/** The local half of a merged remote listing: the same scoped rows, stamped `local`. */
async function localStatusRows(options: StatusOptions, spaces: OrchSettings["spaces"]): Promise<FleetSnapshot> {
  const snapshot = await readFleetRows(spaces, options.offline);
  const scoped = scopeFleetRows(snapshot.rows, options);
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

async function remoteStatusResults(hosts: OrchSettings["hosts"], offline: boolean): Promise<{ name: string; result: RemoteStatusResult }[]> {
  return Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
}

function validRemoteValues(result: RemoteStatusResult): StatusRow[] {
  if (!result.ok || !Array.isArray(result.value)) return [];
  return statusRowsFrom(result.value);
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

export async function cmdStatus(args: string[]): Promise<void> {
  const options = parseStatusOptions(args);
  if (!options.offline) await ensureDaemonOrWarn(orchDir());
  const settings = loadSettingsOrNull(orchDir());
  const hosts = settings?.hosts ?? {};
  const spaces = settings?.spaces ?? {};
  if (options.local || Object.keys(hosts).length === 0) {
    await cmdStatusLocal(options, spaces);
    return;
  }
  const localSnapshot = await localStatusRows(options, spaces);
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
  process.stdout.write(renderStatusTable(rows, tableFlags(rows, options.all), { host: true }) + "\n");
}
