// The settings orchd reads for one agent or one request: its project's file over the install's.
import { agentView } from "../../store/agent-view.ts";
import { projectDirectory, recordedProject } from "./spawn/project.ts";
import type { ProjectSettings } from "../../settings/project.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { OrchDir } from "../../types/core.ts";
import type { DaemonState } from "./state.ts";

/** The project directory `agentId` belongs to: the one on record, else, for an agent orch did
 *  not launch and that has not reported yet, its spawner's or its directory. Null for an agent
 *  orch has no row for. */
export function agentProjectDirectory(orchDir: OrchDir, agentId: string): string | null {
  const recorded = recordedProject(orchDir, agentId);
  if (recorded !== null) return recorded;
  const view = agentView(orchDir, agentId);
  return view === null ? null : projectDirectory(orchDir, view.spawnedBy, view.environment.cwd);
}

/** The settings of the project `agentId` belongs to, read now. An agent orch has no row for
 *  reads the install file alone. */
export function agentProjectSettings(state: DaemonState, agentId: string): ProjectSettings {
  return state.services.settingsFor(agentProjectDirectory(state.directory, agentId));
}

/** The merged settings of `agentId`'s project. An invalid project file leaves the install's. */
export function agentSettings(state: DaemonState, agentId: string): OrchSettings {
  return agentProjectSettings(state, agentId).settings;
}

/** Every key of the install file alone: for an orchd read that serves no one project. */
export function installSettings(state: DaemonState): OrchSettings {
  return state.services.settingsFor(null).settings;
}

/** The lists a lock ruling reads: the asking agent's project's, and the directory asked from when
 *  no agent orch knows asks, which is the human's own `orch lock`. An invalid project file leaves
 *  the install's lists. */
export function lockRulingSettings(state: DaemonState, agent: string | null, cwd: string): OrchSettings {
  const project = agent === null ? null : agentProjectDirectory(state.directory, agent);
  return state.services.settingsFor(project ?? cwd).settings;
}
