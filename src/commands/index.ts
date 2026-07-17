import * as files from "node:fs";
import * as path from "node:path";
import { isRecord } from "../store.ts";
import { errorMessage, packageRoot } from "../util.ts";
import { cmdStatus } from "./status.ts";
import { cmdSpawn, cmdTile } from "./spawn.ts";
import { cmdAnswer, cmdBroadcast, cmdDispatch, cmdModel, cmdPipe, cmdSteer } from "./control.ts";
import { cmdAbort, cmdClose, cmdNew, cmdReload, cmdRename, cmdRestart, cmdRun, cmdWait } from "./lifecycle.ts";
import { cmdFocus, cmdKeys, cmdMove, cmdPanes, cmdPeek, cmdTab, cmdTabs, cmdWs, cmdZoom } from "./panes.ts";
import { cmdQuestions, cmdResult, cmdSession, cmdTail } from "./results.ts";
import { cmdEvents, cmdNotify } from "./events.ts";
import { cmdReview, cmdReviewInteractive } from "./review.ts";
import { cmdQueue } from "./queue.ts";
import { cmdLock } from "./lock.ts";
import { cmdClean } from "./clean.ts";
import { cmdDaemon, cmdWork } from "./daemon.ts";
import { cmdDoctor, cmdSettings, cmdSetup, compositionUnrecorded, runFirstTimeSetup } from "./setup.ts";
import { die } from "./target.ts";

function usage() {
  process.stdout.write(
    `orch — the single controller for agents in backend targets.
The orchestrator routes control through the backend port.

OBSERVE
  orch status [--json] [--all] [--offline]
                                 Glanceable table of every pane (default command); --offline reads agent files only.
  orch questions                 List pending agent questions.
  orch events [--all] [target ...] [--status s[,s…]] [--notify] [--json] [--offline]
                                 Continuous stream of pane state transitions; --offline uses read-only agent files.

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
  orch dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter]
                                 Durably accept a prompt through orchd.
  orch answer <target> "<text>" [--force]
                                 Answer a pending question (--force permits a missing question.json).
  orch pipe <src> <dst> ["instruction"]
                                 Send a completed result through orchd.
  orch broadcast "<text>" [target ...|--all]
                                 Steer named targets through orchd.
  orch model <target> <provider/model[:thinking]>
                                 Durably accept a model change through orchd.
  orch notify test [--state <state>]
                                 Send a synthetic transition to each configured notification sink.
  orch steer <target> <text…>    Durably accept a mid-run steer through orchd.
  orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
                                 Block until the pane reaches a status (default done, 300000ms).
  orch result <target> [--json]  Print a target's result (result.json or session fallback).
  orch tail <target> [-n N]      Last N session entries (default 20), human-readable.
  orch session <target>          Resolved session path + quick stats.
  orch reload <target>… | --all   Reload panes, signal watchers via reload.signal, and report each outcome.
  orch reset  <target>… | --all   Start a fresh session/context, keep model. (alias: new)
  orch restart <target>… | --all [--cmd pi]
                                 Fully close the harness process and relaunch it.

COMMAND LOCK (one heavy command machine-wide; see settings.locked_commands)
  orch lock run [--note <why>] [--timeout <ms>] -- <argv…>
                                 Acquire the machine-wide lock, run argv, release on exit (propagates the exit code).
  orch lock check -- <argv…>     Exit 3 if argv is a locked command held elsewhere, else exit 0.
  orch lock status [--json]      Show the current holder (pid, note, age) or 'unlocked'.
  orch lock release --force      Evict the current holder, naming it.

PANES (create / arrange / lifecycle — never steals focus except 'focus')
  orch spawn <N> [--tab L] [--cwd P] [--cmd C] [--name PREFIX] [--model M]
                   [--agent A] [--backend B] [--spawn-cap N] [--worktree]
                                 Fresh tab with N balanced-tiled named agents (2=side-by-side,
                                 3=2+1, 4=2x2, …; cap 8). Names <prefix>-1..N.
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
  orch panes                     Raw merged pane list (tab-separated, for scripting).

TABS
  orch tabs                      List tabs: id, label, number, pane count, status.
  orch tab new [--label X] [--workspace ID] [--cwd P]
                                 Create a tab (no focus steal); prints root pane id.
  orch tab rename <tab_id|label> <new-label>
  orch tab close <tab_id|label>
  orch tab focus <tab_id|label>  Jump the user's view to that tab.

WORKSPACES
  orch ws [list]                 List workspaces: id, label, tab/pane counts, status.
  orch ws focus <workspace_id>   Jump the user's view to that workspace.

MAINTENANCE
  orch daemon start [--fg] | stop | status [--json] | reload
                                 Manage the resident orch daemon.
  orch doctor [--fix] [-y|--yes] [--json]
                                 Check the install. On a TTY, doctor and 'doctor --fix'
                                 open a menu to pick fixes; -y/--yes applies every fix
                                 unattended (also how CI/non-TTY repairs run).
  orch clean [--worktrees [--force]]
                                 Delete dead agent dirs; clean orphaned worktrees (use --force to discard unmerged work).
  orch setup [--agent <id[,id...]>] [--backend <id[,id...]>] [--yes] [--no-install] [--copy]
                                 Onboarding wizard: multi-select the adapters and backends
                                 you use (--agent pi,claude / --backend herdr,headless — the
                                 first of each is the active default), record the installed
                                 sets to ~/.orch/settings.json, install missing deps, and wire
                                 every selected adapter's shim. Prompts interactively when a
                                 selection is omitted on a TTY; --yes auto-installs deps,
                                 --no-install just reports, --copy copies instead of symlinking.
  orch settings [--json] [--harness=<id>] [--plexer=<id>]
                                 Print each effective setting with its source (flag > env >
                                 settings.json > default), or switch the active default
                                 adapter/plexer among the installed set.
  orch help                      This message.

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

/** True on a clean slate: no selections recorded yet, a TTY to prompt on, and a command that needs them. */
export function needsFirstRunSetup(cmd: string | undefined): boolean {
  if (cmd === "setup" || cmd === "status" || cmd === "help" || cmd === "-h" || cmd === "--help" || cmd === "version" || cmd === "-V" || cmd === "--version") return false;
  if (!process.stdin.isTTY) return false;
  return compositionUnrecorded();
}

export function runCommand(argv: string[]): void {
  const cmd = argv[0];
  const rest = argv.slice(1);
  if (needsFirstRunSetup(cmd)) {
    void runFirstTimeSetup(argv, runCommand).catch((error: unknown) => die(errorMessage(error)));
    return;
  }
  switch (cmd) {
    case undefined: case "status": void cmdStatus(cmd === undefined ? argv : rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "events": void cmdEvents(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "notify": void cmdNotify(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "questions": void cmdQuestions(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "queue": cmdQueue(rest); break;
    case "lock": void cmdLock(rest).then((code) => { process.exitCode = code; }).catch((error: unknown) => die(errorMessage(error))); break;
    case "daemon": void cmdDaemon(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "doctor": void cmdDoctor(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "work": void cmdWork(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "review":
      if (rest.length === 0) void cmdReviewInteractive().catch((error: unknown) => die(errorMessage(error)));
      else void cmdReview(rest).catch((error: unknown) => die(errorMessage(error)));
      break;
    case "answer": cmdAnswer(rest); break;
    case "result": cmdResult(rest); break;
    case "steer": void cmdSteer(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "pipe": void cmdPipe(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "broadcast": void cmdBroadcast(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "tail": cmdTail(rest); break;
    case "session": cmdSession(rest); break;
    case "panes": cmdPanes(rest); break;
    case "spawn": void cmdSpawn(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "tile": void cmdTile(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "run": void cmdRun(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "model": void cmdModel(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "wait": cmdWait(rest); break;
    case "dispatch": void cmdDispatch(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "reload": cmdReload(rest); break;
    case "reset": case "new": cmdNew(rest); break;
    case "restart": cmdRestart(rest); break;
    case "rename": cmdRename(rest); break;
    case "close": case "kill": cmdClose(rest); break;
    case "abort": cmdAbort(rest); break;
    case "keys": cmdKeys(rest); break;
    case "peek": cmdPeek(rest); break;
    case "tabs": cmdTabs(rest); break;
    case "tab": cmdTab(rest); break;
    case "focus": cmdFocus(rest); break;
    case "zoom": cmdZoom(rest); break;
    case "move": cmdMove(rest); break;
    case "ws": cmdWs(rest); break;
    case "clean": cmdClean(rest); break;
    case "settings": cmdSettings(rest); break;
    case "setup": void cmdSetup(rest).catch((error: unknown) => die(errorMessage(error))); break;
    case "--version": case "-V": case "version": process.stdout.write(`orch ${VERSION}\n`); break;
    case "help": case "-h": case "--help": usage(); break;
    default:
      if (cmd.startsWith("--")) void cmdStatus(argv).catch((error: unknown) => die(errorMessage(error)));
      else { process.stderr.write(`Unknown command: ${cmd}\n\n`); usage(); process.exit(1); }
  }
}
