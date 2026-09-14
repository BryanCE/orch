import { isBridgeExtensionStale, shippedBundleHashes } from "../../doctor/extensions.ts";
import { spawnerIdentity } from "../../policy/spawner.ts";
import { modelSpec } from "../../policy/thinking.ts";
import { deriveDriveState, NO_ORCH_DRIVER } from "../../agent/drive-state.ts";
import { getAdapter } from "../../adapters/registry.ts";
import { getBackend } from "../../backends/registry.ts";
import { spaceName as resolveSpaceName } from "../../policy/space.ts";
import { currentLease } from "../../store/lease-rows.ts";
import { pendingQuestion } from "../../store/question-rows.ts";
import { agentViewIndex, firstNonEmptyText, viewForKey } from "../target.ts";
import { collapse } from "../../util.ts";
import { displayStatusState, isTTY } from "./options.ts";
import { dim } from "../../tui/screen.ts";
import type { AgentAdapter, SessionView } from "../../types/adapter.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { EnvironmentCapabilityView, StatusRow } from "../../types/command.ts";
import type { Entity, OrchDir } from "../../types/core.ts";

interface Provenance {
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  worktree: string | null;
  branch: string | null;
  cwd: string | null;
}

/** Resolve the adapter recorded for one entity (spawn registry, then presence, then backend report). */
export function entityAdapter(ent: Entity, views: ReadonlyMap<string, AgentView>): AgentAdapter | undefined {
  return getAdapter(viewForKey(views, ent.key)?.harnessId ?? ent.agent ?? "");
}

export function currentOrchId(orchDir: OrchDir): string | null {
  return spawnerIdentity(orchDir).key;
}

function currentLeaseOwner(directory: OrchDir, agentId: string): string | null {
  try {
    return currentLease(directory, agentId)?.orchId ?? null;
  } catch {
    return null;
  }
}

export function formatOwnerCell(row: Pick<StatusRow, "owner">): string {
  if (row.owner === null) return "-";
  return row.owner.startsWith(NO_ORCH_DRIVER) ? (isTTY ? dim(row.owner) : row.owner) : row.owner;
}

function formatModel(provider: string | null | undefined, model: string, thinking: string | null | undefined): string {
  return modelSpec(`${provider ?? ""}/${model}`, thinking);
}

function presenceModelString(pres: PresenceEntry | null): string | null {
  const status = pres?.status;
  if (!status?.modelId) return null;
  return formatModel(status.modelProvider, status.modelId, status.thinking);
}

function sessionModelString(sview: SessionView | null): string | null {
  if (!sview?.model) return null;
  return formatModel(sview.provider, sview.model, sview.thinking);
}

function deriveModelString(pres: PresenceEntry | null, sview: SessionView | null, adapter: AgentAdapter | undefined): string {
  const presenceModel = presenceModelString(pres);
  if (presenceModel) return presenceModel;
  const sessionModel = sessionModelString(sview);
  if (sessionModel) return sessionModel;
  const adapterDefault = adapter?.defaultModel?.defaultModelString();
  return adapterDefault ? `${adapterDefault} (default)` : "-";
}

function deriveState(pres: PresenceEntry | null, ent: Entity, sview: SessionView | null): { state: string; stateFallback: boolean; exited: boolean } {
  if (!pres?.status) {
    return { state: ent.backendStatus ?? sview?.state ?? (sview ? "idle" : "unknown"), stateFallback: true, exited: false };
  }
  if (!pres.alive) return { state: "exited", stateFallback: false, exited: true };
  return { state: pres.status.state === "asking" ? "asking" : pres.status.state ?? "unknown", stateFallback: false, exited: false };
}

function deriveCost(pres: PresenceEntry | null, sview: SessionView | null): number {
  if (pres?.status && typeof pres.status.cost === "number") return pres.status.cost;
  if (typeof sview?.cost === "number") return sview.cost;
  return 0;
}

function deriveContextPercent(pres: PresenceEntry | null): number | null {
  return pres?.status?.contextPercent ?? null;
}

function presenceTokens(pres: PresenceEntry | null): StatusRow["tokens"] {
  const status = pres?.status;
  if (!status) return null;
  const values = [status.tokensIn, status.tokensOut, status.cacheRead, status.cacheWrite];
  if (values.every((value) => value === null)) return null;
  return {
    ...(status.tokensIn === null ? {} : { input: status.tokensIn }),
    ...(status.tokensOut === null ? {} : { output: status.tokensOut }),
    ...(status.cacheRead === null ? {} : { cacheRead: status.cacheRead }),
    ...(status.cacheWrite === null ? {} : { cacheWrite: status.cacheWrite }),
  };
}

function sessionViewFor(ent: Entity, adapter: AgentAdapter | undefined): SessionView | null {
  if (!adapter?.sessionView || !ent.sessionPath) return null;
  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath }) ?? null;
}

function deriveViewTask(pres: PresenceEntry | null, sview: SessionView | null, directory: OrchDir, agentId: string): string {
  const status = pres?.status;
  const question = status?.state === "asking"
    ? pendingQuestion(directory, agentId)?.question ?? status.blockedMessage
    : undefined;
  return firstNonEmptyText(question ? `Q: ${question}` : undefined, status?.task, sview?.task);
}

function deriveViewLast(pres: PresenceEntry | null, sview: SessionView | null): string {
  return firstNonEmptyText(pres?.status?.lastText, pres?.result, sview?.lastText);
}

function viewProvenance(view: AgentView | undefined): Provenance {
  return {
    spawnedBy: view?.spawnedBy ?? null,
    spawnedByLabel: view?.spawnedByName ?? null,
    worktree: view?.environment.worktree ?? null,
    branch: view?.environment.branch ?? null,
    cwd: view?.cwd ?? null,
  };
}

interface OrchNames {
  agentId: string | null;
  agentName: string | null;
  rootAgentId: string | null;
  rootAgentName: string | null;
  spaceId: string | null;
  spaceName: string | null;
}

function orchNames(key: string, views: ReadonlyMap<string, AgentView>): OrchNames {
  const agent = views.get(key);
  if (!agent) return { agentId: key, agentName: null, rootAgentId: null, rootAgentName: null, spaceId: null, spaceName: null };
  const root = views.get(agent.rootAgentId);
  return {
    agentId: key,
    agentName: agent.name,
    rootAgentId: agent.rootAgentId,
    rootAgentName: root?.name ?? null,
    spaceId: agent.environment.space,
    spaceName: null,
  };
}

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

export function statusRowFromEntity(
  entity: Entity,
  views: ReadonlyMap<string, AgentView>,
  staleHashes: ReadonlySet<string> | undefined = new Set(shippedBundleHashes()),
  spaces: OrchSettings["spaces"] = {},
  orchId: string | null,
  directory: OrchDir,
): StatusRow {
  const pres = entity.presence;
  const adapter = entityAdapter(entity, views);
  const sview = sessionViewFor(entity, adapter);
  const agentView = viewForKey(views, entity.key);
  const modelFull = deriveModelString(pres, sview, adapter);
  const { state, stateFallback, exited } = deriveState(pres, entity, sview);
  const provenance = viewProvenance(agentView);
  const alive = pres?.alive ?? false;
  const spaceNames = orchNames(entity.key, views);
  const spaceId = spaceNames.spaceId ?? entity.space;
  const ownership = {
    owner: deriveDriveState(entity.key, { currentOrchId: orchId, directory }).owner,
    ownerId: currentLeaseOwner(directory, entity.key),
  };
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
    owner: ownership.owner,
    ownerId: ownership.ownerId,
    ...provenance,
    focused: entity.focused,
    model: modelFull,
    modelShort: modelFull.replace(/^openai-codex\//, ""),
    state: displayStatusState({ state, alive, exited }),
    stateFallback,
    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash ?? undefined, undefined, staleHashes),
    exited,
    alive,
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    task: collapse(deriveViewTask(pres, sview, directory, entity.key)),
    dispatchId: pres?.status?.dispatchId ?? null,
    lastText: collapse(deriveViewLast(pres, sview)),
    backendStatus: entity.backendStatus,
    backend: entity.backend,
    capabilities: backendCapabilities(entity),
    sessionPath: entity.sessionPath,
    presenceOnly: entity.presenceOnly,
    bridgeAttached: null,
    tokens: sview?.tokens ?? presenceTokens(pres),
    turns: pres?.status?.turns ?? sview?.turns ?? null,
    spaceId,
    spaceName: spaceNames.spaceName ?? resolveSpaceName(spaceId, spaces),
  };
}

interface FleetStatusOptions {
  offline?: boolean;
  bundleHashes?: () => ReadonlySet<string>;
  orchId?: () => string | null;
  /** Resolve the store root once per fleet build (injectable for cost tests). */
  directory: OrchDir;
}

export function fleetStatusRows(settings: OrchSettings, spaces: OrchSettings["spaces"], options: FleetStatusOptions): StatusRow[] {
  const directory = options.directory;
  const views = agentViewIndex(directory);
  const staleHashes = options.bundleHashes?.() ?? new Set(shippedBundleHashes());
  const orchId = options.orchId?.() ?? currentOrchId(directory);
  return sortEntities(buildEntities(directory, settings, { skipBackends: options.offline === true }))
    .map((entity) => statusRowFromEntity(entity, views, staleHashes, spaces, orchId, directory));
}

export function warningStatusRow(host: string, warning: string): StatusRow {
  return {
    key: `warning:${host}`, paneId: null, managed: false, name: "WARNING", owner: null, ownerId: null,
    spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null, tab: null, agent: null,
    focused: false, model: "", modelShort: "", state: "warning", stateFallback: false, staleExtension: false,
    exited: false, alive: false, cost: 0, ctxPercent: null, task: warning, dispatchId: null, lastText: null,
    backendStatus: null, backend: null, capabilities: null, sessionPath: null, presenceOnly: false,
    bridgeAttached: null, tokens: null, turns: null, host, warning,
  };
}
