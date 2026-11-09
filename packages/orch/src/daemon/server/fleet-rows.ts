import { modelSpec } from "../../policy/thinking.ts";
import { getAdapter } from "../../adapters/registry.ts";
import { spaceName as resolveSpaceName } from "../../shared/space.ts";
import { firstNonEmptyText } from "../../commands/target.ts";
import { viewForKey } from "../../shared/lookup.ts";
import { collapse } from "../../util.ts";
import { displayStatusState } from "../../commands/status/options.ts";
import { ownsAgent } from "../../policy/close-authority.ts";
import type { OrchDir } from "../../types/core.ts";
import type { LeaseFacts } from "../../shared/drive-state.ts";
import type { AgentAdapter, SessionView } from "../../types/adapter.ts";
import type { AgentTuning, AgentView } from "../../types/store.ts";
import { type PresenceEntry, notDead } from "../../types/presence.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { LeaseStatusPayload, StatusRow } from "../../types/command.ts";
import type { FleetNames } from "../../types/daemon.ts";
import type { HostOffline } from "../../types/host.ts";
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

/** What the agent reports it runs, else what its session shows, else the model orch launched it on. */
function deriveModelString(pres: PresenceEntry | null, sview: SessionView | null, adapter: AgentAdapter | undefined, launched: AgentTuning | undefined): string {
  const presenceModel = presenceModelString(pres);
  if (presenceModel) return presenceModel;
  const sessionModel = sessionModelString(sview);
  if (sessionModel) return sessionModel;
  if (launched?.model) return modelSpec(launched.model, launched.thinking);
  const adapterDefault = adapter?.defaultModel?.defaultModelString();
  return adapterDefault ? `${adapterDefault} (default)` : "-";
}

function deriveState(pres: PresenceEntry | null, ent: Entity, sview: SessionView | null): { state: string; stateFallback: boolean; exited: boolean } {
  if (!pres?.status) {
    return { state: ent.backendStatus ?? sview?.state ?? (sview ? "idle" : "unknown"), stateFallback: true, exited: false };
  }
  if (pres.liveness === "dead") return { state: "exited", stateFallback: false, exited: true };
  if (pres.liveness === "unknown") return { state: "unknown", stateFallback: false, exited: false };
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
    cwd: view?.environment.cwd ?? null,
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

/** The stored process an agent row runs as, and whether its host is another machine whose
 *  link is down. */
export interface RowProcess {
  /** Null for an agent another host runs: its pid is that host's. */
  readonly pid: number | null;
  readonly offline: HostOffline | null;
}

/** What orch stored when it made the row: its kind, its creation instant, and the process it runs as. */
function storedFacts(agent: AgentView | undefined, process: RowProcess | undefined): Pick<StatusRow, "kind" | "createdAt" | "pid" | "hostOffline"> {
  return {
    kind: agent?.kind ?? null,
    createdAt: agent?.createdAt ?? null,
    pid: process?.pid ?? null,
    ...(process?.offline == null ? {} : { hostOffline: process.offline }),
  };
}

export function statusRowFromEntity(
  entity: Entity,
  views: ReadonlyMap<string, AgentView>,
  leaseFacts: LeaseFacts,
  questionOf: (agentId: string) => string | undefined,
  processOf: (agentId: string) => RowProcess | undefined,
  orchDir: OrchDir,
  caller: string | null,
): StatusRow {
  const agentView = viewForKey(views, entity.key);
  const agent = views.get(entity.key);
  return {
    key: entity.key,
    agentId: entity.key,
    rootAgentId: agent?.rootAgentId ?? null,
    paneId: entity.paneId,
    managed: entity.managed,
    owned: caller === null ? entity.managed : ownsAgent(orchDir, caller, entity.key),
    ...storedFacts(agent, processOf(entity.key)),
    host: entity.host,
    name: agent?.name ?? (entity.managed === false ? null : entity.name),
    tab: entity.tabLabel,
    agent: entity.agent,
    ...leasePayloadFrom(entity.key, leaseFacts),
    ...viewProvenance(agentView),
    focused: entity.focused,
    ...liveFacts(entity, agentView, questionOf),
    backendStatus: entity.backendStatus,
    backend: entity.backend,
    bridgeAttached: null,
    spaceId: agent?.environment.space ?? entity.space,
  };
}

type UsageFacts = Pick<StatusRow, "cost" | "ctxPercent" | "dispatchId" | "tokens">;
type LiveFacts = UsageFacts & Pick<StatusRow, "model" | "state" | "stateFallback" | "exited" | "alive" | "task" | "lastText">;

/** What the run has spent, and which dispatch it is. */
function usageFacts(pres: PresenceEntry | null, sview: SessionView | null): UsageFacts {
  return {
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    dispatchId: pres?.status?.dispatchId ?? null,
    tokens: presenceTokens(pres) ?? sview?.tokens ?? null,
  };
}

/** What the agent's presence says now, or its session when it has reported nothing. */
function liveFacts(entity: Entity, agentView: AgentView | undefined, questionOf: (agentId: string) => string | undefined): LiveFacts {
  const pres = entity.presence;
  const adapter = getAdapter(agentView?.harnessId ?? entity.agent ?? "");
  const sview = pres?.status ? null : sessionViewFor(entity, adapter);
  const { state, stateFallback, exited } = deriveState(pres, entity, sview);
  const alive = notDead(pres);
  return {
    model: deriveModelString(pres, sview, adapter, agentView?.tuning),
    state: displayStatusState({ state, alive, exited }),
    stateFallback,
    exited,
    alive,
    task: collapse(deriveViewTask(pres, sview, questionOf, entity.key)),
    lastText: collapse(deriveViewLast(pres, sview)),
    ...usageFacts(pres, sview),
  };
}
