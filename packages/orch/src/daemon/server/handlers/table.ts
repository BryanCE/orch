// The one handler table orchd serves: every RPC method, bound to one daemon state.
// It lives apart from the boot so a test can serve the real daemon in-process.
import { bootCodeHash, startedAt, fleetStatus } from "../state.ts";
import type { DaemonState } from "../state.ts";
import { answer, dispatch, message, steer } from "./write.ts";
import { applyLifecycle, closeAgent, enqueue, listPendingQuestions, reclaim, recordAgentQuestion, registerAgent, setHandle, setModel, spawnHeadless } from "./lifecycle.ts";
import { adopt, detach, reap, reapCandidateList, rename } from "./lease.ts";
import { clearSubjectHome, createSpace, deleteSpace, recordSubjectHome, renameSpace, spaceListing, spaceListings, subjectHome } from "./space.ts";
import { reexecSelf } from "../../client/process.ts";
import { emitAndNotify } from "../events.ts";
import { acceptResultReport, acceptStatusReport } from "../status-report.ts";
import { insertControlOutcome } from "../../../store/control-outcome-rows.ts";
import { appendOutcome, ensurePresenceAgentDir } from "../../../presence/history.ts";
import { settleControlOutcome } from "../../../control/outcome.ts";
import { acknowledgeDelivery } from "../../../control/ack.ts";
import { decisionLogger } from "../../client/decision-log.ts";
import type { ControlOutcomeReport } from "../../../types/agent.ts";
import type { RpcHandlers } from "../../../types/daemon.ts";
import type { ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage, markOutboxDelivered } from "../../../store/outbox-rows.ts";
import { activePaneHud } from "../../../backends/hud.ts";
import { peerView } from "../peer-view.ts";
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
      const result = acceptStatusReport(directory, params.key, params.status, (event) => emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings));
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
    dispatch: (params) => dispatch(state, params),
    enqueue: (params) => enqueue(state, params),
    steer: (params) => steer(state, params),
    message: (params) => message(state, params),
    "spawn-headless": (params) => spawnHeadless(state, params),
    "set-model": (params) => setModel(state, params),
    lifecycle: (params) => applyLifecycle(state, params),
    "agent-closed": (params) => {
      const result = closeAgent(state, params);
      state.wake.wake();
      return result;
    },
    "register-agent": (params) => registerAgent(directory, params),
    detach: (params) => detach(state, params),
    adopt: (params) => adopt(state, params),
    rename: (params) => rename(state, params),
    reap: (params) => reap(state, params),
    "reap-candidates": (params) => reapCandidateList(state, params),
    reclaim: (params) => reclaim(directory, params),
    "set-handle": (params) => setHandle(directory, params),
    spaces: (params) => spaceListings(directory, params),
    space: (params) => spaceListing(directory, params),
    "space-create": (params) => createSpace(directory, params),
    "space-rename": (params) => renameSpace(directory, params),
    "space-delete": (params) => deleteSpace(directory, params),
    home: (params) => subjectHome(directory, params),
    "record-home": (params) => recordSubjectHome(directory, params),
    "clear-home": (params) => clearSubjectHome(directory, params),
    question: (params) => recordAgentQuestion(directory, params),
    questions: () => listPendingQuestions(directory),
    answer: (params) => {
      const result = answer(state, params);
      state.wake.wake();
      return result;
    },
    ack: (params) => {
      const id = params.id;
      const row = selectOutboxMessage(directory, id);
      markOutboxDelivered(directory, id);
      if (row === undefined) decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).debug("dispatch.acked", { target: null });
      else decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).info("dispatch.acked", { target: row.target });
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
      const presenceDirectory = ensurePresenceAgentDir(report.key, directory);
      if (presenceDirectory !== undefined) appendOutcome(presenceDirectory, { ts: Date.now(), ...report });
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
