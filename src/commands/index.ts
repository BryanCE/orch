import * as files from "node:fs";
import * as path from "node:path";
import { errorMessage, isRecord, packageRoot } from "../util.ts";
import { orchDir } from "../presence/store.ts";
import { daemonEntrypoint, readDaemonCodeSkew } from "../daemon/lifecycle.ts";
import { cmdStatus } from "./status.ts";
import { cmdSpawn, cmdTile } from "./spawn.ts";
import { cmdAnswer, cmdBroadcast, cmdDispatch, cmdModel, cmdPipe, cmdSteer } from "./control.ts";
import { cmdAbort, cmdClose, cmdNew, cmdReload, cmdRename, cmdRestart, cmdRun, cmdWait } from "./lifecycle.ts";
import { cmdFocus, cmdKeys, cmdMove, cmdPanes, cmdPeek, cmdTab, cmdTabs, cmdZoom } from "./panes.ts";
import { cmdSpace } from "./space.ts";
import { cmdQuestions, cmdResult, cmdSession, cmdTail } from "./results.ts";
import { cmdRuns } from "./runs.ts";
import { cmdEvents, cmdNotify } from "./events.ts";
import { cmdLogs } from "./logs.ts";
import { cmdReview, cmdReviewInteractive } from "./review.ts";
import { cmdQueue } from "./queue.ts";
import { cmdLock } from "./lock.ts";
import { cmdClean } from "./clean.ts";
import { cmdGrant } from "./grant.ts";
import { cmdDaemon, cmdWork } from "./daemon.ts";
import { cmdSetup, compositionUnrecorded, runFirstTimeSetup, setupRequiredMessage } from "./setup.ts";
import { cmdSettings, cmdSettingsModels, cmdSettingsNotify, cmdSettingsSkills, cmdSettingsThinking } from "./settings.ts";
import { cmdModels } from "./models.ts";
import { cmdDoctor } from "./doctor.ts";
import { cmdDetach, cmdAdopt, cmdReap } from "./lease.ts";
import { helpTopic } from "./help.ts";
import { die } from "./target.ts";
import { CommandRefusal } from "../refusal.ts";
import { commandLogger } from "./logging.ts";

function usage() {
  process.stdout.write(
    `orch - the single controller for agents in backend targets.
The orchestrator routes control through the backend port.

OBSERVE
  orch status [--json] [--all] [--all-panes] [--offline]
                                 Glanceable table of the fleet (default command); --all-panes also lists
                                 panes orch did not spawn; --offline reads agent files only.
  orch questions                 List pending agent questions from live agents.
  orch runs [<target>] [-n <count>] [--json]
                                 List durable dispatch history, newest first.
  orch events [--agent=<name>] [--agent-id=<id>] [--any-agent] [--all] [--status s[,s...]] [--json]
                                 Continuous stream of pane state transitions; requires a running daemon.
  orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]
                                 Query structured diagnosis logs (malformed lines are skipped).
                                 Bare: one readable line per transition, scoped to the agents THIS
                                 session spawned. Flags widen or reshape that.
                                 Notifications are delivered by orchd from settings.json, not by this command.

QUEUE
  orch queue add "<task text>" [--worktree] [--json]
                                 Add a task and print its id.
  orch queue list [--json]       List queued, claimed, and settled tasks.
  orch queue history [--json]    List completed, failed, and cancelled tasks.
  orch queue cancel <id> [--json]
                                 Cancel an unclaimed task.
  orch work [--once]             Assign queued tasks to idle agents.

REVIEW
  orch review                     Interactively review done worktree agents.
  orch review list [--json]      List done worktree agents with commits ahead.
  orch review approve <target>    Merge and remove an approved worktree.
  orch review reject <target> -m "feedback"
                                 Re-dispatch feedback in the same worktree.

DISPATCH WORK
  orch run <target> "<prompt>" [--raw]
                                 Queue a prompt through orchd with the worker header (or exact prompt with --raw).
  orch dispatch <target> "<prompt>" [--raw] [--model <model[:thinking]>] [--agent adapter]
                                 Durably accept a prompt through orchd.
  orch answer <target> "<text>" [--force]
                                 Answer a pending question (--force permits a missing question.json).
  orch pipe <src> <dst> ["instruction"]
                                 Send a completed result through orchd.
  orch broadcast "<text>" [target ...|--all]
                                 Steer named targets through orchd.
  orch model <target> <model[:thinking]>
                                 Durably accept a model change through orchd.
  orch notify test [--state <state>]
                                 Send a synthetic transition to each configured notification sink.
  orch steer <target> <text...>    Durably accept a mid-run steer through orchd.
  orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
                                 Block until the pane reaches a status (default done, 300000ms).
  orch result <target> [--force] [--json]
                                 Print a target's result (result.json or session fallback).
                                 --force reads an agent another orchestrator owns.
  orch tail <target> [-n N]      Last N session entries (default 20), human-readable.
  orch session <target>          Resolved session path + quick stats.
  orch reload <target>... | --all   Reload panes, signal watchers via reload.signal, and report each outcome.
  orch reset  <target>... | --all [--model M]
                                 Start a fresh session/context, then pin M (else that harness's defaults.models entry). (alias: new)
  orch restart <target>... | --all [--cmd pi]
                                 Fully close the harness process and relaunch it.

COMMAND LOCK (one heavy command machine-wide; see settings.locked_commands)
  orch lock run [--note <why>] [--timeout <ms>] -- <argv...>
                                 Acquire the machine-wide lock, run argv, release on exit (propagates the exit code).
  orch lock check -- <argv...>     Exit 3 if argv is a locked command held elsewhere, else exit 0.
  orch lock status [--json]      Show the current holder (pid, note, age) or 'unlocked'.
  orch lock release --force      Evict the current holder, naming it.

PANES (create / arrange / lifecycle - never steals focus except 'focus')
  orch spawn <N> [--tab L] [--cwd P] [--cmd C] [--name PREFIX] [--model M]
                   [--agent A] [--backend B] [--prompt T] [--spawn-cap N] [--worktree]
                                 Fresh tab with N balanced-tiled named agents (2=side-by-side,
                                 3=2+1, 4=2x2, ...; cap 8). Names <prefix>-1..N.
                                 Run from outside a pane, opening a space is REFUSED until a
                                 human approves it with 'orch grant'; --space <id> uses an open one.
                                 --backend headless needs --prompt: a detached agent runs it and exits.
  orch grant [<hash>|--list]     Approve actions an agent was refused. Needs a terminal:
                                 there is no flag that answers the prompt for you.
  orch tile <tab|pane> [--name X] [--cmd C] [--cwd P] [--model M] [--agent A] [--backend B]
                                 Add ONE pane to an existing tab, split into its largest cell and pin M.
  orch rename <target> <name> [--pane]
                                 Set the agent name (NAME column); --pane sets the pane
                                 border label instead.
  orch focus <target>            Jump the user's view to that pane (this one DOES steal focus).
  orch zoom <target> [--on|--off]
                                 Zoom the pane full-tab (default: toggle).
  orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]
                                 Move a pane to another tab or a fresh one (no focus steal).
  orch close <target>... | --all [--stream]
                                 Close pane(s) ('orch kill' is an alias). --all closes only
                                 panes orch spawned (never the user's); --stream also kills orch events.
  orch detach <target>           Release the target's lease; it remains running and adoptable.
  orch adopt <target> | --all    Adopt an unleased agent (or every available orphan).
  orch reap <target>             Delete an ended agent record and its presence directory.
  orch panes                     Raw merged pane list (tab-separated, for scripting).

TABS
  orch tabs                      List tabs: id, label, number, pane count, status.
  orch tab new [--label X] [--workspace ID] [--cwd P]
                                 Create a tab (no focus steal); prints root pane id.
  orch tab rename <tab_id|label> <new-label>
  orch tab close <tab_id|label>
  orch tab focus <tab_id|label>  Jump the user's view to that tab.

SPACES
  orch space list                List orch spaces by their names.
  orch space create <name>       Create a named space, and its home where one can be held.
  orch space rename <space> <name>
                                 Rename a space, and its home where it has one.
  orch space delete <space>      Delete an empty space, closing its home.
  orch space focus <space>       Focus a space's home.

MAINTENANCE
  orch daemon start [--fg|--foreground] | stop | status [--json] | reload
                                 Manage the resident orch daemon.
  orch doctor [--fix] [-y|--yes] [--json]
                                 Check the install. On a TTY, doctor and 'doctor --fix'
                                 open a menu to pick fixes; -y/--yes applies every fix
                                 unattended (also how CI/non-TTY repairs run).
  orch clean [--worktrees [--force]]
                                 Delete dead agent dirs; clean orphaned worktrees (use --force to discard unmerged work).
  orch setup [--agent <id[,id...]>] [--backend <id[,id...]>] [--model <model[:thinking]>]
             [--yes] [--no-install] [--copy] [--skills|--no-skills]
                                 Onboarding wizard: multi-select the adapters and backends
                                 you use (--agent pi,claude / --backend herdr,headless - the
                                 first of each is the active default), record the enabled
                                 sets to ~/.orch/settings.json, install missing deps, and wire
                                 every selected adapter's shim. Prompts interactively when a
                                 selection is omitted on a TTY; --yes auto-installs deps,
                                 --no-install just reports, --copy copies instead of symlinking.
                                 Asks before copying orch's skills into your harness dirs;
                                 --skills / --no-skills answers that without the prompt.
  orch settings [--json] [--harness=<id>] [--plexer=<id>]
                                 Print each effective setting with its source (flag > env >
                                 settings.json > default), or switch the active default
                                 adapter/plexer among the enabled set.
  orch settings models [--harness=<id>] [--model=<model[:thinking]>]
                                 Re-pick, per enabled harness: the model it launches on, the
                                 quicklist its own picker cycles (models.preferred), and the set
                                 it may launch at all (models.allowed; none = all offered).
                                 Every harness names models in its own vocabulary.
  orch settings notify [list] [--json]
                                 List the sinks orchd delivers notifications through, with the
                                 states each fires on and where it delivers.
  orch settings notify add <sink> [--<field>=<value>...] [--on=<state,...>]
                                 Record one sink; a sink already configured is replaced, keeping
                                 the fields this call does not name. Each sink declares its own
                                 fields (webhook --url, command --command; desktop and herdr take
                                 none). --on defaults to blocked,error,done.
                                 e.g. orch settings notify add command --command="notify-send orch"
  orch settings notify remove <sink>
                                 Stop delivering through that sink.
  orch settings skills [--install|--no-install] [--roots=<dir>[,<dir>...]]
                                 Turn orch's skill install on or off and choose where it
                                 writes. --install copies them into the roots right away;
                                 default roots are ~/.claude/skills and ~/.agents/skills.
  orch models [--agent=<id>] [--preferred] [--search=<text>] [--json] [--pick=<index|spec>]
                                 List every model each enabled harness reports it can run -
                                 the quicklist never hides the rest. --preferred shows only the
                                 quicklist, --search matches spec or label, --pick prints one
                                 full spec for scripting. Lists only; records nothing.
  orch help [command]            This message, or one command's detailed help.
                                 'orch <command> -h' shows the same detail.

RECOVER
  orch abort <target>            Escape twice, 500ms apart, to dismiss and cancel a turn.
  orch keys <target> <key> [key...]
                                 Send raw keys to a pane.
  orch peek <target> [-n N]      Read visible pane screen (default 25 lines).

Target: agent name, identity key, or unique handle suffix.
Groups resolve by id or unique label.
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
function preflightSkew(argv: string[]): string[] {
  const staleOk = argv.includes("--stale-ok");
  const sanitized = argv.filter((arg) => arg !== "--stale-ok");
  const cmd = sanitized[0];
  const mutates = cmd === "queue"
    ? sanitized[1] === "add" || sanitized[1] === "cancel"
    : Boolean(cmd && STALE_GUARD_COMMANDS.has(cmd));
  if (!mutates || staleOk) return sanitized;
  const skew = readDaemonCodeSkew(orchDir(), daemonEntrypoint());
  if (skew) {
    die(`Refusing orch ${cmd}: daemon hash=${skew.daemonHash} differs from installed hash=${skew.diskHash}; fix: orch daemon reload  # or: bun run build:dev; override: --stale-ok`);
  }
  return sanitized;
}

/** Commands that must keep working before setup has recorded anything. `setup` records the
 * composition and `doctor` diagnoses an install that does not work yet - they are how a user
 * reaches a configured state, so neither may ever be refused for being unconfigured. */
function exemptFromSetupGate(cmd: string | undefined): boolean {
  return cmd === "setup" || cmd === "doctor" || cmd === "status" || cmd === "help" || cmd === "-h" || cmd === "--help" || cmd === "version" || cmd === "-V" || cmd === "--version";
}

/** True on a clean slate: no selections recorded yet, a TTY to prompt on, and a command that needs them. */
export function needsFirstRunSetup(cmd: string | undefined): boolean {
  if (exemptFromSetupGate(cmd)) return false;
  if (!process.stdin.isTTY) return false;
  return compositionUnrecorded();
}

/** `orch <cmd> -h|--help` and `orch help <cmd>` both name one command's topic. */
function requestedHelpTopic(cmd: string | undefined, rest: string[]): string | null {
  if (cmd === undefined) return null;
  if (rest[0] === "-h" || rest[0] === "--help") return helpTopic(cmd);
  if (cmd === "help" && rest[0] !== undefined) return helpTopic(rest[0]);
  return null;
}

type Handler = (args: string[]) => void | Promise<void>;

/**
 * The CLI boundary: report a failure and set the process's exit code.
 *
 * `process.exitCode` rather than `process.exit()` so buffered stdout still
 * flushes and no work is severed mid-write; the process ends on its own once the
 * command unwinds. A refusal has already been logged by `die`, so it is only
 * rendered here; anything else is an unexpected failure and gets a log record.
 */
export function reportCommandFailure(error: unknown): void {
  if (!(error instanceof CommandRefusal)) {
    commandLogger().error("command.failed", { error: errorMessage(error) });
  }
  process.stderr.write(errorMessage(error) + "\n");
  process.exitCode = 1;
}

function dispatchAsync(task: Promise<unknown>): void {
  void task.catch(reportCommandFailure);
}

const commandHandlers: Record<string, Handler> = {
  status: (args) => dispatchAsync(cmdStatus(args)),
  events: (args) => dispatchAsync(cmdEvents(args)),
  logs: (args) => cmdLogs(args),
  notify: (args) => dispatchAsync(cmdNotify(args)),
  questions: (args) => dispatchAsync(cmdQuestions(args)),
  runs: (args) => cmdRuns(args),
  queue: (args) => dispatchAsync(cmdQueue(args)),
  lock: (args) => dispatchAsync(cmdLock(args).then((code) => { process.exitCode = code; })),
  daemon: (args) => dispatchAsync(cmdDaemon(args)),
  doctor: (args) => dispatchAsync(cmdDoctor(args)),
  work: (args) => dispatchAsync(cmdWork(args)),
  review: (args) => {
    if (args.length === 0) dispatchAsync(cmdReviewInteractive());
    else dispatchAsync(cmdReview(args));
  },
  answer: (args) => dispatchAsync(cmdAnswer(args)),
  result: (args) => cmdResult(args),
  steer: (args) => dispatchAsync(cmdSteer(args)),
  pipe: (args) => dispatchAsync(cmdPipe(args)),
  broadcast: (args) => dispatchAsync(cmdBroadcast(args)),
  tail: (args) => cmdTail(args),
  session: (args) => cmdSession(args),
  panes: (args) => cmdPanes(args),
  spawn: (args) => dispatchAsync(cmdSpawn(args)),
  tile: (args) => dispatchAsync(cmdTile(args)),
  run: (args) => dispatchAsync(cmdRun(args)),
  model: (args) => dispatchAsync(cmdModel(args)),
  models: (args) => cmdModels(args),
  wait: (args) => cmdWait(args),
  dispatch: (args) => dispatchAsync(cmdDispatch(args)),
  reload: (args) => dispatchAsync(cmdReload(args)),
  reset: (args) => dispatchAsync(cmdNew(args)),
  new: (args) => dispatchAsync(cmdNew(args)),
  restart: (args) => dispatchAsync(cmdRestart(args)),
  rename: (args) => cmdRename(args),
  close: (args) => cmdClose(args),
  kill: (args) => cmdClose(args),
  detach: (args) => dispatchAsync(cmdDetach(args)),
  adopt: (args) => dispatchAsync(cmdAdopt(args)),
  reap: (args) => dispatchAsync(cmdReap(args)),
  abort: (args) => cmdAbort(args),
  keys: (args) => cmdKeys(args),
  peek: (args) => cmdPeek(args),
  tabs: (args) => cmdTabs(args),
  tab: (args) => cmdTab(args),
  focus: (args) => cmdFocus(args),
  zoom: (args) => cmdZoom(args),
  move: (args) => cmdMove(args),
  space: (args) => cmdSpace(args),
  clean: (args) => cmdClean(args),
  grant: (args) => dispatchAsync(cmdGrant(args)),
  settings: (args) => {
    if (args[0] === "models") dispatchAsync(cmdSettingsModels(args.slice(1)));
    else if (args[0] === "notify") dispatchAsync(cmdSettingsNotify(args.slice(1)));
    else if (args[0] === "skills") cmdSettingsSkills(args.slice(1));
    else if (args[0] === "thinking") cmdSettingsThinking(args.slice(1));
    else dispatchAsync(cmdSettings(args));
  },
  setup: (args) => dispatchAsync(cmdSetup(args)),
  "--version": () => { void process.stdout.write(`orch ${VERSION}\n`); },
  "-V": () => { void process.stdout.write(`orch ${VERSION}\n`); },
  version: () => { void process.stdout.write(`orch ${VERSION}\n`); },
  help: () => usage(),
  "-h": () => usage(),
  "--help": () => usage(),
};

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  let rest = argv.slice(1);
  // Help must never require setup, a daemon, or a current install to read.
  const topic = requestedHelpTopic(cmd, rest);
  if (topic !== null) { process.stdout.write(topic); return; }
  // The setup gate never surfaces a raw config error. Either it routes into the wizard, or it
  // prints exactly what is missing and the command that fixes it. `die` exits, so the switch
  // below is only ever reached with a real recorded configuration.
  try {
    if (needsFirstRunSetup(cmd)) {
      void runFirstTimeSetup(argv, runCommand).catch((error: unknown) => die(errorMessage(error)));
      return;
    }
    // Nothing recorded and no TTY to walk the wizard on: say exactly what to run, rather than
    // letting an unconfigured command surface a config error deeper in.
    if (!exemptFromSetupGate(cmd) && compositionUnrecorded()) die(setupRequiredMessage());
    const sanitized = preflightSkew(argv);
    rest = sanitized.slice(1);
  } catch (error: unknown) {
    // A present-but-invalid settings.json (stale schemaVersion, absent/unknown runtime): the
    // config layer already phrased these as plain guidance naming `orch setup`.
    die(errorMessage(error));
  }
  if (cmd === undefined) {
    dispatchAsync(cmdStatus(argv));
    return;
  }
  const handler = commandHandlers[cmd];
  if (handler !== undefined) {
    void handler(rest);
    return;
  }
  if (cmd.startsWith("--")) dispatchAsync(cmdStatus(argv));
  else {
    commandLogger().error("command.unknown", { command: cmd });
    process.stderr.write(`Unknown command: ${cmd}\n\n`);
    usage();
    process.exitCode = 1;
  }
}
