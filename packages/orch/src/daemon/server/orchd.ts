import type { OrchDir } from "../../types/core.ts";
import type { LogLevel, Logger } from "../../types/core.ts";
import "../../store/suppress-sqlite-warning.ts";
import { bootCodeHash, startedAt, fleetStatus, idleShutdownDue, liveAgentCount, socketAnswers, touchOnCall } from "./state.ts";
import type { DaemonState } from "./state.ts";
import { answer, dispatch, message, outboxDeps, steer } from "./handlers/write.ts";
import { applyLifecycle, listPendingQuestions, publishClosedAgent, recordAgentQuestion, setModel, spawnHeadless } from "./handlers/lifecycle.ts";
import { repinLiveFleet } from "./repin.ts";
import {
  acquireDaemonLock,
  reexecSelf,
  releaseDaemonLock,
  acquireDaemonRegistration,
  daemonStartRefusal,
  releaseDaemonRegistration,
} from "../client/process.ts";
import { startRpcServer } from "./rpc.ts";
import { absentSettingsMessage, logLevelFor } from "../../settings/read.ts";
import { createServices } from "../../services.ts";
import { watchSettings } from "../../settings/watch.ts";
import { runWorkLoop } from "./work-loop.ts";
import { emitAndNotify } from "./events.ts";
import { acceptResultReport, acceptStatusReport, startLivenessTick } from "./status-report.ts";
import { errorMessage, errorTrace } from "../../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { insertControlOutcome } from "../../store/control-outcome-rows.ts";
import { appendOutcome, ensurePresenceAgentDir } from "../../presence/history.ts";
import { settleControlOutcome } from "../../control/outcome.ts";
import { acknowledgeDelivery } from "../../control/ack.ts";
import { drainOutbox, redeliverOpenRows } from "./outbox.ts";
import { isAgentId } from "../../backends/identity.ts";
import { LAUNCH_ENV, readLaunchCredential } from "../../identity/launch.ts";
import { deliverControl, resolveTargetAdapter } from "../../control/dispatch.ts";
import { warmAdapterCatalogues } from "../../adapters/registry.ts";
import { createLogger } from "../../log.ts";
import { daemonRuntimeFiles } from "../client/runtime-files.ts";
import { decisionLogger } from "../client/decision-log.ts";
import type { ControlOutcomeReport } from "../../types/agent.ts";
import type { RpcHandlers } from "../../types/daemon.ts";
import type { ParamsOf } from "../client/protocol.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import { selectOpenOutboxForTarget, selectOutboxMessage, markOutboxDelivered } from "../../store/outbox-rows.ts";
import { createPanePainter } from "./pane-painter.ts";
import { activePaneHud } from "../../backends/hud.ts";
import { peerView } from "./peer-view.ts";
import { liveAgentViews } from "../../store/agent-view.ts";
import type { PaneLabels } from "../../types/plexer.ts";

/** `level` is an explicit override (a flag); everything else resolves the same
 *  way every other logger does, through `logLevelFor`. */
function loggerFor(directory: OrchDir, level?: LogLevel): Logger {
  const envLevel = process.env.ORCH_LOG_LEVEL;
  if (envLevel === undefined && level !== undefined) {
    return createLogger({ file: daemonRuntimeFiles(directory).log, level });
  }
  return createLogger({ file: daemonRuntimeFiles(directory).log, level: logLevelFor(null) });
}

function logFatalAndExit(state: DaemonState, kind: string, error: unknown): void {
  state.fatalLogged = true;
  const message = errorMessage(error);
  state.logger?.error("daemon.crashed", { kind, message, trace: errorTrace(error) });
  process.exit(1);
}

async function shutDown(state: DaemonState, reason: string): Promise<void> {
  const directory = state.directory;
  state.logger?.info("daemon.stopping", { reason });
  if (state.outboxDrain) clearInterval(state.outboxDrain);
  state.livenessTick?.stop();
  state.settingsWatch?.stop();
  state.workController.abort();
  await state.workLoop;
  await state.server?.close();
  releaseDaemonLock(directory);
  releaseDaemonRegistration();
  state.logger?.info("daemon.stopped", { pid: process.pid });
  process.exit(0);
}

export async function startDaemon(): Promise<DaemonState> {
  const services = createServices();
  const directory = services.orchDir;
  const state: DaemonState = {
    services,
    directory,
    workController: new AbortController(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    livenessTick: undefined,
    settingsWatch: undefined,
    lastActivityAt: Date.now(),
    logger: undefined,
    fatalLogged: false,
  };
  if (invokedAsMain()) {
    process.on("uncaughtException", (error: unknown) => logFatalAndExit(state, "uncaught exception", error));
    process.on("unhandledRejection", (reason: unknown) => logFatalAndExit(state, "unhandled rejection", reason));
    process.on("exit", (code) => { if (code !== 0 && !state.fatalLogged) state.logger?.error("daemon.exited", { code }); });
  }
  state.logger = loggerFor(directory);
  const launch = readLaunchCredential();
  if (launch.kind === "malformed") {
    state.logger.error("launch.invalid-key", { value: launch.value });
    throw new Error(`${LAUNCH_ENV} is set but is not an agent id: ${JSON.stringify(launch.value)}`);
  }
  const answers = await socketAnswers(directory);
  const registration = acquireDaemonRegistration(directory);
  if (!registration.acquired) {
    const live = registration.registration;
    // The refused daemon exits silently, so its log line is the only record of
    // why: name the live one the same way the CLI's refusal does.
    state.logger?.warn("daemon.refused", { reason: live ? daemonStartRefusal(live) : "machine registration", pid: live?.pid ?? null, socket: live?.socket ?? null });
    return state;
  }
  if (!acquireDaemonLock(directory, () => answers)) {
    releaseDaemonRegistration();
    state.logger?.warn("daemon.refused", { reason: "backing store lock" });
    return state;
  }

  try {
    const settings = services.settings.current();
    state.logger = loggerFor(directory, services.settings.current().logging?.level);
    const tcpPort = settings.daemon.tcp_port;
    const handlers: RpcHandlers = {
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
      "report-status": (params) => acceptStatusReport(directory, params.key, params.status, (event) => emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings)),
      "report-result": (params) => acceptResultReport(directory, params.key, params.result),
      status: () => fleetStatus(state),
      attach: (params) => {
        const key = params.key;
        return { attached: true, open: selectOpenOutboxForTarget(directory, key).length };
      },
      dispatch: (params) => dispatch(state, params),
      steer: (params) => steer(state, params),
      message: (params) => message(state, params),
      "spawn-headless": (params) => spawnHeadless(state, params),
      "set-model": (params) => setModel(state, params),
      lifecycle: (params) => applyLifecycle(state, params),
      "agent-closed": (params) => publishClosedAgent(state, params),
      question: (params) => recordAgentQuestion(directory, params),
      questions: () => listPendingQuestions(directory),
      answer: (params) => answer(state, params),
      ack: (params) => {
        const id = params.id;
        const row = selectOutboxMessage(directory, id);
        markOutboxDelivered(directory, id);
        if (row === undefined) decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).debug("dispatch.acked", { target: null });
        else decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).info("dispatch.acked", { target: row.target });
        acknowledgeDelivery(id);
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
    state.server = await startRpcServer(directory, touchOnCall(state, handlers), {
      holdsDaemonLock: true,
      tcpPort,
      onTcpError: (error, port) => state.logger?.error("daemon.tcp-listener-failed", { port, error: errorMessage(error) }),
      onBridgeAttached: (key) => {
        void redeliverOpenRows(directory, key, outboxDeps(state)).catch((error: unknown) => {
          state.logger?.error("outbox.redeliver-failed", { target: key, error: errorMessage(error) });
        });
      },
    });
  } catch (error) {
    releaseDaemonLock(directory);
    releaseDaemonRegistration();
    throw error;
  }

  // orchd gates every spawn on the catalogues; reading them at boot keeps that gate off the
  // harness binaries, and re-stamps whatever went stale while no daemon was running.
  warmAdapterCatalogues(state.services.models);

  let settingsLoaded = false;
  let previousSettings = services.settings.currentOrNull();
  state.settingsWatch = watchSettings(services.settings, {
    load: () => {
      const next = services.settings.reload();
      if (next === null) throw new Error(absentSettingsMessage(services.settings.file));
      return next;
    },
    onChange: (settings) => {
      if (settingsLoaded) state.logger?.info("config.reloaded");
      settingsLoaded = true;
      if (previousSettings !== null && state.logger !== undefined) {
        void repinLiveFleet({
          previousSettings,
          settings,
          listLiveAgents: () => liveAgentViews(directory),
          resolveAdapter: (agent) => resolveTargetAdapter(directory, agent.id),
          deliver: (target, action) => deliverControl(directory, settings, state.services.models, target, action),
          logger: state.logger,
        }).catch((error: unknown) => {
          state.logger?.warn("settings.repin.failed", { error: errorMessage(error) });
        });
      }
      previousSettings = settings;
    },
    onWarn: (message) => state.logger?.warn("config.warning", { message }),
  });
  const paintPane = createPanePainter(directory);
  const publishPresenceEvent = (event: NotifyEvent): void => {
    state.lastActivityAt = Date.now();
    // The agent no longer paints its own pane: its bundle carries no plexer.
    const painted = isAgentId(event.key) ? event.key : undefined;
    if (painted !== undefined) {
      switch (event.type) {
        case "transition":
        case "asking":
          paintPane(painted, { state: event.newState, cost: event.cost ?? 0, ...(event.task === undefined ? {} : { task: event.task }) });
          break;
        case "closed":
          paintPane(painted, { state: "closed", cost: 0 });
          break;
        case "message":
        case "task":
          break;
        default: {
          const exhaustive: never = event;
          return exhaustive;
        }
      }
    }
    emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings);
  };
  state.livenessTick = startLivenessTick(directory, services.settings.current().daemon.liveness_poll_ms, publishPresenceEvent);
  state.workLoopRunning = true;
  state.workLoop = runWorkLoop({
    orchDir: directory,
    pollIntervalMs: 500,
    settings: services.settings,
    models: services.models,
    signal: state.workController.signal,
    continuous: true,
    onEvent: (event) => { state.lastActivityAt = Date.now(); emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings); },
  }).finally(() => { state.workLoopRunning = false; });

  // The outbox drains on orchd's OWN clock. Piggy-backing it on `acceptWrite`
  // meant a queued write was only ever retried when some other caller dispatched,
  // and that caller then waited out the whole backlog before its own write went.
  state.outboxDrain = setInterval(() => {
    void drainOutbox(directory, outboxDeps(state)).catch((error: unknown) => {
      state.logger?.error("outbox.drain-failed", { error: errorMessage(error) });
    });
  }, services.settings.current().daemon.outbox_drain_ms);
  state.outboxDrain.unref?.();

  const idleCheck = setInterval(() => {
    const idleMinutes = services.settings.current().daemon.idle_shutdown_minutes;
    const liveAgents = liveAgentCount(directory);
    if (liveAgents > 0) state.lastActivityAt = Date.now();
    const msSinceActivity = Date.now() - state.lastActivityAt;
    const connections = (state.server?.subscriberCount() ?? 0) + (state.server?.attachedBridgeCount() ?? 0);
    if (!idleShutdownDue({ idleMinutes, liveAgents, connections, msSinceActivity })) return;
    clearInterval(idleCheck);
    void shutDown(state, `idle ${idleMinutes}m: no live agents, no connections`);
  }, 30_000);

  process.once("SIGTERM", () => void shutDown(state, "SIGTERM"));
  process.once("SIGINT", () => void shutDown(state, "SIGINT"));
  const tcp = state.server?.tcpEndpoint;
  state.logger?.info("daemon.started", { pid: process.pid, hash: bootCodeHash, transport: state.server?.transport ?? "unknown", tcp: tcp ?? null });
  return state;
}

function invokedAsMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return realpathSync(arg) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (invokedAsMain()) void startDaemon();
