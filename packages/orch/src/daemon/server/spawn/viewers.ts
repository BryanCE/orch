import { getBackend } from "../../../backends/registry.ts";
import { nextTilePlacement, readGroupLayout } from "../../../backends/tiling.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { errorMessage, orchEntrypoint } from "../../../util.ts";
import { assertNewSpaceGranted, assertTabCapacity, liveFleet } from "./admission.ts";
import { findGroupInSpace, resolveSpawnPlacement, type SpawnNotes } from "./placement.ts";
import { freeTabLabel, liveTabLabels } from "./tab-label.ts";
import type { Backend, BackendGroup, CommandPlacementRole, GroupHomeRole, GroupLayoutRole, LabelRole, TileFirstSplit } from "../../../types/backend.ts";
import type { CreatedAgent } from "../../../types/command.ts";
import type { Logger, OrchDir } from "../../../types/core.ts";
import type { DaemonClient } from "../../../types/services.ts";
import type { AgentEnvironment } from "../../../types/store.ts";
import { FORM_STDIO } from "../../../types/form.ts";
import type { SpawnAgentPlan, SpawnSettings } from "./plan.ts";

/**
 * Where the panes showing a spawn's agents open in the caller's plexer.
 *
 * An agent whose backend places nothing, on another host or held here, runs in a process
 * orchd holds; the caller's plexer gets a place running `orch attach <agent>`. The plan is made before anything
 * launches, so a full tab refuses the spawn instead of stranding agents that
 * already started there with nowhere to show them.
 */
export interface ViewerPlan {
  readonly backend: Backend;
  readonly role: CommandPlacementRole;
  readonly groupHome: GroupHomeRole;
  readonly groupLayout: GroupLayoutRole;
  readonly labeling: LabelRole | null;
  /** The plexer coordinate the places open in, or undefined when orch resolved none. */
  readonly workspace: string | undefined;
  /** The tab to fill: an open one, or the label of one to open. */
  readonly tab: { readonly group: BackendGroup } | { readonly label: string };
  readonly firstSplit: TileFirstSplit;
}

/** What planning the viewer panes reads. */
export interface ViewerPlanRequest {
  readonly services: DaemonClient;
  readonly settings: SpawnSettings;
  /** Where the caller is, as orch recorded it. */
  readonly environment: AgentEnvironment;
  /** The agent the caller resolved to, which asks for a new home; null for one with no row. */
  readonly actor: string | null;
}

/** The roles of the caller's plexer that open and tile a pane running a command. */
type ViewerRoles = Pick<ViewerPlan, "backend" | "role" | "groupHome" | "groupLayout" | "labeling">;

/** The caller's plexer when it can open a place running a command and fill a tab.
 *  A caller in no plexer, or in one without those roles, gets no pane. */
function viewerRoles(environment: AgentEnvironment): ViewerRoles | null {
  const plexer = environment.plexer;
  const backend = plexer === null ? undefined : getBackend(plexer);
  if (backend === undefined) return null;
  const { commandPlacement: role, groupHome, groupLayout, labeling } = backend;
  if (role === null || groupHome === null || groupLayout === null) return null;
  return { backend, role, groupHome, groupLayout, labeling };
}

/** The host a spawn's agents run on: the linked host it names, else this one. */
export function viewerHost(settings: Pick<SpawnSettings, "host">): string {
  return settings.host?.name ?? hostIdentity().name;
}

/** Whether an agent gets a pane: only a form that runs on a terminal has a screen to show. An
 *  `acp` agent's session is orchd's, and `orch attach`, `orch tail` and `orch peek` show it on
 *  demand. An agent bound for a linked host that asked for no form runs that host's default. */
export function needsViewer(plan: SpawnAgentPlan): boolean {
  const form = plan.form ?? plan.requestedForm;
  return form === null || FORM_STDIO[form] === "terminal";
}

/** Plan the panes for this spawn, or null when its agents sit in panes of their own, none of
 *  them has a screen, or nothing here can show them. Refuses the spawn when the tab cannot
 *  take them, by the cap the placed path enforces. */
export function planViewers(request: ViewerPlanRequest): ViewerPlan | null {
  const { services, settings, environment, actor } = request;
  if (settings.agents.some((agent) => agent.backend.placement !== null || !agent.backend.offers.some((stdio) => stdio !== "none"))) return null;
  const shown = settings.agents.filter(needsViewer);
  if (shown.length === 0) return null;
  const roles = viewerRoles(environment);
  if (roles === null) return null;
  const { backend, groupLayout } = roles;
  const placement = resolveSpawnPlacement({
    services, backend, space: settings.space, packRootId: null,
    callerPlexer: backend.id, callerHandle: environment.handle,
    grantNewHome: () => assertNewSpaceGranted(services.orchDir, actor, settings, backend),
  });
  const requested = shown.length;
  // A tab the spawn names that is already open is filled as it is. A new tab names the host
  // its agents run on, as each pane does: the tab the spawn names, or else the first agent's
  // name, followed by `@<host>`.
  const first = shown[0]?.name;
  const base = settings.tab ?? first ?? null;
  const tabLabel = base === null ? null : viewerLabel(base, viewerHost(settings));
  const named = settings.tab === null || settings.tab === undefined ? undefined : findGroupInSpace(backend, placement.workspace, settings.tab);
  const existing = named ?? (tabLabel === null ? undefined : findGroupInSpace(backend, placement.workspace, tabLabel));
  let tab: ViewerPlan["tab"];
  if (existing === undefined) {
    const { views, presence } = liveFleet(services.orchDir);
    const label = tabLabel ?? freeTabLabel(liveTabLabels(backend, views, presence));
    assertTabCapacity(settings, label, 0, requested);
    tab = { label };
  } else {
    assertTabCapacity(settings, existing.label ?? existing.id, readGroupLayout(groupLayout, existing.id).placements.length, requested);
    tab = { group: existing };
  }
  return { ...roles, workspace: placement.workspace, tab, firstSplit: settings.tiling.first_split };
}

/** The command a viewer pane runs: this install's orch attaching to one agent. */
export function attachCommand(key: string): readonly string[] {
  return [orchEntrypoint(), "attach", key];
}

/** Open one place per started agent, each running `orch attach <agent>`. A pane that
 *  fails to open costs that pane only: the agent runs on regardless. Returns each
 *  agent's pane handle by agent id. */
export function openViewers(plan: ViewerPlan, context: { orchDir: OrchDir; logger: Logger; cwd: string; notes: SpawnNotes }, host: string, agents: readonly CreatedAgent[]): ReadonlyMap<string, string> {
  const { orchDir, logger, cwd, notes } = context;
  const panes = new Map<string, string>();
  // The pane's own orch reaches this machine's orchd, wherever the plexer server was started.
  const env = { ORCH_DIR: orchDir };
  let group = "group" in plan.tab ? plan.tab.group.id : null;
  for (const agent of agents) {
    const command = attachCommand(agent.key);
    try {
      let handle: string;
      if (group === null) {
        // A new tab is born with a root place; the first pane is that place, never a split beside it.
        const created = plan.groupHome.create({ workspace: plan.workspace, cwd, label: "label" in plan.tab ? plan.tab.label : null, env });
        try {
          handle = String(plan.role.open({ cwd, workspace: plan.workspace, group: created.group.id, intoHandle: created.rootHandle, env, command }).handle);
        } catch (error: unknown) {
          try { plan.groupHome.close(created.group.id); } catch { /* best effort */ }
          throw error;
        }
        group = created.group.id;
      } else {
        const tile = nextTilePlacement(plan.groupLayout, group, plan.firstSplit);
        handle = String(plan.role.open({ cwd, workspace: plan.workspace, group, split: tile.split, targetHandle: tile.targetHandle, env, command }).handle);
      }
      panes.set(agent.key, handle);
      labelViewer(plan.labeling, logger, handle, viewerLabel(agent.name, host));
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.warn("spawn.viewer-failed", { backend: plan.backend.id, name: agent.name, error: message });
      notes.push(`warning: no pane shows ${agent.name}: ${message}. orch attach ${agent.name} shows it.`);
    }
  }
  return panes;
}

/** What a viewer's tab and pane are called here: the agent's name and the host it runs on. */
function viewerLabel(name: string, host: string): string {
  return `${name}@${host}`;
}

/** Name the pane for the agent and the host it runs on, where the plexer labels places. */
function labelViewer(labeling: LabelRole | null, logger: Logger, handle: string, label: string): void {
  if (labeling === null) return;
  try {
    labeling.setLabel(handle, label);
  } catch (error: unknown) {
    logger.warn("spawn.viewer-label-failed", { handle, label, error: errorMessage(error) });
  }
}
