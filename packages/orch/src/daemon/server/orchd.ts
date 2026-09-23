
import "../../store/suppress-sqlite-warning.ts";
import { bootCodeHash, idleShutdownDue, liveAgentCount, socketAnswers, touchOnCall } from "./state.ts";
import type { DaemonState } from "./state.ts";
import { outboxDeps } from "./handlers/write.ts";
import { rpcHandlers } from "./handlers/table.ts";
import {
  acquireDaemonLock,
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
import { startLivenessTick } from "./status-report.ts";
import { forgetCapacity } from "./capacity.ts";
import { errorMessage, errorTrace } from "../../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drainOutbox, redeliverOpenRows } from "./outbox.ts";
import { isAgentId } from "../../backends/identity.ts";
import { LAUNCH_ENV, readLaunchCredential } from "../../identity/launch.ts";
import { refreshAdapterCatalogues, warmAdapterCatalogues } from "../../adapters/registry.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import { createPanePainter } from "./pane-painter.ts";
import { createWakeSignal } from "./wake.ts";
import { closeAllStores, reportDrains, reportWriteFailures } from "../../store/connection.ts";
import { flushPresenceHistory, reportHistoryFailures } from "../../presence/history.ts";
import { observeToolExec } from "../../backends/tool-exec.ts";
import { startLoopWatchdog } from "./loop-watchdog.ts";

function logFatalAndExit(state: DaemonState, kind: string, error: unknown): void {
  state.fatalLogged = true;
  const message = errorMessage(error);
  state.services.logger.error("daemon.crashed", { kind, message, trace: errorTrace(error) });
  process.exit(1);
}

async function shutDown(state: DaemonState, reason: string): Promise<void> {
  const directory = state.directory;
  state.services.logger.info("daemon.stopping", { reason });
  if (state.outboxDrain) clearInterval(state.outboxDrain);
  state.livenessTick?.stop();
  state.loopWatchdog?.stop();
  state.settingsWatch?.stop();
  state.workController.abort();
  await state.workLoop;
  await state.server?.close();
  flushPresenceHistory();
  closeAllStores();
  releaseDaemonLock(directory);
  releaseDaemonRegistration();
  state.services.logger.info("daemon.stopped", { pid: process.pid });
  process.exit(0);
}

export async function startDaemon(): Promise<DaemonState> {
  const services = createServices({ proc: "orchd" });
  const directory = services.orchDir;
  const state: DaemonState = {
    services,
    directory,
    workController: new AbortController(),
    wake: createWakeSignal(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    livenessTick: undefined,
    loopWatchdog: undefined,
    settingsWatch: undefined,
    lastActivityAt: Date.now(),
    fatalLogged: false,
  };
  if (invokedAsMain()) {
    process.on("uncaughtException", (error: unknown) => logFatalAndExit(state, "uncaught exception", error));
    process.on("unhandledRejection", (reason: unknown) => logFatalAndExit(state, "unhandled rejection", reason));
    process.on("exit", (code) => { if (code !== 0 && !state.fatalLogged) state.services.logger.error("daemon.exited", { code }); });
  }
  reportWriteFailures((error) => state.services.logger.error("store.write-failed", { error: errorMessage(error) }));
  reportHistoryFailures((error) => state.services.logger.error("history.append-failed", { error: errorMessage(error) }));
  observeToolExec((exec) => {
    const fields = { binary: exec.binary, args: exec.args.join(" "), attempt: exec.attempt, ok: exec.ok, elapsedMs: exec.elapsedMs };
    const slowMs = state.services.settings.current().logging.slow_tool_ms;
    if (exec.elapsedMs >= slowMs) state.services.logger.warn("tool.slow", fields);
    else state.services.logger.debug("tool.exec", fields);
  });
  reportDrains((drain) => state.services.logger.trace("store.drained", { rows: drain.rows, batched: drain.batched, elapsedMs: drain.elapsedMs }));
  const launch = readLaunchCredential();
  if (launch.kind === "malformed") {
    state.services.logger.error("launch.invalid-key", { value: launch.value });
    throw new Error(`${LAUNCH_ENV} is set but is not an agent id: ${JSON.stringify(launch.value)}`);
  }
  const answers = await socketAnswers(directory);
  const registration = acquireDaemonRegistration(directory);
  if (!registration.acquired) {
    const live = registration.registration;
    // The refused daemon exits silently, so its log line is the only record of
    // why: name the live one the same way the CLI's refusal does.
    state.services.logger.warn("daemon.refused", { reason: live ? daemonStartRefusal(live) : "machine registration", pid: live?.pid ?? null, socket: live?.socket ?? null });
    return state;
  }
  if (!acquireDaemonLock(directory, () => answers)) {
    releaseDaemonRegistration();
    state.services.logger.warn("daemon.refused", { reason: "backing store lock" });
    return state;
  }

  try {
    const settings = services.settings.current();
    services.logger.setLevel(logLevelFor(services.settings.current()));
    const tcpPort = settings.daemon.tcp_port;
    state.server = await startRpcServer(directory, touchOnCall(state, rpcHandlers(state)), {
      holdsDaemonLock: true,
      logger: services.logger,
      tcpPort,
      onTcpError: (error, port) => state.services.logger.error("daemon.tcp-listener-failed", { port, error: errorMessage(error) }),
      onBridgeAttached: (key) => {
        void redeliverOpenRows(directory, key, outboxDeps(state)).catch((error: unknown) => {
          state.services.logger.error("outbox.redeliver-failed", { target: key, error: errorMessage(error) });
        });
        state.wake.wake();
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
  state.settingsWatch = watchSettings(services.settings, {
    load: () => {
      const next = services.settings.reload();
      if (next === null) throw new Error(absentSettingsMessage(services.settings.file));
      return next;
    },
    onChange: (settings) => {
      forgetCapacity(directory);
      services.logger.setLevel(logLevelFor(settings));
      // A settings change reaches the next spawn, never a running agent: re-asking the
      // harnesses is what lets a newly named model be offered and admitted.
      if (settingsLoaded) {
        state.services.logger.info("config.reloaded");
        void refreshAdapterCatalogues(state.services.models);
      }
      settingsLoaded = true;
    },
    onWarn: (message) => state.services.logger.warn("config.warning", { message }),
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
    emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings, Date.now(), services.logger);
    state.wake.wake();
  };
  const livenessPollMs = services.settings.current().daemon.liveness_poll_ms;
  state.livenessTick = startLivenessTick(directory, livenessPollMs, publishPresenceEvent, services.logger);
  const logging = services.settings.current().logging;
  state.loopWatchdog = startLoopWatchdog(services.logger, logging.stall_ms, logging.stall_poll_ms);
  state.workLoopRunning = true;
  state.workLoop = runWorkLoop({
    orchDir: directory,
    wake: state.wake,
    tickMs: services.settings.current().daemon.work_tick_ms,
    settings: services.settings,
    models: services.models,
    signal: state.workController.signal,
    continuous: true,
    logger: services.logger,
    onEvent: (event) => { state.lastActivityAt = Date.now(); emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings, Date.now(), services.logger); },
  }).finally(() => { state.workLoopRunning = false; });

  // The outbox drains on orchd's OWN clock. Piggy-backing it on `acceptWrite`
  // meant a queued write was only ever retried when some other caller dispatched,
  // and that caller then waited out the whole backlog before its own write went.
  state.outboxDrain = setInterval(() => {
    void drainOutbox(directory, outboxDeps(state)).catch((error: unknown) => {
      state.services.logger.error("outbox.drain-failed", { error: errorMessage(error) });
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
  state.services.logger.info("daemon.started", { pid: process.pid, hash: bootCodeHash, transport: state.server?.transport ?? "unknown", tcp: tcp ?? null });
  return state;
}

function invokedAsMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return realpathSync(arg) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (invokedAsMain()) void startDaemon();
