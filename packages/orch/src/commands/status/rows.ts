import { modelSpec } from "../../policy/thinking.ts";
import { getAdapter } from "../../adapters/registry.ts";
import { spaceName as resolveSpaceName } from "../../policy/space.ts";
import { firstNonEmptyText } from "../target.ts";
import { viewForKey } from "../../entities/lookup.ts";
import { collapse } from "../../util.ts";
import { displayStatusState } from "./options.ts";
import type { LeaseFacts } from "../../agent/drive-state.ts";
import type { AgentAdapter, SessionView } from "../../types/adapter.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { LeaseStatusPayload, StatusRow } from "../../types/command.ts";
import type { FleetNames } from "../../types/daemon.ts";
import type { Entity } from "../../types/core.ts";

interface Provenance {
  spawnedBy: string | null;
  worktree: string | null;
  branch: string | null;
  cwd: string | null;
}

/** Lease facts from the composed view, never from presence or ownership files. */
export function leasePayloadFrom(key: string, facts: LeaseFacts): LeaseStatusPayload {
  // An agent key IS its minted id (A1); a key that is not one names no agent and
  // stays unknown rather than being guessed at.
  const view = facts.viewOf(key);
  if (view === null) return { lease: null, leaseKnown: false };
  const lease = view.heldBy;
  if (lease === null) return { lease: null, leaseKnown: true };
  return { lease: { holderId: lease.orchId, holderAlive: facts.holderAlive(lease.orchId) }, leaseKnown: true };
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

/** The harness's own session file, read only for an agent whose bridge never reported. */
function sessionViewFor(ent: Entity, adapter: AgentAdapter | undefined): SessionView | null {
  if (!adapter?.sessionView || !ent.sessionPath) return null;
  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath }) ?? null;
}

function deriveViewTask(
  pres: PresenceEntry | null,
  sview: SessionView | null,
  questionOf: (agentId: string) => string | undefined,
  agentId: string,
): string {
  const status = pres?.status;
  const question = status?.state === "asking" ? questionOf(agentId) ?? status.blockedMessage : undefined;
  return firstNonEmptyText(question ? `Q: ${question}` : undefined, status?.task, sview?.task);
}

function deriveViewLast(pres: PresenceEntry | null, sview: SessionView | null): string {
  return firstNonEmptyText(pres?.status?.lastText, pres?.result, sview?.lastText);
}

function viewProvenance(view: AgentView | undefined): Provenance {
  return {
    spawnedBy: view?.spawnedBy ?? null,
    worktree: view?.environment.worktree ?? null,
    branch: view?.environment.branch ?? null,
    cwd: view?.cwd ?? null,
  };
}

/** Every id a row points at, resolved to its display name once. */
export function fleetNames(rows: readonly StatusRow[], views: ReadonlyMap<string, AgentView>, spaces: OrchSettings["spaces"]): FleetNames {
  const agents: Record<string, string> = {};
  const spaceNames: Record<string, string> = {};
  const nameAgent = (id: string | null | undefined): void => {
    if (!id || id in agents) return;
    const name = views.get(id)?.name;
    if (name) agents[id] = name;
  };
  for (const row of rows) {
    nameAgent(row.spawnedBy);
    nameAgent(row.rootAgentId);
    nameAgent(row.lease?.holderId);
    const space = row.spaceId;
    if (space && !(space in spaceNames)) {
      const name = resolveSpaceName(space, spaces);
      if (name) spaceNames[space] = name;
    }
  }
  return { agents, spaces: spaceNames };
}

export function statusRowFromEntity(
  entity: Entity,
  views: ReadonlyMap<string, AgentView>,
  leaseFacts: LeaseFacts,
  questionOf: (agentId: string) => string | undefined,
): StatusRow {
  const pres = entity.presence;
  const adapter = getAdapter(viewForKey(views, entity.key)?.harnessId ?? entity.agent ?? "");
  const sview = pres?.status ? null : sessionViewFor(entity, adapter);
  const agentView = viewForKey(views, entity.key);
  const { state, stateFallback, exited } = deriveState(pres, entity, sview);
  const alive = pres?.alive ?? false;
  const agent = views.get(entity.key);
  return {
    key: entity.key,
    agentId: entity.key,
    rootAgentId: agent?.rootAgentId ?? null,
    paneId: entity.paneId,
    managed: entity.managed,
    name: agent?.name ?? (entity.managed === false ? null : entity.name),
    tab: entity.tabLabel,
    agent: entity.agent,
    ...leasePayloadFrom(entity.key, leaseFacts),
    ...viewProvenance(agentView),
    focused: entity.focused,
    model: deriveModelString(pres, sview, adapter),
    state: displayStatusState({ state, alive, exited }),
    stateFallback,
    exited,
    alive,
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    task: collapse(deriveViewTask(pres, sview, questionOf, entity.key)),
    dispatchId: pres?.status?.dispatchId ?? null,
    lastText: collapse(deriveViewLast(pres, sview)),
    backendStatus: entity.backendStatus,
    backend: entity.backend,
    bridgeAttached: null,
    tokens: presenceTokens(pres) ?? sview?.tokens ?? null,
    spaceId: agent?.environment.space ?? entity.space,
  };
}

export function warningStatusRow(host: string, warning: string): StatusRow {
  return {
    key: `warning:${host}`, paneId: null, managed: false, name: "WARNING", lease: null, leaseKnown: false,
    spawnedBy: null, worktree: null, branch: null, cwd: null, tab: null, agent: null,
    focused: false, model: "", state: "warning", stateFallback: false,
    exited: false, alive: false, cost: 0, ctxPercent: null, task: warning, dispatchId: null, lastText: null,
    backendStatus: null, backend: null,
    bridgeAttached: null, tokens: null, host, warning,
  };
}
