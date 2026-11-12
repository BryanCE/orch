// Adopting an agent orch did not spawn: one found in a pane on this machine. orchd reads the
// process its pane runs, which is the one liveness source for the row it records.
import { getBackend } from "../../../backends/registry.ts";
import { registerSpawnedAgent } from "../../../store/spawn-registration.ts";
import { hostedHere } from "../../../local-process.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** `adopt-agent`: record the agent with the process its pane runs. An agent in a pane orch cannot
 *  read has no process orch can watch, and a row for it would read as dead at once. */
export function adoptAgent(state: DaemonState, params: ParamsOf<"adopt-agent">): ResultOf<"adopt-agent"> {
  const backend = getBackend(params.backendId);
  if (backend === undefined) throw new Error(`cannot adopt ${params.name}: it sits in no pane orch can read, so orch cannot watch it. Spawn it with orch instead.`);
  const { key, harnessId, backendId, handle, cwd, name, space, model, thinking, spawner, owner, worktree } = params;
  const running = backend.process.running(handle);
  registerSpawnedAgent(state.directory, {
    form: params.form, key, harnessId, backendId, handle, cwd, name, model, spawner,
    ...(space === undefined ? {} : { space }),
    ...(thinking === undefined ? {} : { thinking }),
    ...(owner === undefined ? {} : { owner }),
    ...(worktree === undefined ? {} : { worktree }),
    // orch did not place this agent, so it claims no place for it: the handle is the address the
    // environment already had.
    placed: false,
    // The pane is on this machine, so its process runs on this host.
    process: hostedHere(running.pid, running.startToken),
  });
  return { ok: true };
}
