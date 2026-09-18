// The one handler table orchd serves: every RPC method, bound to one daemon state.
// It lives apart from the boot so a test can serve the real daemon in-process.
import { bootCodeHash, startedAt, fleetStatus } from "../state.ts";
import type { DaemonState } from "../state.ts";
import { answer, dispatch, message, steer } from "./write.ts";
import { applyLifecycle, closeAgent, enqueue, listPendingQuestions, reclaim, recordAgentQuestion, registerAgent, setHandle, setModel, spawnHeadless } from "./lifecycle.ts";
import { adopt, detach, reap, reapCandidateList, rename } from "./lease.ts";
import { clearSubjectHome, createSpace, deleteSpace, recordSubjectHome, renameSpace, spaceListing, spaceListings, subjectHome } from "./space.ts";
import { admitHome, decideGrant, listGrants } from "./grant.ts";
import { cancelQueued, editQueued, intakeQueued, listQueued, reapQueued, resolveAgentTarget, takeOnQueued } from "./queue.ts";
import { cleanStore } from "./clean.ts";
import { agentStatusOf, capacityOf, fleetSnapshot, processLive, runOf, runsOf } from "./fleet.ts";
import { resolveLifecycleEntity, resolveTargetEntity } from "./resolve.ts";
import { closeTargets } from "./close.ts";
import { callerSelf } from "./self.ts";
import { ownedAgents } from "./owned.ts";
import { reexecSelf } from "../../client/process.ts";
import { emitAndNotify } from "../events.ts";
import { acceptResultReport, acceptStatusReport } from "../status-report.ts";
import { insertControlOutcome } from "../../../store/control-outcome-rows.ts";
import { appendOutcome } from "../../../presence/history.ts";
import { settleControlOutcome } from "../../../control/outcome.ts";
import { acknowledgeDelivery } from "../../../control/ack.ts";
import type { ControlOutcomeReport } from "../../../types/agent.ts";
import type { RpcHandlers } from "../../../types/daemon.ts";
import type { ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage, markOutboxDelivered } from "../../../store/outbox-rows.ts";
import { activePaneHud } from "../../../backends/hud.ts";
import { peerView } from "../peer-view.ts";
import { governed } from "../governance.ts";
import type { PaneLabels } from "../../../types/plexer.ts";

export function rpcHandlers(state: DaemonState): RpcHandlers {
  const directory = state.directory;
  const services = state.services;
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
      if (newState === "asking") {
        const composed: NotifyEvent = { ...event, type: "asking", newState: "asking", askCount: 1, gaveUp: false };
        activePaneHud(event.key, directory).notify(composed);
        return { ok: true };
      }
      const composed: NotifyEvent = { ...event, type: "transition", newState };
      activePaneHud(event.key, directory).notify(composed);
      return { ok: true };
    },
    "report-status": (params) => {
      const result = acceptStatusReport(directory, params.key, params.status, (event) => emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings, Date.now(), services.logger));
      state.wake.wake();
      return result;
    },
    "report-result": (params) => {
      const result = acceptResultReport(directory, params.key, params.result);
      state.wake.wake();
      return result;
    },
    status: () => fleetStatus(state),
    attach: (params) => {
      const key = params.key;
      return { attached: true, open: selectOpenOutboxForTarget(directory, key).length };
    },
    dispatch: governed(state, (params) => dispatch(state, params)),
    enqueue: (params) => enqueue(state, params),
    steer: governed(state, (params) => steer(state, params)),
    message: governed(state, (params) => message(state, params)),
    "spawn-headless": governed(state, (params) => spawnHeadless(state, params)),
    "set-model": governed(state, (params) => setModel(state, params)),
    lifecycle: governed(state, (params) => applyLifecycle(state, params)),
    "agent-closed": governed(state, (params) => {
      const result = closeAgent(state, params);
      state.wake.wake();
      return result;
    }),
    "register-agent": governed(state, (params) => registerAgent(directory, params)),
    detach: governed(state, (params) => detach(state, params)),
    adopt: governed(state, (params) => adopt(state, params)),
    rename: governed(state, (params) => rename(state, params)),
    reap: governed(state, (params) => reap(state, params)),
    "reap-candidates": governed(state, (params) => reapCandidateList(state, params)),
    reclaim: governed(state, (params) => reclaim(directory, params)),
    "set-handle": governed(state, (params) => setHandle(directory, params)),
    spaces: (params) => spaceListings(directory, params),
    space: (params) => spaceListing(directory, params),
    "space-create": governed(state, (params) => createSpace(directory, params)),
    "space-rename": governed(state, (params) => renameSpace(directory, params)),
    "space-delete": governed(state, (params) => deleteSpace(directory, params)),
    home: (params) => subjectHome(directory, params),
    "record-home": governed(state, (params) => recordSubjectHome(directory, params)),
    "clear-home": governed(state, (params) => clearSubjectHome(directory, params)),
    grants: () => listGrants(directory),
    grant: governed(state, (params) => decideGrant(directory, params)),
    "admit-home": governed(state, (params) => admitHome(directory, params)),
    "resolve-agent": (params) => resolveAgentTarget(directory, params),
    "queue-list": (params) => listQueued(directory, params),
    "queue-cancel": governed(state, (params) => cancelQueued(directory, params)),
    "queue-edit": governed(state, (params) => editQueued(directory, params)),
    "queue-take-on": governed(state, (params) => takeOnQueued(directory, params)),
    "queue-reap": governed(state, (params) => reapQueued(directory, params)),
    "queue-intake": governed(state, (params) => intakeQueued(directory, params)),
    clean: governed(state, (params) => cleanStore(directory, params)),
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
    question: (params) => recordAgentQuestion(directory, params),
    questions: (params) => listPendingQuestions(directory, params),
    answer: governed(state, (params) => {
      const result = answer(state, params);
      state.wake.wake();
      return result;
    }),
    ack: (params) => {
      const id = params.id;
      const row = selectOutboxMessage(directory, id);
      markOutboxDelivered(directory, id);
      if (row === undefined) services.logger.forCorrelation(id).debug("dispatch.acked", { target: null });
      else services.logger.forCorrelation(id).info("dispatch.acked", { target: row.target });
      acknowledgeDelivery(id);
      state.wake.wake();
      return { ok: true };
    },
    "control-outcome": (params) => {
      const report: ControlOutcomeReport = {
        id: params.id,
        key: params.key,
        command: params.command,
        requested: params.requested ?? {},
        ...(params.applied === undefined ? {} : { applied: params.applied }),
        ...(params.error === undefined ? {} : { error: params.error }),
      };
      insertControlOutcome(directory, {
        id: report.id,
        agentId: report.key,
        command: report.command,
        requested: report.requested,
        settledAt: Date.now(),
        ...(params.error === undefined ? {} : { error: params.error }),
      });
      appendOutcome(report.key, directory, { ts: Date.now(), ...report });
      settleControlOutcome(report);
      return { ok: true };
    },
    reload: () => {
      setTimeout(() => {
        void state.server?.close().then(() => reexecSelf(directory));
      }, 10);
      return { ok: true };
    },
  };
}
