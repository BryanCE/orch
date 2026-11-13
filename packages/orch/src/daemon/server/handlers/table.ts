// The one handler table orchd serves: every RPC method, bound to one daemon state.
// It lives apart from the boot so a test can serve the real daemon in-process.
import { bootCodeHash, startedAt } from "../state.ts";
import type { DaemonState } from "../state.ts";
import { agentView } from "../../../store/agent-view.ts";
import { FORM_SESSION_OWNER } from "../../../types/form.ts";
import type { OrchDir } from "../../../types/core.ts";
import { answer, dispatch, message, steer } from "./write.ts";
import { clearSession, enqueue, listPendingQuestions, reclaim, recordAgentQuestion, moveHandle, setModel, spawnHeadless } from "./lifecycle.ts";
import { adopt, detach, orphans, reap, reapCandidateList, rename } from "./lease.ts";
import { createSpace, deleteSpace, focusSpace, renameSpace, spaceListings } from "./space.ts";
import { decideGrant, listGrants } from "./grant.ts";
import { agentReaderOf, checkHost, forgetHost, readAgentAnywhere } from "./host.ts";
import { abortAnywhere, closeAnywhere, peerDrive } from "./drive.ts";
import { paneAnywhere } from "./pane.ts";
import { adoptAgent } from "./adopt.ts";
import { applyLifecycle } from "./relaunch.ts";
import { waitAnywhere } from "./wait.ts";
import { lockCommand, unlockCommand } from "./command-lock.ts";
import { cancelQueued, editQueued, intakeQueued, listQueued, reapQueued, takeOnQueued } from "./queue.ts";
import { cleanStore } from "./clean.ts";
import { endStreams } from "./streams.ts";
import { authorizeHostHandler, hostKey, scanHost, trustHost } from "./host-add.ts";
import { agentWorktree, peerWorktreeHandler, reviewsOf } from "./review.ts";
import { agentStatusOf, capacityOf, fleetSnapshot, processLive, runOf, runsOf } from "./fleet.ts";
import { resolveLifecycleEntity, resolveTargetEntity } from "./resolve.ts";
import { closeTargets } from "./close.ts";
import { callerSelf } from "./self.ts";
import { peerStatus, statusAnywhere } from "./status.ts";
import { ownedAgents } from "./owned.ts";
import { harnessCatalogues, refreshCatalogues, syncHarnessFiles } from "./harness.ts";
import { admitModelFor } from "../spawn/models.ts";
import { spawnAgents, tileAgent } from "../spawn/index.ts";
import { tabVerb } from "../tabs.ts";
import { reexecSelf } from "../ownership.ts";
import { publishFromOrchd } from "../events.ts";
import { acceptPromptReport, acceptResultReport, acceptStatusReport } from "../status-report.ts";
import { heldAgentHost } from "../status-events.ts";
import { endHeldAgents } from "../held-ending.ts";
import { recordControlOutcome } from "../control-outcomes.ts";
import { ackOutboxRow } from "../outbox.ts";
import type { ControlOutcomeReport } from "../../../types/agent.ts";
import type { RpcHandlers, RpcRequestContext } from "../../../types/daemon.ts";
import { RPC_RESULTS, type ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import { selectOpenOutboxForTarget } from "../../../store/outbox-rows.ts";
import { activePaneHud } from "../../../backends/hud.ts";
import { peerView } from "../peer-view.ts";
import { governed } from "../governance.ts";
import type { PaneLabels } from "../../../types/plexer.ts";
import { peerHandlers } from "./peer.ts";
import { screenHandlers } from "./screen.ts";
import { machineHandlers } from "./machine.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { hostedPid } from "../../../local-process.ts";

/** One handler that wakes the work loop once it has run. */
function waking<P, R>(state: DaemonState, handler: (params: P) => R): (params: P) => R {
  return (params) => {
    const result = handler(params);
    state.wake.wake();
    return result;
  };
}

/** Whether a harness report about `key` is ignored: orchd owns the state of an agent whose form it reports itself. */
function harnessReportIgnored(directory: OrchDir, key: string): boolean {
  const form = agentView(directory, key)?.form ?? null;
  return form !== null && FORM_SESSION_OWNER[form] === "orchd";
}

/** The id a peer's request is remembered under: one host's ids never meet another's. */
function receiptId(context: RpcRequestContext): string | null {
  return context.peer === undefined || context.once === undefined ? null : `${context.peer}:${context.once}`;
}

export function rpcHandlers(state: DaemonState): RpcHandlers {
  const directory = state.directory;
  const services = state.services;
  const publish = (event: NotifyEvent): void => { publishFromOrchd(state, event); };
  return {
    "daemon-status": () => ({
      pid: process.pid,
      startedAt: startedAt.toISOString(),
      uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      codeHash: bootCodeHash,
      socket: state.server?.transport ?? "unknown",
      tcpEndpoint: state.server?.tcpEndpoint,
      subsystems: {
        workLoop: state.workLoopRunning ? "running" : "stopped",
        livenessTick: state.livenessTick ? "running" : "stopped",
        settingsWatch: state.settingsWatch ? "running" : "stopped",
      },
      held: state.held.count(),
    }),
    "subscribe-events": () => ({ subscribed: true }),
    // A bundled harness links no plexer, so the two things it used to ask its
    // pane directly it now asks orchd, the only process that talks to one.
    "environment-labels": async (params) => {
      const id = params.id;
      let reported: PaneLabels | null = null;
      await activePaneHud(id, directory).readLabels((labels) => { reported = labels; });
      return reported;
    },
    "peer-view": (params) => {
      const keys = params.keys ?? [];
      return peerView(directory, params.ownKey, keys, params.allSpaces === true, params.projectRoot);
    },
    notify: (event: ParamsOf<"notify">) => {
      const { newState } = event;
      const display = services.settings.current().notification;
      if (newState === "asking") {
        const composed: NotifyEvent = { ...event, host: heldAgentHost(directory, event.key), type: "asking", newState: "asking", askCount: 1, gaveUp: false };
        activePaneHud(event.key, directory).notify(composed, display);
        return { ok: true };
      }
      const composed: NotifyEvent = { ...event, host: heldAgentHost(directory, event.key), type: "transition", newState };
      activePaneHud(event.key, directory).notify(composed, display);
      return { ok: true };
    },
    "report-status": waking(state, (params) => harnessReportIgnored(directory, params.key) ? { ok: true } : acceptStatusReport(directory, params.key, params.status, publish)),
    "report-result": waking(state, (params) => harnessReportIgnored(directory, params.key) ? { ok: true } : acceptResultReport(directory, params.key, params.result)),
    "report-prompt": waking(state, (params) => acceptPromptReport(directory, params.key, params.prompt, publish)),
    "command-lock": ({ pid, ...params }) => lockCommand(directory, services.settings.current(), { ...params, process: hostedPid(pid) }, publish),
    "command-unlock": (params) => unlockCommand(directory, hostedPid(params.pid)),
    status: (params) => statusAnywhere(state, params),
    "peer-status": (_params, _emit, context) => peerStatus(state, context),
    attach: (params) => {
      const key = params.key;
      return { attached: true, open: selectOpenOutboxForTarget(directory, key).length };
    },
    dispatch: governed(state, (params) => dispatch(state, params)),
    enqueue: (params) => enqueue(state, params),
    steer: governed(state, (params) => steer(state, params)),
    message: governed(state, (params) => message(state, params)),
    "spawn-headless": governed(state, (params, _emit, context) => spawnHeadless(state, params, context.peer)),
    spawn: governed(state, (params) => spawnAgents(state, params)),
    tile: governed(state, (params) => tileAgent(state, params)),
    tab: governed(state, (params) => tabVerb(state, params)),
    "set-model": governed(state, (params) => setModel(state, params)),
    lifecycle: governed(state, (params) => applyLifecycle(state, params)),
    "clear-session": governed(state, (params) => clearSession(state, params)),
    abort: governed(state, (params) => abortAnywhere(state, params)),
    "agent-closed": governed(state, async (params) => {
      const closed = await closeAnywhere(state, params);
      state.wake.wake();
      return closed;
    }),
    "adopt-agent": governed(state, (params) => adoptAgent(state, params)),
    detach: governed(state, (params) => detach(state, params)),
    adopt: governed(state, (params) => adopt(state, params)),
    rename: governed(state, (params) => rename(state, params)),
    reap: governed(state, (params) => reap(state, params)),
    "reap-candidates": governed(state, (params) => reapCandidateList(state, params)),
    reclaim: governed(state, (params) => reclaim(directory, params)),
    "set-handle": governed(state, (params) => moveHandle(directory, params)),
    spaces: () => spaceListings(state),
    "space-focus": (params) => focusSpace(state, params),
    "space-create": governed(state, (params) => createSpace(state, params)),
    "space-rename": governed(state, (params) => renameSpace(state, params)),
    "space-delete": governed(state, (params) => deleteSpace(state, params)),
    grants: () => listGrants(directory),
    hosts: () => ({ hosts: state.hosts.views() }),
    "host-check": (params) => checkHost(state, params),
    "host-forget": (params) => forgetHost(state, params),
    "host-scan": (params) => scanHost(state, params),
    "host-trust": (params) => trustHost(state, params),
    "host-key": (params) => hostKey(state, params),
    "host-authorize": authorizeHostHandler(state),
    "agent-read": (params) => readAgentAnywhere(state, params),
    "agent-pane": governed(state, (params) => paneAnywhere(state, params)),
    "agent-wait": (params) => waitAnywhere(state, params),
    "end-streams": () => endStreams(state),
    reviews: () => reviewsOf(state),
    "agent-worktree": governed(state, (params) => agentWorktree(state, params)),
    "peer-worktree": async (params, emit, context) => {
      const act = peerWorktreeHandler(state);
      const id = receiptId(context);
      if (id === null) return await act(params, emit, context);
      return RPC_RESULTS["peer-worktree"].parse(await state.receipts.once(id, async () => await act(params, emit, context)));
    },
    "settings-reload": () => {
      state.settingsWatch?.reload();
      return { ok: true };
    },
    "harness-catalogues": (params) => harnessCatalogues(state, params),
    "catalogue-refresh": () => refreshCatalogues(state),
    "admit-model": (params) => admitModelFor(state, params),
    "harness-files-sync": () => syncHarnessFiles(state),
    ...machineHandlers(state),
    ...screenHandlers(state, () => state.held),
    ...peerHandlers(hostIdentity, agentReaderOf(state)),
    "peer-drive": async (params, _emit, context) => {
      const id = receiptId(context);
      if (id === null) return await peerDrive(state, params, context);
      return RPC_RESULTS["peer-drive"].parse(await state.receipts.once(id, () => peerDrive(state, params, context)));
    },
    grant: governed(state, (params) => decideGrant(directory, params)),
    "queue-list": (params) => listQueued(directory, params),
    "queue-cancel": governed(state, (params) => cancelQueued(directory, params)),
    "queue-edit": governed(state, (params) => editQueued(directory, params)),
    "queue-take-on": governed(state, (params) => takeOnQueued(directory, params)),
    "queue-reap": governed(state, (params) => reapQueued(directory, params)),
    "queue-intake": governed(state, (params) => intakeQueued(directory, params)),
    clean: governed(state, (params) => cleanStore(directory, services.settings.current().worktrees, services.logger, params)),
    fleet: (params) => fleetSnapshot(state, params),
    capacity: (params) => capacityOf(state, params),
    runs: (params) => runsOf(state, params),
    run: (params) => runOf(directory, params),
    "agent-status": (params) => agentStatusOf(directory, params),
    "process-live": (params) => processLive(directory, params),
    "resolve-target": (params) => resolveTargetEntity(state, params),
    self: (params) => callerSelf(directory, params),
    "resolve-lifecycle": (params) => resolveLifecycleEntity(state, params),
    "close-targets": (params) => closeTargets(state, params),
    "owned-agents": (params) => ownedAgents(state, params),
    orphans: () => orphans(state),
    question: (params) => recordAgentQuestion(directory, params),
    questions: (params) => listPendingQuestions(state, params),
    answer: governed(state, waking(state, (params) => answer(state, params))),
    ack: (params) => ackOutboxRow(state, params.id),
    "control-outcome": (params) => {
      const report: ControlOutcomeReport = {
        id: params.id,
        key: params.key,
        command: params.command,
        requested: params.requested ?? {},
        ...(params.applied === undefined ? {} : { applied: params.applied }),
        ...(params.error === undefined ? {} : { error: params.error }),
      };
      recordControlOutcome(directory, report);
      return { ok: true };
    },
    reload: () => {
      setTimeout(() => {
        // The new process holds none of these PTYs: each agent in one ends, saying why.
        endHeldAgents(state, "restarted");
        void state.server?.close().then(() => reexecSelf(directory));
      }, 10);
      return { ok: true };
    },
  };
}
