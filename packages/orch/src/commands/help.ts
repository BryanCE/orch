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
  status: `orch status [--json] [--human] [--space-wide] [--agent=<name|id>] [--filter=<column|state,...>] [--all-panes] [--offline] [--live] [--capacity]
Glanceable table of the fleet (the default command when none is given).
Bare 'orch status' is the normal use: every agent this session owns, with cost and
context. A human at a raw terminal owns none and sees the whole machine.
The table ends with one capacity line: \`pack you 5/10 - pack <other> 2/10 - space <name> 4/6 - machine 7/unlimited\`.
One pack per orchestrator, yours first, each against fleet.max_agents_per_pack; packs never sum.
\`machine\` is the live total against fleet.max_agents_total; \`unlimited\` means that setting is absent.
Read it before every spawn wave: it names the free slots and who holds the rest.
'state' is what the agent says about itself; 'backendStatus' (--json) is what the plexer says
about the pane and it lags. Read state for completion.
--json is a top-level array of rows; filter with .[]. Row fields: key agentId rootAgentId
rootAgentName paneId managed name tab agent owner ownerId spawnedBy spawnedByLabel worktree
branch cwd focused model modelShort state stateFallback staleExtension exited alive cost
ctxPercent task dispatchId lastText backendStatus backend capabilities sessionPath presenceDir
presenceOnly bridgeAttached tokens turns spaceId spaceName host.
  --capacity    Print only the capacity line (with --json, the capacity object).
  --json        Machine-readable rows instead of the table.
  --human       Render named harness and directory details for a person.
  --space-wide  Also the other orchs' agents in your space. Never past it.
  --agent       Show one agent by name or id, whatever its state, e.g. --agent=ctx-edges.
  --filter      Filter out columns and states, e.g. --filter=owner,env,done. A column name drops
                that column from the table and from --json rows; any other name drops rows in that state.
                Columns: host id env name owner branch tab agent model state cost ctx task last (--human: harness cwd worktree).
  --all-panes   Also list panes orch did not spawn.
  --offline     Read agent presence files only; never dials or starts orchd.
  --live        Full-screen live status re-rendered on every daemon event; TTY only; q/esc quits; not combinable with --json.
`,
  logs: `orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]
Read structured diagnosis records; malformed JSONL lines are skipped.
  --since      Epoch milliseconds or a date/time.
  --level      Exact severity to include.
  --agent      Filter by minted orch agent id.
  --dispatch   Filter by correlation/dispatch id.
  --json       Emit raw records.
`,
  events: `orch events [--agent=<name>] [--agent-id=<id>] [--space-wide] [--filter=<state,...>] [--json] [--since-seq <n>]
Continuous stream of pane state transitions; requires a running daemon.
Bare 'orch events' is the monitor: every state of every agent this session owns, one
readable line each, enough to act on without a second command. A human at a raw
terminal owns none and sees the whole machine. Every flag below deviates from that.
  --agent       Watch one agent by name.
  --agent-id    Watch one agent by identity key.
  --space-wide  Also the other orchs' agents in your space. Never past it.
  --filter      Drop these states, e.g. --filter=working,idle. Same sense as status.
  --json        Raw event records, one per line, for a caller that parses them.
  --since-seq <n> Resume after this durable sequence; it survives daemon restarts, but
                history is bounded by the events retention window. A pruned range is
                reported as a history gap before retained events are replayed.
Five event types, each one line: 'transition' (oldState->newState with dispatchId, task, cost,
ctxPercent), 'asking' (the agent is blocked on a question; askCount counts the daemon's re-asks
on questions.renag_ms, gaveUp marks the last), 'message' (mail a worker sent its spawner with
orch_send; the text is on the line; always here when the direction's mail setting is events,
mail.to_spawner for a worker writing its spawner and mail.to_worker for every other mail,
otherwise only when the recipient has no prompt to type into), 'closed' (the agent ended), 'task' (a queue task changed
state). A fresh subscribe receives live events only; history comes back solely via --since-seq.
'seq' is that agent's transition ordinal and (key, seq) identifies an event. The daemon already
suppresses an identical repeat of one agent's transition for two minutes, so no dedupe is needed.
Notifications are delivered by orchd from settings.json sinks, not by this command.
An attached events stream counts as daemon usage: orchd will not idle-shutdown while one is open.
`,
  notify: `orch notify test [--state <state>]
Send a synthetic transition through each notification sink configured in settings.json.
  --state       The presence state to fake (default: done).
`,
  questions: `orch questions [--json] [--local]
Read each live agent's pending question from its status record. Answer one with: orch answer <target> "<text>".
An unanswered question is re-asked by the daemon every questions.renag_ms, up to
questions.renag_limit times; each re-ask is an 'asking' event with askCount, and the last
sets gaveUp. A blocked agent is the most expensive idle: answer within seconds.
  --json        Machine-readable rows.
  --local       Skip configured remote hosts.
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
  dispatch: `orch dispatch <target> "<prompt>" | --file <path>|- [--with <path>]... [--keep-context] [--raw] [--model <model[:thinking]>] [--agent <adapter>]
Durably accept a prompt through orchd: the write lands in the outbox and survives restarts.
The target starts the work on a CLEAN session: dispatch clears the context first,
then re-pins the model, then sends. Prints the dispatch id; 'orch status --json'
echoes it as .dispatchId once the agent runs that prompt.
Prints \`Delivered to <recipient> (dispatch <id>)\`, or \`Queued to <recipient> (dispatch <id>): no bridge ack within <timeouts.dispatch_ack_ms>ms\`.
A queued dispatch is durable: orchd retries every \`daemon.outbox_drain_ms\` and re-pushes the moment the bridge attaches.
  --file        Read the prompt from a file, or from stdin with '-', instead of argv.
  --with        A file or directory the agent opens for context when the task needs it,
                not inlined into the prompt. Must exist. Repeat once per path.
  --keep-context  Send onto the session the agent already has, without clearing it.
  --raw         Send the exact prompt, no worker header.
  --model       Pin the model (and optional thinking effort) for this dispatch. A short name
                (luna) expands to the one listed, allowed model that contains it.
  --agent       Route through a specific adapter instead of the recorded one.
Governance flags (--steal, --cross-space) are operator-only; a spawned agent's are refused.
`,
  answer: `orch answer <target> "<text>"
Answer the question the agent is asking. Refused when it is not asking.
`,
  pipe: `orch pipe <src> <dst> ["instruction"]
Send a completed result from one agent to another through orchd, with an optional instruction.
`,
  broadcast: `orch broadcast "<text>" [target ...|--all]
Steer the named targets (or all of the caller's agents) through orchd.
`,
  model: `orch model <target> <model[:thinking]>
Durably accept a model change through orchd. Model names use the target harness's own vocabulary;
a short name (luna) expands to the one listed, allowed model that contains it, and several
matches are refused by name. See 'orch models' for what each installed harness offers.
`,
  steer: `orch steer <target> <text...>
Durably accept a mid-run steer through orchd; orchd pushes it down the agent's bridge link;
the reply says whether the agent applied it.
`,
  wait: `orch wait <target> [--status done|idle|working|blocked] [--timeout ms]
Block until the pane reaches a status.
  --status      The state to wait for (default: done).
  --timeout     Give up after this many milliseconds (default: 300000).
`,
  result: `orch result <target>... [--force] [--json]
Print each target's result (results.jsonl or session fallback); several targets print under \`== <target>\` headers, or as a JSON array with --json.
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
Use after 'bun run build:orch:dev'. reload = same session; reset = new session; restart = new process.
`,
  reset: `orch reset <target>... | --all [--model M]     (alias: orch new)
Start a fresh session/context in the same pane, then pin M (else the tuning the agent holds, else
that harness's defaults.models entry). Dispatch already clears the session itself; reset is for
clearing the context without sending work. A short name for M expands like spawn's --model.
`,
  restart: `orch restart <target>... | --all [--cmd pi]
Fully close the harness process and relaunch it.
  --cmd         The command to relaunch with (default: the recorded adapter command).
`,
  spawn: `orch spawn <name> [<name> ...] [--tab L] [--dir P] [--cmd C] [--model M ...]
          [--agent A] [--backend B] [--space S] [--prompt T ...] [--file P|- ...] [--with P]...
          [--tasks FILE] [--worktree] [--json]
Fresh tab, balanced-tiled (2=side-by-side, 3=2+1, 4=2x2, ...).
A whole fleet is one command: --prompt, --file and --model each take one value for every
agent or exactly N values, one per agent in positional order, so each agent starts on its
own spec and its own model.
Five settings can refuse a spawn, and the refusal names the one that fired:
fleet.max_agents_per_pack, fleet.max_agents_per_tab (what the tab holds plus what you asked
for), fleet.max_agents_per_space.<space>, fleet.max_agents_total, and fleet.max_depth (how
deep a spawner may itself have been spawned). Read 'orch status --capacity' before sizing.
Bridge-capable adapters wait up to 60 s for each agent's bridge to attach.
  \`  ok      <handle>  <name>\`
  \`  STALLED <handle>  <name> - bridge never attached; try: orch restart <name>\`
A stall exits 1. An adapter with no bridge prints:
  \`warning: <adapter> writes no presence record at session start - <count> agent(s) UNVERIFIED; check 'orch status' before dispatching\`
NAMING AN AGENT IS PART OF CREATING IT: the positional arguments ARE the names,
one per agent, and how many you give is how many panes you get. There is no
default name, no prefix numbering, and no --name flag — name each pane for the
SLICE it holds, so you never pay for a rename afterwards.
  orch spawn api-types api-routes api-guards
Every name is validated before any tab or pane is created — a refused spawn
leaves nothing behind.
  --tab         Label for the new tab; an existing tab's label fills that tab.
  --dir         Directory the agents start in. Defaults to the spawner's own.
  --model       One model for every agent, or repeat exactly N times for per-agent models.
                A short name (luna:high) expands to the one listed, allowed model that
                contains it; several matches are refused by name.
  --agent       Adapter id (pi, claude, codex, ...).
  --backend     Plexer id (herdr, tmux, headless). Inside a plexer the fleet lands beside you.
                Outside every plexer the default is headless; name a plexer here to open its
                own home, which the user grants. headless needs --prompt or --file: a detached
                agent runs the prompt and exits.
  --prompt      One task for every agent, or repeat exactly N times for per-agent tasks.
  --file        One task file for every agent (or '-' for stdin), or repeat exactly N times
                for per-agent task files. Mirrors --prompt.
  --with        A file or directory the agents open for context when the task needs it,
                not inlined into the prompt. Must exist. Repeat once per path.
  --tasks       JSON file containing exactly N task strings (alternative to --prompt).
  --space       File the fleet in a named orch space ('orch space list'). Never a plexer id.
  --worktree    Give each agent its own git worktree. Collect with 'orch review'.
  --json        Machine-readable spawn report.
`,
  tile: `orch tile <tab|pane> <name> [--cmd C] [--dir P] [--model M] [--agent A] [--backend B]
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
Delete an agent record. Its JSONL history stays until retention ages it out. Refuses while the
process or any descendant is live; ending is never gated by the lease.
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
  tab: `orch tab new [--label X] [--workspace ID] [--dir P]
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
  clean: `orch clean [--force] [--worktrees]
Remove agent dirs that name no agent and close queued writes to dead agents.
The daemon reaps a gone agent's records on its next sweep; its JSONL history ages out
under retention.ended_agents_days. --force does both now.
  --force       Also delete every dead agent's records and history dir; with --worktrees, discard unmerged work.
  --worktrees   Also remove orphaned worktrees that are empty or merged.
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
  --no-skills   Skip them without asking; nothing is written to your skill dirs.
  --refresh     Ask every harness for its models again instead of using the stored
                catalogues. Slower; for a model installed since the last refresh.
Setup asks before installing skills. The real files go to ~/.agents/skills, the
cross-harness standard, and each harness that reads its own directory gets a symlink
into that store. Change the answer later with 'orch settings skills'.
`,
  settings: `orch settings [--json] [--harness=<id>] [--plexer=<id>]
orch settings models [--harness=<id>] [--model=<model[:thinking]>] [--refresh]
orch settings thinking [<level>] [--harness=<id>] [--clear]
orch settings skills [--install|--no-install] [--store=<dir>] [--link=<dir>[,<dir>...]]
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
  skills        Turn the skill install on or off and choose where it writes. --install
                writes every packaged skill now; --no-install records the refusal and
                leaves the files already there alone. --store names the one directory
                holding the real files, ~/.agents/skills by default; --link names the
                harness directories symlinked into it, ~/.claude/skills by default.
                A leading ~ expands to your home directory.
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
