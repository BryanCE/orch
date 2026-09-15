import * as files from "node:fs";
import * as path from "node:path";
import { errorMessage, isRecord, packageRoot } from "../util.ts";
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
import { cmdReview, cmdReviewInteractive } from "./review.ts";
import { cmdQueue } from "./queue.ts";
import { cmdClean } from "./clean.ts";
import { cmdGrant } from "./grant.ts";
import { cmdDaemon, cmdWork } from "./daemon.ts";
import { cmdSetup, runFirstTimeSetup, setupRequiredMessage } from "./setup.ts";
import { compositionUnrecorded } from "../setup/composition.ts";
import { cmdSettings, cmdSettingsModels, cmdSettingsNotify, cmdSettingsSkills, cmdSettingsThinking } from "./settings.ts";
import { cmdModels } from "./models.ts";
import { cmdDoctor } from "./doctor.ts";
import { cmdDetach, cmdAdopt, cmdReap } from "./lease.ts";
import { helpTopic } from "./help.ts";
import { die } from "./target.ts";
import { term } from "../policy/vocabulary.ts";
import { createServices } from "../services.ts";
import type { Services } from "../types/services.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

function usage() {
  process.stdout.write(
    `orch - the single controller for coding agents, in any plexer.
'orch help <command>' (or 'orch <command> -h') prints every flag, default and output shape.

OBSERVE
  orch status [--json] [--capacity] [--live]     Fleet table with cost and context. The default command.
  orch monitor                                   Push stream of the states an ${term("orch")} acts on. Arm it as a Monitor.
  orch events                                    Every state transition, mid-turn flips included.
  orch questions                                 Agents blocked on a question.
  orch runs [<target>] [-n N]                    Dispatch history, newest first.
  orch logs [--since W] [--level L] [--agent ID] Structured diagnosis records.

DISPATCH
  orch dispatch <target> "<prompt>" | --file P   Send a task onto a clean session. Durable.
  orch run <target> "<prompt>"                   Queue a prompt with the worker header.
  orch answer <target> "<text>"                  Answer the question the agent is asking.
  orch steer <target> <text...>                  Mid-run instruction. The reply says if it applied.
  orch broadcast "<text>" [target ...|--all]     Steer several.
  orch pipe <src> <dst> ["instruction"]          Hand one agent's result to another.
  orch model <target> <model[:thinking]>         Change the model.
  orch wait <target> [--status S] [--timeout ms] Block until one agent reaches a state.

COLLECT
  orch result <target>... [--json]               Each target's result.
  orch tail <target> [-n N]                      Last N session entries.
  orch peek <target> [-n N]                      What is on the pane screen now.
  orch session <target>                          Session path and stats.

QUEUE
  orch queue add|list|history|cancel             Durable task queue.
  orch work [--once]                             Assign queued tasks to idle agents.

REVIEW
  orch review [list|approve <target>|reject <target> -m "..."]
                                                 Review done worktree agents.

AGENTS (never steals focus except 'focus')
  orch spawn <name>... [--tab L] [--file P]... [--model M]...
                                                 One fleet, one command. The names are the agents.
  orch tile <tab|pane> <name>                    Add one named agent to an existing tab.
  orch rename <target> <name> [--pane]           Set the agent name. --pane sets the border label.
  orch reset <target>... | --all [--model M]     Fresh session, same agent (alias: new).
  orch reload <target>... | --all                Live-reload code after a rebuild.
  orch restart <target>... | --all               Relaunch the harness process.
  orch close <target>... | --all [--stream]      Close (alias: kill).
  orch abort <target>                            Cancel the current turn.
  orch detach <target>                           Release the lease. The agent keeps running.
  orch adopt <target> | --all                    Take an unleased agent.
  orch reap [<target>|--dead]                    Delete an agent record.
  orch grant [<hash>|--list]                     Approve an action an agent was refused.
  orch focus <target>                            Jump the user's view to that pane.
  orch zoom <target> [--on|--off]                Zoom the pane full-tab.
  orch move <target> --tab <tab_id|label>        Move a pane to another tab.
  orch keys <target> <key>...                    Send raw keys.
  orch panes                                     Raw pane list, for scripts.

TABS AND SPACES
  orch tabs                                      List tabs.
  orch tab new|rename|close|focus                Tab management.
  orch space list|create|rename|delete|focus     orch's own grouping of related work.

MAINTENANCE
  orch daemon start|stop|status|reload           The resident daemon (orchd).
  orch doctor [--fix] [-y]                       Check the install and fix it.
  orch clean [--force] [--worktrees]             Remove dead agent dirs and orphaned worktrees.
  orch setup                                     Onboarding wizard.
  orch settings [models|thinking|notify|skills]  Every effective setting and its source.
  orch models [--agent=<id>]                     Every model each harness can run.
  orch notify test                               Fire every notification sink.
  orch version                                   Installed version.
  orch help [command]                            This map, or one command's detail.

Target: agent name, identity key, or unique handle suffix. Tabs resolve by id or unique label.
`
  );
}

export function readOrchVersion(): string {
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(path.join(packageRoot(), "package.json"), "utf8"));
    return isRecord(parsed) && typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = readOrchVersion();

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
    die(`Refusing orch ${cmd}: daemon hash=${skew.daemonHash} differs from installed hash=${skew.diskHash}; fix: orch daemon reload  # or: bun run build:orch:dev; override: --stale-ok`);
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

const commandHandlers: Record<string, Handler> = {
  status: (services, args) => dispatchAsync(services.logger, cmdStatusVerb(services, args)),
  events: (services, args) => dispatchAsync(services.logger, cmdEvents(services, args)),
  monitor: (services, args) => dispatchAsync(services.logger, cmdMonitor(services, args)),
  logs: (services, args) => cmdLogs(services, args),
  notify: (services, args) => dispatchAsync(services.logger, cmdNotify(services, args)),
  questions: (services, args) => dispatchAsync(services.logger, cmdQuestions(services, args)),
  runs: (services, args) => cmdRuns(services, args),
  queue: (services, args) => dispatchAsync(services.logger, cmdQueue(services, args)),
  daemon: (services, args) => dispatchAsync(services.logger, cmdDaemon(services, args)),
  doctor: (services, args) => dispatchAsync(services.logger, cmdDoctor(services, args)),
  work: (services, args) => dispatchAsync(services.logger, cmdWork(services, args)),
  review: (services, args) => {
    if (args.length === 0) dispatchAsync(services.logger, cmdReviewInteractive(services));
    else dispatchAsync(services.logger, cmdReview(services, args));
  },
  answer: (services, args) => dispatchAsync(services.logger, cmdAnswer(services, args)),
  result: (services, args) => cmdResult(services, args),
  steer: (services, args) => dispatchAsync(services.logger, cmdSteer(services, args)),
  pipe: (services, args) => dispatchAsync(services.logger, cmdPipe(services, args)),
  broadcast: (services, args) => dispatchAsync(services.logger, cmdBroadcast(services, args)),
  tail: (services, args) => cmdTail(services, args),
  session: (services, args) => cmdSession(services, args),
  panes: (services, args) => cmdPanes(services, args),
  spawn: (services, args) => dispatchAsync(services.logger, cmdSpawn(services, args)),
  tile: (services, args) => dispatchAsync(services.logger, cmdTile(services, args)),
  run: (services, args) => dispatchAsync(services.logger, cmdRun(services, args)),
  model: (services, args) => dispatchAsync(services.logger, cmdModel(services, args)),
  models: (services, args) => cmdModels(services, args),
  wait: (services, args) => cmdWait(services, args),
  dispatch: (services, args) => dispatchAsync(services.logger, cmdDispatch(services, args)),
  reload: (services, args) => dispatchAsync(services.logger, cmdReload(services, args)),
  reset: (services, args) => dispatchAsync(services.logger, cmdNew(services, args)),
  new: (services, args) => dispatchAsync(services.logger, cmdNew(services, args)),
  restart: (services, args) => dispatchAsync(services.logger, cmdRestart(services, args)),
  rename: (services, args) => cmdRename(services, args),
  close: (services, args) => cmdClose(services, args),
  kill: (services, args) => cmdClose(services, args),
  detach: (services, args) => dispatchAsync(services.logger, cmdDetach(services, args)),
  adopt: (services, args) => dispatchAsync(services.logger, cmdAdopt(services, args)),
  reap: (services, args) => dispatchAsync(services.logger, cmdReap(services, args)),
  abort: (services, args) => cmdAbort(services, args),
  keys: (services, args) => cmdKeys(services, args),
  peek: (services, args) => cmdPeek(services, args),
  tabs: (services, args) => cmdTabs(services, args),
  tab: (services, args) => cmdTab(services, args),
  focus: (services, args) => cmdFocus(services, args),
  zoom: (services, args) => cmdZoom(services, args),
  move: (services, args) => cmdMove(services, args),
  space: (services, args) => cmdSpace(services, args),
  clean: (services, args) => cmdClean(services, args),
  grant: (services, args) => dispatchAsync(services.logger, cmdGrant(services, args)),
  settings: (services, args) => {
    if (args[0] === "models") dispatchAsync(services.logger, cmdSettingsModels(services, args.slice(1)));
    else if (args[0] === "notify") dispatchAsync(services.logger, cmdSettingsNotify(services, args.slice(1)));
    else if (args[0] === "skills") cmdSettingsSkills(services, args.slice(1));
    else if (args[0] === "thinking") cmdSettingsThinking(services, args.slice(1));
    else dispatchAsync(services.logger, cmdSettings(services, args));
  },
  setup: (services, args) => dispatchAsync(services.logger, cmdSetup(services, args)),
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
      void handler(services, rest);
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
