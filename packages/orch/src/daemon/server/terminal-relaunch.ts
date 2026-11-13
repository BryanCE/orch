// Running another command in an agent's terminal, in place of the program there: a restart does
// it to relaunch the harness, and a terminal program attached to a session orchd holds is
// relaunched on a fresh session this way when the agent is reset.
import { retryingAsync } from "../../retry.ts";
import { sleep } from "../../util.ts";
import { resolveTargetRoute } from "../../control/dispatch.ts";
import { foregroundOf } from "../../backends/shell-ready.ts";
import { atShellPrompt } from "../../shared/shell-prompt.ts";
import { recordProcess, setHandle } from "../../store/interval-rows.ts";
import { whileSwappingProcess } from "../../presence/store.ts";
import type { AgentInputRole, Backend, BackendHandle, RelaunchRole } from "../../types/backend.ts";
import type { HereAgent } from "../../types/agent-place.ts";
import type { DaemonState } from "./state.ts";

/** The pane an agent sits in, when its environment takes typed input. */
export interface InputPane {
  readonly backend: Backend;
  readonly input: AgentInputRole;
  readonly handle: BackendHandle;
}

export function inputPane(state: DaemonState, agent: HereAgent): InputPane | null {
  const route = resolveTargetRoute(state.directory, agent);
  const input = route?.backend.agentInput ?? null;
  return route === undefined || input === null ? null : { backend: route.backend, input, handle: route.handle };
}

/** Poll until `probe` holds, for as long as a reset waits on an agent. */
export function pollReady(state: DaemonState, label: string, probe: () => boolean): Promise<boolean> {
  const { reset_ready_ms: readyMs, reset_poll_ms: pollMs } = state.services.settings.current().timeouts;
  return retryingAsync(label, probe, { attempts: Math.ceil(readyMs / pollMs), delayMs: pollMs, backoff: 1 }, { retryOnResult: (held) => !held });
}

/** Clear whatever is typed at the agent's prompt before typing a command of orch's. */
export async function clearPrompt(state: DaemonState, pane: InputPane): Promise<void> {
  pane.input.sendKeys(pane.handle, ["Escape"]);
  await sleep(state.services.settings.current().timeouts.abort_gap_ms);
}

/** Have the place's environment end its program and run `command` in a fresh place for the same
 *  agent, and record the new process and handle. */
export async function relaunchPlace(state: DaemonState, agent: HereAgent, place: { readonly role: RelaunchRole; readonly handle: BackendHandle }, command: string): Promise<void> {
  await whileSwappingProcess(state.directory, agent.id, async () => {
    const launched = await place.role.relaunch(place.handle, command);
    const now = Date.now();
    recordProcess(state.directory, agent, now, launched.process);
    setHandle(state.directory, agent, now, String(launched.handle));
  });
}

/** Type `quitText` at the pane's prompt and wait until its shell prompt shows. False when the
 *  program does not quit within the reset wait. */
export async function quitToShell(state: DaemonState, pane: InputPane, quitText: string): Promise<boolean> {
  await clearPrompt(state, pane);
  pane.input.submit(pane.handle, quitText);
  return await pollReady(state, "await shell prompt", () => atShellPrompt(foregroundOf(pane.backend, pane.handle)));
}

/** Run `command` in the agent's terminal in place of the program there, and record the process.
 *  A place whose program is the harness itself is relaunched by its environment. A pane that
 *  takes typed input is sent `quitText`, waited on until its shell prompt shows, and sent the
 *  command. Throws when the terminal does neither, or the program does not quit. */
export async function relaunchTerminal(state: DaemonState, agent: HereAgent, quitText: string, command: string): Promise<void> {
  const route = resolveTargetRoute(state.directory, agent);
  const relaunching = route?.backend.relaunching ?? null;
  if (route !== undefined && relaunching !== null) {
    await relaunchPlace(state, agent, { role: relaunching, handle: route.handle }, command);
    return;
  }
  const pane = inputPane(state, agent);
  if (pane === null) throw new Error(`cannot relaunch ${agent.id}: its environment takes no input`);
  if (!await quitToShell(state, pane, quitText)) throw new Error(`${agent.id} did not exit after ${quitText}`);
  pane.input.submit(pane.handle, command);
}
