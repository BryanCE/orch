import { getBackend } from "../../backends/registry.ts";
import { nextTilePlacement, readGroupLayout } from "../../backends/tiling.ts";
import { errorMessage, orchEntrypoint } from "../../util.ts";
import { admissionFleet, assertNewSpaceGranted, assertTabCapacity } from "./admission.ts";
import { findGroupInSpace, resolveSpawnPlacement } from "./placement.ts";
import { freeTabLabel, liveTabLabels } from "./tab-label.ts";
import type { Backend, BackendGroup, CommandPlacementRole, GroupHomeRole, GroupLayoutRole, LabelRole, TileFirstSplit } from "../../types/backend.ts";
import type { CreatedAgent } from "../../types/command.ts";
import type { Logger, OrchDir } from "../../types/core.ts";
import type { DaemonClient } from "../../types/services.ts";
import type { AgentEnvironment } from "../../types/store.ts";
import type { FleetSnapshot } from "../fleet.ts";
import type { SpawnSettings } from "./flags.ts";

/**
 * Where the panes showing a far spawn's agents open in the caller's plexer.
 *
 * An agent on another host runs in a PTY that host's orchd holds; here it gets
 * a place running `orch attach <agent>`. The plan is made before anything
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
  readonly fleet: FleetSnapshot;
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

/** Plan the panes for this far spawn, or null when nothing here can show them. Refuses
 *  the spawn when the tab cannot take them, by the cap the placed path enforces. */
export async function planViewers(request: ViewerPlanRequest): Promise<ViewerPlan | null> {
  const { services, settings, environment, fleet } = request;
  const roles = viewerRoles(environment);
  if (roles === null) return null;
  const { backend, groupLayout } = roles;
  const placement = await resolveSpawnPlacement({
    services, backend, space: settings.space, packRootId: null,
    callerPlexer: backend.id, callerHandle: environment.handle,
    grantNewHome: () => assertNewSpaceGranted(services, settings, backend),
  });
  const requested = settings.agents.length;
  // The tab here carries the agent's name and the host it runs on, as its pane does,
  // unless the spawn names a tab.
  const first = settings.agents[0]?.name;
  const tabLabel = settings.tab ?? (first !== undefined && settings.host !== null ? viewerLabel(first, settings.host.name) : null);
  const existing = tabLabel === null ? undefined : findGroupInSpace(backend, placement.workspace, tabLabel);
  let tab: ViewerPlan["tab"];
  if (existing === undefined) {
    const { views, presence } = admissionFleet(fleet);
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
export function openViewers(plan: ViewerPlan, orchDir: OrchDir, logger: Logger, host: string, agents: readonly CreatedAgent[]): ReadonlyMap<string, string> {
  const panes = new Map<string, string>();
  // The pane's own orch reaches this machine's orchd, wherever the plexer server was started.
  const env = { ORCH_DIR: orchDir };
  const cwd = process.cwd();
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
      process.stdout.write(`warning: no pane shows ${agent.name}: ${message}. orch attach ${agent.name} shows it.\n`);
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
