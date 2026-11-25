// The worker header orchd puts on work for an agent it runs, with the rules of the agent's project.
import { getAdapter } from "../../adapters/registry.ts";
import { validProjectSettings, type ProjectSettings } from "../../settings/project.ts";
import { appendedEntries } from "../../settings/append-system.ts";
import { workerPrompt, workerRules } from "../../worker-prompt.ts";
import { storedHeaderContext } from "./agent-policy.ts";
import type { WorkerHeaderContext, WorkerRequest } from "../../types/core.ts";
import type { DaemonState } from "./state.ts";

/** Wrap work with the caller context, stored agent context, and project rules.
 * An invalid project file refuses the work, naming the file and key. */
export function workerText(state: DaemonState, agentId: string, project: ProjectSettings, text: string, worker: WorkerRequest, extra: Pick<WorkerHeaderContext, "readOnly"> = {}): string {
  const adapter = worker.harness === null ? undefined : getAdapter(worker.harness);
  const settings = validProjectSettings(project);
  const rules = { ...workerRules(settings), appendedEntries: appendedEntries(project, state.services.settings.file) };
  return workerPrompt(text, false, adapter, { ...worker.context, ...storedHeaderContext(state.directory, agentId), ...extra, ...rules });
}
