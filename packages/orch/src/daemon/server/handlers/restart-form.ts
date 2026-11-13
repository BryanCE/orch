// Restart in a held form: an agent whose process orchd holds is relaunched on its recorded session,
// in its own form or in another. The agent keeps its id, its lease and its backend; only the
// process, the channel and, on a switch, the open `agent_forms` row change.
import { getBackend, startHeldAgent, type HeldProgram } from "../../../backends/registry.ts";
import { agentView } from "../../../store/agent-view.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { worktreeOf } from "../../../store/agent-rows.ts";
import { setForm } from "../../../store/interval-rows.ts";
import { whileSwappingProcess } from "../../../presence/store.ts";
import { isThinkingLevel } from "../../../policy/thinking.ts";
import { FORM_STDIO, offersForm, type FormId } from "../../../types/form.ts";
import { endSessionAgent, sessionDriver, startAttachedTerminal, startSessionAgent, terminalAttach } from "../session-agents.ts";
import { reclaim } from "./lifecycle.ts";
import type { AgentAdapter, ResumeRole } from "../../../types/adapter.ts";
import type { HeldSessionDriver, TerminalAttachRole } from "../../../types/held-session.ts";
import type { BackendSpawnOpts } from "../../../types/backend.ts";
import type { AgentView } from "../../../types/store.ts";
import type { HeldTerminal } from "../../../types/pty.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import type { DaemonState } from "../state.ts";

/** What a form needs from its harness: a session driver on pipes; for a terminal, the session
 *  attach its terminal program joins, or else a resume argv. */
type FormRole =
  | { readonly stdio: "pipes"; readonly driver: HeldSessionDriver }
  | { readonly stdio: "terminal"; readonly attach: TerminalAttachRole }
  | { readonly stdio: "terminal"; readonly attach: null; readonly role: ResumeRole };

/** What a restart in a held form leaves to its caller. */
export interface FormRestart {
  /** True when the relaunched harness reports through a bridge or hooks, so the restart is
   *  done once it has reported again. */
  readonly awaitBridge: boolean;
}

function formRole(adapter: AgentAdapter, form: FormId): FormRole | null {
  switch (FORM_STDIO[form]) {
    case "pipes": {
      const driver = sessionDriver(adapter, form);
      return driver === null ? null : { stdio: "pipes", driver };
    }
    case "terminal": {
      const attach = terminalAttach(adapter);
      if (attach !== null) return { stdio: "terminal", attach };
      return adapter.resume === null ? null : { stdio: "terminal", attach: null, role: adapter.resume };
    }
    case "none":
      return null;
    default: {
      const exhaustive: never = FORM_STDIO[form];
      throw new Error(`unknown stdio ${String(exhaustive)}`);
    }
  }
}

/** The spawn opts of a restart, from what the store holds about the agent. The store holds no
 *  env, tools or workers for an agent, so a restart carries none. */
function restartOpts(state: DaemonState, adapter: AgentAdapter, agent: HereAgent, view: AgentView, form: FormId): BackendSpawnOpts {
  const { model, thinking } = view.tuning;
  const worktree = worktreeOf(state.directory, agent);
  return {
    ...(worktree === null ? {} : { worktree }),
    form,
    key: view.id,
    name: view.name,
    orchDir: state.directory,
    cwd: view.environment.cwd,
    ...(model === null ? {} : { model }),
    ...(isThinkingLevel(thinking) ? { thinking } : {}),
    preferredModels: state.services.settings.current().models.preferred[adapter.id] ?? [],
  };
}

/** Refuse unless the form's driver can reopen a recorded session. */
async function requireReopen(state: DaemonState, view: AgentView, adapter: AgentAdapter, form: FormId, driver: HeldSessionDriver): Promise<void> {
  if (!await driver.reopens(state.pipes, state.services.settings.current())) throw new Error(`cannot switch ${view.name} to ${form}: the ${adapter.id} binding does not offer session load`);
}

/** End the agent's process and its channel, and wait until orchd holds nothing under its key. */
async function endHeldProcess(state: DaemonState, agent: HereAgent): Promise<void> {
  const key = agent.id;
  await endSessionAgent(key);
  const terminal: HeldTerminal = { kind: "agent", agent };
  if (state.held.has(terminal)) {
    await new Promise<void>((resolve) => {
      state.held.subscribe(terminal, () => undefined, () => { resolve(); });
      state.held.kill(key);
    });
  }
}

/** Swap the agent's held process for the one `start` runs. The old claim goes first, since the
 *  relaunched harness claims the row afresh; a switch opens the next form row before it starts. */
async function swapProcess(state: DaemonState, agent: HereAgent, form: FormId | null, start: () => Promise<unknown>): Promise<void> {
  const key = agent.id;
  await whileSwappingProcess(state.directory, key, async () => {
    await endHeldProcess(state, agent);
    reclaim(state.directory, { target: key });
    await start();
    if (form !== null) setForm(state.directory, key, Date.now(), form);
  });
}

function viewOf(state: DaemonState, agent: HereAgent): AgentView {
  const view = agentView(state.directory, agent.id);
  if (view === null) throw new Error(`unknown agent: ${agent.id}`);
  return view;
}

/** Start an agent that runs on pipes again, on its recorded session when it has one. */
export async function restartPipes(state: DaemonState, agent: HereAgent, adapter: AgentAdapter): Promise<FormRestart> {
  const view = viewOf(state, agent);
  if (view.form === null) throw new Error(`${view.name} records no form to restart in`);
  const sessionId = selectAgentStatus(state.directory, agent.id)?.sessionId ?? null;
  const opts = restartOpts(state, adapter, agent, view, view.form);
  if (sessionId !== null) {
    const role = formRole(adapter, view.form);
    if (role?.stdio === "pipes") await requireReopen(state, view, adapter, view.form, role.driver);
  }
  await swapProcess(state, agent, null, () => startSessionAgent(state, adapter, opts, sessionId, "existing-agent"));
  return { awaitBridge: false };
}

/** The session and role a switch to `form` rests on, or the first refusal. Nothing of the
 *  running agent is ended here. */
async function planSwitch(state: DaemonState, view: AgentView, adapter: AgentAdapter, form: FormId): Promise<{ readonly target: FormRole; readonly sessionId: string }> {
  const target = formRole(adapter, form);
  if (target === null) throw new Error(`harness ${adapter.id} has no ${form} form`);
  const backendId = view.environment.plexer;
  const offers = backendId === null ? undefined : getBackend(backendId)?.offers;
  if (offers === undefined || !offersForm(offers, form)) {
    throw new Error(`cannot switch ${view.name} to ${form}: its backend ${backendId ?? "none"} does not run that form`);
  }
  const sessionId = selectAgentStatus(state.directory, view.id)?.sessionId ?? null;
  if (sessionId === null) throw new Error(`cannot switch ${view.name} to ${form}: no session id is recorded`);
  // The orchd-held side of the switch says whether the harness's terminal program reads its sessions.
  const held = target.stdio === "pipes" ? target.driver : view.form === null ? null : sessionDriver(adapter, view.form);
  if (held?.sharesSessions !== true) throw new Error(`cannot switch ${view.name} to ${form}: the ${adapter.id} binding does not share sessions with its TUI`);
  if (target.stdio === "pipes") {
    await requireReopen(state, view, adapter, form, target.driver);
  }
  return { target, sessionId };
}

/** Relaunch an agent in another form, on its recorded session. */
export async function switchForm(state: DaemonState, agent: HereAgent, adapter: AgentAdapter, form: FormId): Promise<FormRestart> {
  const view = viewOf(state, agent);
  const opts = restartOpts(state, adapter, agent, view, form);
  const { target, sessionId } = await planSwitch(state, view, adapter, form);
  switch (target.stdio) {
    case "pipes":
      await swapProcess(state, agent, form, () => startSessionAgent(state, adapter, opts, sessionId, "existing-agent"));
      return { awaitBridge: false };
    case "terminal": {
      if (target.attach !== null) {
        const attach = target.attach;
        await swapProcess(state, agent, form, () => startAttachedTerminal(state, adapter, attach, opts, sessionId, "existing-agent"));
        return { awaitBridge: false };
      }
      const [file, ...args] = target.role.argv(opts, sessionId);
      if (file === undefined) throw new Error(`harness ${adapter.id} gave an empty resume command`);
      const program: HeldProgram = { file, args };
      await swapProcess(state, agent, form, () => startHeldAgent(state.held, adapter, opts, "existing-agent", program));
      return { awaitBridge: adapter.bridge !== null || adapter.hooks !== null };
    }
    default: {
      const exhaustive: never = target;
      throw new Error(`unknown form role ${String(exhaustive)}`);
    }
  }
}
