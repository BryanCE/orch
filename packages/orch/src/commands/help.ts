/** Detailed per-command help, served by `orch <command> -h|--help` and `orch help <command>`.
 *  The global `orch help` stays the one-line map; these topics carry the flag detail. */

import { term } from "../policy/vocabulary.ts";

const ALIASES: Record<string, string> = {
  kill: "close",
  new: "reset",
  "-V": "version",
  "--version": "version",
};

const TOPICS: Record<string, string> = {
  status: `orch status [--json] [--all] [--all-panes] [--offline] [--live]
Glanceable table of the fleet (the default command when none is given).
  --json        Machine-readable rows instead of the table.
  --all         Include every space, not just the caller's.
  --all-panes   Also list panes orch did not spawn.
  --offline     Read agent presence files only; never dials or starts orchd.
  --live        Full-screen live status re-rendered from the daemon event stream; TTY only; q/esc quits; not combinable with --json.
`,
  logs: `orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]
Read structured diagnosis records; malformed JSONL lines are skipped.
  --since      Epoch milliseconds or a date/time.
  --level      Exact severity to include.
  --agent      Filter by minted orch agent id.
  --dispatch   Filter by correlation/dispatch id.
  --json       Emit raw records.
`,
  events: `orch events [--agent=<name>] [--agent-id=<id>] [--mine] [--any-agent] [--all] [--status s[,s...]] [--json] [--since-seq <n>]
Continuous stream of pane state transitions; requires a running daemon.
Bare 'orch events' is the normal use: one readable line per transition, scoped to the
agents THIS session spawned. Every flag below is a deviation from that.
  --agent       Watch one agent by name.
  --agent-id    Watch one agent by identity key.
  --mine        Explicitly select the default session scope (spawned or currently leased).
  --any-agent   Every agent, not just the ones this session spawned.
  --all         Every space's transitions, not just the caller's.
  --status      Only transitions into these states (comma-separated).
  --json        Raw event records, one per line, for a caller that parses them.
  --since-seq <n> Resume after this durable sequence; it survives daemon restarts, but
                history is bounded by the events retention window. A pruned range is
                reported as a history gap before retained events are replayed.
Notifications are delivered by orchd from settings.json sinks, not by this command.
An attached events stream counts as daemon usage: orchd will not idle-shutdown while one is open.
`,
  notify: `orch notify test [--state <state>]
Send a synthetic transition through each notification sink configured in settings.json.
  --state       The presence state to fake (default: done).
`,
  questions: `orch questions
List pending agent questions from live agents. Answer one with: orch answer <target> "<text>".
`,
  runs: `orch runs [<target>] [-n <count>] [--json]
List durable dispatch history, newest first. Without a target, lists all agents.
  <target>       Resolve an agent name, key, pane handle, or unique suffix.
  -n <count>     Limit the number of rows.
  --json         Print the RunRecord array for scripts.
`,
  queue: `orch queue add "<task text>" [--worktree] [--json]
orch queue list [--json]
orch queue history [--json]
orch queue cancel <id> [--json]
Durable task queue, stored in the orch store and assigned by 'orch work'.
  add           Add a task and print its id. --worktree runs it in a fresh git worktree.
  list          Queued, claimed, and settled tasks.
  history       Completed, failed, and cancelled tasks.
  cancel        Cancel an unclaimed task by id.
`,
  work: `orch work [--once] [--json]
Assign queued tasks to idle agents.
  --once        One assignment pass instead of the daemon's continuous loop.
`,
  review: `orch review
orch review list [--json]
orch review approve <target>
orch review reject <target> -m "feedback"
Review done worktree agents. With no subcommand, review runs interactively.
  list          Done worktree agents with commits ahead of their base branch.
  approve       Merge the agent's branch and remove its worktree.
  reject        Re-dispatch feedback to the same agent in the same worktree.
`,
  run: `orch run <target> "<prompt>" [--raw]
Queue a prompt through orchd with the worker header prepended.
  --raw         Send the exact prompt, no worker header.
`,
  dispatch: `orch dispatch <target> "<prompt>" [--raw] [--model <model[:thinking]>] [--agent <adapter>]
Durably accept a prompt through orchd: the write lands in the outbox and survives restarts.
Prints the dispatch id; 'orch status --json' echoes it as .dispatchId once the
agent runs that prompt, proving the pane runs what THIS command sent.
  --raw         Send the exact prompt, no worker header.
  --model       Pin the model (and optional thinking effort) for this dispatch.
  --agent       Route through a specific adapter instead of the recorded one.
Governance flags (--force, --steal, --cross-space) are operator-only; a spawned agent's are refused.
`,
  answer: `orch answer <target> "<text>" [--force]
Answer a target's pending question.
  --force       Permit answering when no question.json is recorded.
`,
  pipe: `orch pipe <src> <dst> ["instruction"]
Send a completed result from one agent to another through orchd, with an optional instruction.
`,
  broadcast: `orch broadcast "<text>" [target ...|--all]
Steer the named targets (or all of the caller's agents) through orchd.
`,
  model: `orch model <target> <model[:thinking]>
Durably accept a model change through orchd. Model names use the target harness's own vocabulary;
see 'orch models' for what each installed harness offers.
`,
  steer: `orch steer <target> <text...>
Durably accept a mid-run steer through orchd; the agent reads it from its inbox mid-turn.
`,
  wait: `orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
Block until the pane reaches a status.
  --status      The state to wait for (default: done).
  --timeout     Give up after this many milliseconds (default: 300000).
`,
  result: `orch result <target> [--force] [--json]
Print a target's result (result.json, else the session's last assistant text).
  --force       Read an agent another ${term("orch")} owns.
`,
  tail: `orch tail <target> [-n N]
Last N session entries (default 20), rendered human-readable through the target's adapter.
`,
  session: `orch session <target>
Resolved session path plus quick stats for the target's recorded session.
`,
  reload: `orch reload <target>... | --all
Live-reload code in place: touches reload.signal so panes and watchers pick up a rebuilt install.
Use after 'bun run build:dev'. reload = same session; reset = new session; restart = new process.
`,
  reset: `orch reset <target>... | --all [--model M]     (alias: orch new)
Start a fresh session/context in the same pane, then pin M (else that harness's defaults.models entry).
Always reset a target before dispatching it a new task.
`,
  restart: `orch restart <target>... | --all [--cmd pi]
Fully close the harness process and relaunch it.
  --cmd         The command to relaunch with (default: the recorded adapter command).
`,
  lock: `orch lock run [--note <why>] [--timeout <ms>] -- <argv...>
orch lock check -- <argv...>
orch lock status [--json]
orch lock release --force
One heavy command machine-wide (see settings.locked_commands).
  run           Acquire the lock, run argv, release on exit; propagates the exit code.
  check         Exit 3 if argv is a locked command held elsewhere, else exit 0.
  status        Show the current holder (pid, note, age) or 'unlocked'.
  release       Evict the current holder, naming it. Requires --force.
`,
  spawn: `orch spawn <name> [<name> ...] [--tab L] [--cwd P] [--cmd C] [--model M]
          [--agent A] [--backend B] [--prompt T ...] [--tasks FILE] [--worktree]
Fresh tab, balanced-tiled (2=side-by-side, 3=2+1, 4=2x2, ...).
NAMING AN AGENT IS PART OF CREATING IT: the positional arguments ARE the names,
one per agent, and how many you give is how many panes you get. There is no
default name, no prefix numbering, and no --name flag — name each pane for the
SLICE it holds, so you never pay for a rename afterwards.
  orch spawn api-types api-routes api-guards
Every name is validated before any tab or pane is created — a refused spawn
leaves nothing behind.
  --tab         Label for the new tab; an existing tab's label fills that tab.
  --cwd         Working directory for every agent.
  --model       Pin each agent's launch model.
  --agent       Adapter id (pi, claude, codex, ...).
  --backend     Plexer id (herdr, tmux, headless). headless requires --prompt: a detached
                agent runs the prompt and exits.
  --prompt      One task for every agent, or repeat exactly N times for per-agent tasks.
  --tasks       JSON file containing exactly N task strings (alternative to --prompt).
  --worktree    Give each agent its own git worktree.
`,
  tile: `orch tile <tab|pane> <name> [--cmd C] [--cwd P] [--model M] [--agent A] [--backend B]
Add ONE named pane to an existing tab: splits into the tab's largest cell and pins
the model. Tile creates an agent, so it names one too.
`,
  rename: `orch rename <target> <name> [--pane]
Set the agent name (the NAME column). --pane sets the pane border label instead.
`,
  focus: `orch focus <target>
Jump the user's view to that pane. This is the one pane command that DOES steal focus.
`,
  zoom: `orch zoom <target> [--on|--off]
Zoom the pane full-tab. With neither flag, toggles.
`,
  move: `orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]
Move a pane to another tab or a fresh one. Never steals focus.
`,
  close: `orch close <target>... | --all [--stream]     (alias: orch kill)
Close pane(s).
  --all         Only panes orch spawned — never the user's own panes. A spawned agent's
                --all sweeps only agents it spawned itself.
  --stream      Also kill the caller's 'orch events' stream.
`,
  detach: `orch detach <target>
Release the target's lease. The agent keeps running and becomes adoptable; an already-unleased
agent is a friendly no-op.
`,
  adopt: `orch adopt <target> | --all
Adopt an unleased agent, or every available orphan. A live lease holder must release first.
`,
  reap: `orch reap <target>
orch reap
orch reap --dead [--json]
Delete an agent record and its presence directory. Refuses while the process or any descendant
is live; ending is never gated by the lease.
Bare 'orch reap' on a TTY opens an interactive multiselect over live agents; provably-dead rows are pre-checked.
  --dead       Non-interactive sweep of provably-dead agents.
  --json       Emit reaped target/name records.
`,
  panes: `orch panes
Raw merged pane list, tab-separated, for scripting.
`,
  tabs: `orch tabs
List tabs: id, label, number, pane count, status.
`,
  tab: `orch tab new [--label X] [--workspace ID] [--cwd P]
orch tab rename <tab_id|label> <new-label>
orch tab close <tab_id|label>
orch tab focus <tab_id|label>
Tab management. 'new' prints the root pane id and never steals focus; 'focus' does.
`,
  space: `orch space list
orch space create <name>
orch space rename <space> <name>
orch space delete <space>
orch space focus <space>
A space is orch's own grouping of related work, created by you and named by you.
list/create/rename/delete are orch's own and work in every environment; 'focus'
needs a plexer holding a home for the space and answers plainly when none does.
A home coordinate belongs to the plexer and is never displayed.
`,
  daemon: `orch daemon start [--fg|--foreground] [--json]
orch daemon stop [--json]
orch daemon status [--json]
orch daemon reload [--json]
Manage the resident orch daemon (orchd). Write commands auto-start it when absent.
  start         Spawn orchd detached; --fg keeps it attached to this terminal.
  stop          SIGTERM the daemon that holds this ORCH_DIR's lock.
  status        pid, uptime, code hash, transport, and subsystem health.
  reload        Re-exec the daemon in place so it runs the freshly installed code
                (the fix for the CLI/daemon hash-skew refusal).
orchd owns its lifecycle: with no live agents, no event subscribers, and no RPC traffic for
settings.json daemon.idle_shutdown_minutes (default 30, 0 = never), it exits on its own.
`,
  doctor: `orch doctor [--fix] [-y|--yes] [--json]
Check the install: runtime, composition, backends, daemon, presence, sinks, hosts.
  --fix         On a TTY, open the fix menu (plain 'doctor' does too when fixes exist).
  -y, --yes     Apply every fix unattended — how CI and non-TTY repairs run.
`,
  clean: `orch clean [--worktrees [--force]]
Delete dead agent dirs.
  --worktrees   Also clean orphaned worktrees; --force discards unmerged work.
`,
  setup: `orch setup [--agent <id[,id...]>] [--backend <id[,id...]>] [--model <model[:thinking]> | --model <harness>=<model[:thinking]> ...]
           [--yes] [--no-install] [--copy] [--skills|--no-skills] [--refresh]
Onboarding wizard: multi-select the adapters and backends you use, record them to
~/.orch/settings.json, install missing deps, and wire every selected adapter's shim.
The first id of each list becomes the active default. Prompts interactively on a TTY
when a selection is omitted. Repeat --model with harness=model to choose per harness;
a bare model is applied only when that harness lists it.
  --yes         Auto-install missing dependencies.
  --no-install  Report what is missing without installing.
  --copy        Copy shims instead of symlinking.
  --skills      Install orch's packaged skills without asking.
  --no-skills   Skip them without asking; nothing is written to your harness dirs.
  --refresh     Ask every harness for its models again instead of using the stored
                catalogues. Slower; for a model installed since the last refresh.
Setup asks before copying skills into ~/.claude/skills and ~/.agents/skills. Change the
answer later with 'orch settings skills'.
`,
  settings: `orch settings [--json] [--harness=<id>] [--plexer=<id>]
orch settings models [--harness=<id>] [--model=<model[:thinking]>] [--refresh]
orch settings thinking [<level>] [--harness=<id>] [--clear]
orch settings skills [--install|--no-install] [--roots=<dir>[,<dir>...]]
Print each effective setting with its source (flag > env > settings.json > default),
or switch the active default adapter/plexer among the enabled set.
  models        Re-pick, per enabled harness: launch model, picker quicklist
                (models.preferred), and the launchable set (models.allowed).
                --refresh asks the harnesses again rather than using the stored
                catalogues, for a model installed since the last refresh.
  thinking      Thinking effort for every launch, independent of the model: one of
                off, minimal, low, medium, high, xhigh, max. Bare prints the current
                value; a level sets the global default; --harness=<id> sets that
                harness's override and --clear --harness=<id> removes it.
  skills        Turn the skill install on or off and choose its roots. --install writes
                every packaged skill into them now; --no-install records the refusal and
                leaves the files already there alone. Roots default to ~/.claude/skills
                and ~/.agents/skills; a leading ~ expands to your home directory.
`,
  models: `orch models [--agent=<id>] [--preferred] [--search=<text>] [--json] [--pick=<index|spec>]
List every model each enabled harness reports it can run.
  --preferred   Only the quicklist.
  --search      Match against spec or label, case-insensitive.
  --pick        Print one full spec for scripting (by displayed index or exact spec).
Lists only; records nothing.
`,
  abort: `orch abort <target>
Escape twice, 500ms apart, to dismiss and cancel the target's current turn.
`,
  keys: `orch keys <target> <key> [key...]
Send raw keys to a pane.
`,
  peek: `orch peek <target> [-n N]
Read the visible pane screen (default 25 lines).
`,
  version: `orch version | -V | --version
Print the installed orch version.
`,
  help: `orch help [command]
With no argument, the global command map. With a command name, that command's detailed help —
the same text as 'orch <command> -h'.
`,
};

/** The detailed help text for one command name or alias, or null when none exists. */
export function helpTopic(name: string): string | null {
  return TOPICS[ALIASES[name] ?? name] ?? null;
}
