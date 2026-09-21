import { errorMessage, packageManifest } from "../util.ts";
import { daemonEntrypoint, readDaemonCodeSkew } from "../daemon/client/process.ts";
import { cmdStatusVerb } from "./status/verb.ts";
import { cmdSpawn, cmdTile } from "./spawn/index.ts";
import { cmdAnswer, cmdBroadcast, cmdDispatch, cmdModel, cmdPipe, cmdSteer } from "./control.ts";
import { cmdRun, cmdWait } from "./lifecycle/index.ts";
import { cmdNew } from "./lifecycle/reset.ts";
import { cmdReload, cmdRestart } from "./lifecycle/reload.ts";
import { cmdRename } from "./lifecycle/rename.ts";
import { cmdAbort, cmdClose } from "./lifecycle/close.ts";
import { cmdFocus, cmdKeys, cmdMove, cmdPanes, cmdPeek, cmdTab, cmdTabs, cmdZoom } from "./panes.ts";
import { cmdSpace } from "./space.ts";
import { cmdQuestions, cmdResult, cmdSession, cmdTail } from "./results.ts";
import { cmdRuns } from "./runs.ts";
import { cmdEvents, cmdMonitor, cmdNotify } from "./events.ts";
import { cmdLogs } from "./logs.ts";
import { cmdReview } from "./review.ts";
import { cmdQueue } from "./queue.ts";
import { cmdClean } from "./clean.ts";
import { cmdGrant } from "./grant.ts";
import { cmdDaemon, cmdWork } from "./daemon.ts";
import { cmdSetup, runFirstTimeSetup, setupRequiredMessage } from "./setup.ts";
import { compositionUnrecorded } from "../setup/composition.ts";
import { cmdSettings } from "./settings.ts";
import { cmdModels } from "./models.ts";
import { cmdDoctor } from "./doctor.ts";
import { cmdDetach, cmdAdopt, cmdReap } from "./lease.ts";
import { COMMANDS, GLOBAL_FLAGS, commandSpec } from "./registry.ts";
import { renderMap, renderTopic } from "../cli/help.ts";
import { readHelpDoc } from "../cli/doc.ts";
import { die } from "./target.ts";
import { createServices } from "../services.ts";
import type { Services } from "../types/services.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

function usage() {
  process.stdout.write(renderMap(COMMANDS));
}

/** One command's help from its spec and its `help/<name>.md`, or null for a word no command owns. */
export function helpTopic(word: string): string | null {
  const spec = commandSpec(word);
  if (spec === undefined) return null;
  return renderTopic(spec, readHelpDoc(spec.name), GLOBAL_FLAGS);
}

const VERSION = packageManifest().version;

const STALE_GUARD_COMMANDS = new Set([
  "spawn", "dispatch", "steer", "answer", "close", "kill", "reset", "new", "reload", "restart",
  "queue", "work", "model", "broadcast", "detach", "adopt", "reap", "space",
]);

/** Refuse writes sent to a live daemon from a stale installed CLI. */
function preflightSkew(directory: OrchDir, argv: string[]): string[] {
  const staleOk = argv.includes("--stale-ok");
  const sanitized = argv.filter((arg) => arg !== "--stale-ok");
  const cmd = sanitized[0];
  const mutates = cmd === "queue"
    ? sanitized[1] === "add" || sanitized[1] === "cancel"
    : Boolean(cmd && STALE_GUARD_COMMANDS.has(cmd));
  if (!mutates || staleOk) return sanitized;
  const skew = readDaemonCodeSkew(directory, daemonEntrypoint());
  if (skew) {
    die(`Refusing orch ${cmd}: daemon hash=${skew.daemonHash} differs from installed hash=${skew.diskHash}; fix: orch daemon reload; override: --stale-ok`);
  }
  return sanitized;
}

/** Commands that must keep working before setup has recorded anything. `setup` records the
 * composition and `doctor` diagnoses an install that does not work yet - they are how a user
 * reaches a configured state, so neither may ever be refused for being unconfigured. `orch settings` is how a person repairs a settings.json that will not load, so the gate that reads settings.json can never be what stops them reaching it. */
function exemptFromSetupGate(cmd: string | undefined): boolean {
  return cmd === "setup" || cmd === "doctor" || cmd === "settings" || cmd === "status" || cmd === "help" || cmd === "-h" || cmd === "--help" || cmd === "version" || cmd === "-V" || cmd === "--version";
}

/** True on a clean slate: no selections recorded yet, a TTY to prompt on, and a command that needs them. */
export function needsFirstRunSetup(settings: OrchSettings | null, cmd: string | undefined): boolean {
  if (exemptFromSetupGate(cmd)) return false;
  if (!process.stdin.isTTY) return false;
  return compositionUnrecorded(settings);
}

/** `orch <cmd> -h|--help` and `orch help <cmd>` both name one command's topic. */
function requestedHelpTopic(cmd: string | undefined, rest: string[]): string | null {
  if (cmd === undefined) return null;
  if (rest[0] === "-h" || rest[0] === "--help") return helpTopic(cmd);
  if (cmd === "help" && rest[0] !== undefined) return helpTopic(rest[0]);
  return null;
}

type Handler = (services: Services, args: string[]) => void | Promise<void>;

/**
 * The CLI boundary: report a failure and set the process's exit code.
 *
 * `process.exitCode` rather than `process.exit()` so buffered stdout still
 * flushes and no work is severed mid-write; the process ends on its own once the
 * command unwinds. Every failure is logged here before it is rendered; refusals
 * and unexpected failures follow the same boundary behavior.
 */
function reportCommandFailure(logger: Logger, error: unknown): void {
  logger.error("command.failed", { error: errorMessage(error) });
  process.stdout.write(errorMessage(error) + "\n");
  process.exitCode = 1;
}

function dispatchAsync(logger: Logger, task: Promise<unknown>): void {
  void task.catch((error: unknown) => reportCommandFailure(logger, error));
}

export const commandHandlers: Record<string, Handler> = {
  status: cmdStatusVerb,
  events: cmdEvents,
  monitor: cmdMonitor,
  logs: (services, args) => cmdLogs(services, args),
  notify: cmdNotify,
  questions: cmdQuestions,
  runs: cmdRuns,
  queue: cmdQueue,
  daemon: cmdDaemon,
  doctor: cmdDoctor,
  work: cmdWork,
  review: cmdReview,
  answer: cmdAnswer,
  result: (services, args) => cmdResult(services, args),
  steer: cmdSteer,
  pipe: cmdPipe,
  broadcast: cmdBroadcast,
  tail: (services, args) => cmdTail(services, args),
  session: (services, args) => cmdSession(services, args),
  panes: (services, args) => cmdPanes(services, args),
  spawn: cmdSpawn,
  tile: cmdTile,
  run: cmdRun,
  model: cmdModel,
  models: (services, args) => cmdModels(services, args),
  wait: (services, args) => cmdWait(services, args),
  dispatch: cmdDispatch,
  reload: cmdReload,
  reset: cmdNew,
  new: cmdNew,
  restart: cmdRestart,
  rename: (services, args) => cmdRename(services, args),
  close: (services, args) => cmdClose(services, args),
  kill: (services, args) => cmdClose(services, args),
  detach: cmdDetach,
  adopt: cmdAdopt,
  reap: cmdReap,
  abort: cmdAbort,
  keys: (services, args) => cmdKeys(services, args),
  peek: (services, args) => cmdPeek(services, args),
  tabs: (services, args) => cmdTabs(services, args),
  tab: (services, args) => cmdTab(services, args),
  focus: (services, args) => cmdFocus(services, args),
  zoom: (services, args) => cmdZoom(services, args),
  move: (services, args) => cmdMove(services, args),
  space: cmdSpace,
  clean: (services, args) => cmdClean(services, args),
  grant: cmdGrant,
  settings: cmdSettings,
  setup: cmdSetup,
  "--version": (_services, _args) => { void process.stdout.write(`orch ${VERSION}\n`); },
  "-V": (_services, _args) => { void process.stdout.write(`orch ${VERSION}\n`); },
  version: (_services, _args) => { void process.stdout.write(`orch ${VERSION}\n`); },
  help: (_services, _args) => usage(),
  "-h": (_services, _args) => usage(),
  "--help": (_services, _args) => usage(),
};

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  let rest = argv.slice(1);
  // Help must never require setup, a daemon, or a current install to read.
  const topic = requestedHelpTopic(cmd, rest);
  if (topic !== null) { process.stdout.write(topic); return; }
  const services = createServices();
  try {
    const directory = services.orchDir;
    // The setup gate never surfaces a raw config error. Either it routes into the wizard, or it
    // prints exactly what is missing and the command that fixes it. `die` exits, so the switch
    // below is only ever reached with a real recorded configuration.
    if (needsFirstRunSetup(services.settings.currentOrNull(), cmd)) {
      void runFirstTimeSetup(services, argv, runCommand).catch((error: unknown) => reportCommandFailure(services.logger, error));
      return;
    }
    // Nothing recorded and no TTY to walk the wizard on: say exactly what to run, rather than
    // letting an unconfigured command surface a config error deeper in.
    if (!exemptFromSetupGate(cmd) && compositionUnrecorded(services.settings.currentOrNull())) die(setupRequiredMessage(directory));
    const sanitized = preflightSkew(directory, argv);
    rest = sanitized.slice(1);
    if (cmd === undefined) {
      dispatchAsync(services.logger, cmdStatusVerb(services, argv));
      return;
    }
    const handler = commandHandlers[cmd];
    if (handler !== undefined) {
      dispatchAsync(services.logger, Promise.resolve(handler(services, rest)));
      return;
    }
    if (cmd.startsWith("--")) dispatchAsync(services.logger, cmdStatusVerb(services, argv));
    else {
      services.logger.error("command.unknown", { command: cmd });
      process.stdout.write(`Unknown command: ${cmd}\n\n`);
      usage();
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    reportCommandFailure(services.logger, error);
  }
}
