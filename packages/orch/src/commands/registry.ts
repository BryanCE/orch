/** Every orch command, declared once. The parser reads the flags; `orch help` reads all of it. */

import { parseInvocation } from "../cli/parse.ts";
import type { CommandSpec, FlagSpec, Invocation } from "../cli/spec.ts";

const JSON_FLAG: FlagSpec = { name: "--json", arity: "none", help: "Machine-readable output." };
const FORCE: FlagSpec = { name: "--force", arity: "none", help: "Act on an agent another orch holds." };
const ALL: FlagSpec = { name: "--all", arity: "none", help: "Every agent the caller may act on, instead of named targets." };
const STEAL: FlagSpec = { name: "--steal", arity: "none", help: "Operator-only. Take the lease from a live holder." };
const CROSS_SPACE: FlagSpec = { name: "--cross-space", arity: "none", help: "Operator-only. Reach an agent outside your space." };
const GOVERNANCE: readonly FlagSpec[] = [STEAL, CROSS_SPACE];
const RAW: FlagSpec = { name: "--raw", arity: "none", help: "Send the exact prompt, with no worker header." };
const MODEL: FlagSpec = { name: "--model", arity: "one", placeholder: "<model[:thinking]>", help: "Pin the model. A short name expands to the one listed, allowed model that contains it." };
const THINKING: FlagSpec = { name: "--thinking", arity: "one", placeholder: "<level>", help: "Thinking effort: off, minimal, low, medium, high, xhigh, max." };
const ADAPTER: FlagSpec = { name: "--agent", aliases: ["--adapter"], arity: "one", placeholder: "<adapter>", help: "Adapter id: pi, claude, codex." };
const BACKEND: FlagSpec = { name: "--backend", arity: "one", placeholder: "<plexer>", help: "Plexer id: herdr, tmux, headless." };
const DIR: FlagSpec = { name: "--dir", arity: "one", placeholder: "<path>", help: "Directory the agent starts in. Defaults to the spawner's own." };
const CMD: FlagSpec = { name: "--cmd", arity: "one", placeholder: "<command>", help: "Harness command to launch. Defaults to the adapter's own." };
const LINES: FlagSpec = { name: "-n", arity: "one", placeholder: "<count>", help: "How many lines." };
const SPACE_WIDE: FlagSpec = { name: "--space-wide", arity: "none", help: "Also the other orchs' agents in your space. Never past it." };
const LOCAL: FlagSpec = { name: "--local", arity: "none", help: "Skip configured remote hosts." };

const STREAM_FLAGS: readonly FlagSpec[] = [
  { name: "--agent", arity: "many", placeholder: "<name>", help: "Watch one agent by name. Repeatable." },
  { name: "--agent-id", arity: "many", placeholder: "<id>", help: "Watch one agent by identity key. Repeatable." },
  SPACE_WIDE,
  { name: "--filter", arity: "one", placeholder: "<state,...>", help: "Drop these states, e.g. --filter=working,idle." },
  { name: "--since-seq", arity: "one", placeholder: "<n>", help: "Resume after this durable sequence. A pruned range is reported as a gap." },
  { name: "--once", arity: "none", help: "Print what is buffered and exit instead of streaming." },
  JSON_FLAG,
];

/** Accepted on every command. */
export const GLOBAL_FLAGS: readonly FlagSpec[] = [
  { name: "--help", aliases: ["-h"], arity: "none", help: "Print this command's help." },
  { name: "--stale-ok", arity: "none", help: "Run against a daemon whose code hash differs from the installed build." },
];

const OBSERVE: readonly CommandSpec[] = [
  {
    name: "status", section: "observe",
    usage: "orch status [--json] [--capacity] [--live] [--agent <name|id>] [--filter <column|state,...>]",
    summary: "Fleet table with cost and context. The default command.",
    flags: [
      { name: "--capacity", arity: "none", help: "Print only the capacity line." },
      JSON_FLAG,
      { name: "--human", arity: "none", help: "Render harness and directory details for a person." },
      SPACE_WIDE,
      { name: "--space", arity: "one", placeholder: "<space>", help: "Read one named space." },
      { name: "--agent", arity: "one", placeholder: "<name|id>", help: "Show one agent, whatever its state." },
      { name: "--filter", arity: "one", placeholder: "<column|state,...>", help: "Drop these columns and rows in these states." },
      { name: "--all-panes", arity: "none", help: "Also list panes orch did not spawn." },
      LOCAL,
      { name: "--offline", arity: "none", help: "Read presence files only. Never dials or starts orchd." },
      { name: "--live", arity: "none", help: "Full-screen table re-rendered on every daemon event. TTY only; q or esc quits." },
    ],
  },
  {
    name: "monitor", section: "observe",
    usage: "orch monitor [--agent <name>] [--space-wide] [--since-seq <n>] [--json]",
    summary: "Push stream of the states an orch acts on. Arm it as a Monitor.",
    flags: STREAM_FLAGS,
  },
  {
    name: "events", section: "observe",
    usage: "orch events [--agent <name>] [--space-wide] [--filter <state,...>] [--since-seq <n>] [--json]",
    summary: "Every state transition, mid-turn flips included.",
    flags: STREAM_FLAGS,
  },
  {
    name: "questions", section: "observe",
    usage: "orch questions [--json] [--local]",
    summary: "Agents blocked on a question.",
    flags: [JSON_FLAG, LOCAL, { name: "--all", arity: "none", help: "Operator-only. Every agent on the machine." }],
  },
  {
    name: "runs", section: "observe",
    usage: "orch runs [<target>] [-n <count>] [--json]",
    summary: "Dispatch history, newest first.",
    flags: [{ ...LINES, help: "Limit the number of rows." }, JSON_FLAG],
  },
  {
    name: "logs", section: "observe",
    usage: "orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]",
    summary: "Structured diagnosis records.",
    flags: [
      { name: "--since", arity: "one", placeholder: "<when>", help: "Epoch milliseconds or a date/time." },
      { name: "--level", arity: "one", placeholder: "<level>", help: "Exact severity to include." },
      { name: "--agent", arity: "one", placeholder: "<id>", help: "Filter by minted agent id." },
      { name: "--dispatch", arity: "one", placeholder: "<id>", help: "Filter by dispatch id." },
      { ...JSON_FLAG, help: "Emit raw records." },
    ],
  },
];

const DISPATCH: readonly CommandSpec[] = [
  {
    name: "dispatch", section: "dispatch",
    usage: "orch dispatch <target> \"<prompt>\" | --file <path>|- [--with <path>]... [--keep-context] [--raw] [--model <model>]",
    summary: "Send a task onto a clean session. Durable.",
    flags: [
      { name: "--file", arity: "one", placeholder: "<path>|-", help: "Read the prompt from a file, or from stdin with '-'." },
      { name: "--with", arity: "many", placeholder: "<path>", help: "A file or directory the agent opens for context. Must exist. Repeat per path." },
      { name: "--keep-context", arity: "none", help: "Send onto the session the agent already has, without clearing it." },
      RAW,
      MODEL,
      THINKING,
      { ...ADAPTER, help: "Route through this adapter instead of the recorded one." },
      JSON_FLAG,
      ...GOVERNANCE,
    ],
  },
  {
    name: "run", section: "dispatch",
    usage: "orch run <target> \"<prompt>\" [--raw]",
    summary: "Queue a prompt with the worker header.",
    flags: [RAW, JSON_FLAG, ...GOVERNANCE],
  },
  {
    name: "answer", section: "dispatch",
    usage: "orch answer <target> \"<text>\"",
    summary: "Answer the question the agent is asking.",
    flags: [JSON_FLAG, ...GOVERNANCE],
  },
  {
    name: "steer", section: "dispatch",
    usage: "orch steer <target> <text...>",
    summary: "Mid-run instruction. The reply says if it applied.",
    flags: [JSON_FLAG, ...GOVERNANCE],
  },
  {
    name: "broadcast", section: "dispatch",
    usage: "orch broadcast \"<text>\" [<target>...|--all]",
    summary: "Steer several.",
    flags: [{ ...ALL, help: "Every agent the caller holds an open lease on. Operator-only." }, FORCE, JSON_FLAG],
  },
  {
    name: "pipe", section: "dispatch",
    usage: "orch pipe <src> <dst> [\"instruction\"]",
    summary: "Hand one agent's result to another.",
    flags: [JSON_FLAG],
  },
  {
    name: "model", section: "dispatch",
    usage: "orch model <target> <model[:thinking]>",
    summary: "Change the model.",
    flags: [{ name: "--no-wait", arity: "none", help: "Return before the agent confirms the change." }, JSON_FLAG, ...GOVERNANCE],
  },
  {
    name: "wait", section: "dispatch",
    usage: "orch wait <target> [--status <state>] [--timeout <ms>]",
    summary: "Block until one agent reaches a state.",
    flags: [
      { name: "--status", arity: "one", placeholder: "<state>", help: "The state to wait for: done, idle, working, blocked. Default done." },
      { name: "--timeout", arity: "one", placeholder: "<ms>", help: "Give up after this many milliseconds." },
      JSON_FLAG,
    ],
  },
];

const COLLECT: readonly CommandSpec[] = [
  {
    name: "result", section: "collect",
    usage: "orch result <target>... [--force] [--json]",
    summary: "Each target's result.",
    flags: [{ ...FORCE, help: "Read an agent another orch owns." }, { ...JSON_FLAG, help: "One JSON array, one entry per target." }],
  },
  {
    name: "tail", section: "collect",
    usage: "orch tail <target> [-n <count>]",
    summary: "Last N session entries.",
    flags: [{ ...LINES, help: "How many entries. Default 20." }, JSON_FLAG],
  },
  {
    name: "peek", section: "collect",
    usage: "orch peek <target> [-n <lines>]",
    summary: "What is on the pane screen now.",
    flags: [{ ...LINES, help: "How many screen lines. Default 25." }, JSON_FLAG],
  },
  {
    name: "session", section: "collect",
    usage: "orch session <target>",
    summary: "Session path and stats.",
    flags: [JSON_FLAG],
  },
];

const QUEUE_SCOPE: readonly FlagSpec[] = [
  { name: "--agent", arity: "one", placeholder: "<target>", help: "Scope the task to one agent." },
  { name: "--pack", arity: "one", placeholder: "<target>", help: "Scope the task to that agent's pack." },
  { name: "--space", arity: "one", placeholder: "<space>", help: "Scope the task to a space." },
];

const QUEUE: readonly CommandSpec[] = [
  {
    name: "queue", section: "queue",
    usage: "orch queue <add|list|history|cancel|edit|take-on|reap|intake> ...",
    summary: "Durable task queue.",
    flags: [],
    subcommands: [
      {
        name: "add", usage: "orch queue add \"<task text>\" [--agent <target>|--pack <target>|--space <space>] [--worktree] [--json]",
        summary: "Add a task and print its id.",
        flags: [
          ...QUEUE_SCOPE,
          { name: "--host", arity: "one", placeholder: "<host>", help: "Enqueue on a configured remote host." },
          { name: "--worktree", arity: "none", help: "Run it in a fresh git worktree." },
          JSON_FLAG,
        ],
      },
      { name: "list", usage: "orch queue list [--json]", summary: "Queued, claimed, and settled tasks.", flags: [JSON_FLAG] },
      { name: "history", usage: "orch queue history [--json]", summary: "Completed, failed, and cancelled tasks.", flags: [JSON_FLAG] },
      { name: "cancel", usage: "orch queue cancel <id> [--json]", summary: "Cancel an unclaimed task.", flags: [JSON_FLAG] },
      { name: "edit", usage: "orch queue edit <id> <task text> [--json]", summary: "Replace an unclaimed task's text.", flags: [JSON_FLAG] },
      {
        name: "take-on", usage: "orch queue take-on <id> [--agent <target>] [--json]",
        summary: "Claim a task for an agent now.",
        flags: [{ name: "--agent", arity: "one", placeholder: "<target>", help: "The agent that takes it. Default: the caller." }, JSON_FLAG],
      },
      { name: "reap", usage: "orch queue reap <id> [--json]", summary: "Delete a settled task.", flags: [JSON_FLAG] },
      {
        name: "intake", usage: "orch queue intake [<space>] [--close] [--agent <target>] [--json]",
        summary: "Pull queued tasks into an agent.",
        flags: [
          { name: "--close", arity: "none", help: "Close the agent when the intake settles." },
          { name: "--agent", arity: "one", placeholder: "<target>", help: "The agent that takes them. Default: the caller." },
          JSON_FLAG,
        ],
      },
    ],
  },
  {
    name: "work", section: "queue",
    usage: "orch work [--once] [--json]",
    summary: "Assign queued tasks to idle agents.",
    flags: [{ name: "--once", arity: "none", help: "One assignment pass instead of the daemon's loop." }, JSON_FLAG],
  },
];

const REVIEW: readonly CommandSpec[] = [
  {
    name: "review", section: "review",
    usage: "orch review [list|approve <target>|reject <target> -m \"feedback\"]",
    summary: "Review done worktree agents.",
    flags: [],
    subcommands: [
      { name: "list", usage: "orch review list [--json]", summary: "Done worktree agents with commits ahead of their base.", flags: [JSON_FLAG] },
      { name: "approve", usage: "orch review approve <target> [--json]", summary: "Merge the branch and remove the worktree.", flags: [JSON_FLAG] },
      {
        name: "reject", usage: "orch review reject <target> -m \"feedback\" [--json]",
        summary: "Re-dispatch feedback into the same worktree.",
        flags: [{ name: "-m", arity: "one", placeholder: "<feedback>", help: "The feedback to send." }, JSON_FLAG],
      },
    ],
  },
];

/** Where and how an agent launches. Shared by spawn and tile; each adds its own model flag. */
const AGENT_LAUNCH: readonly FlagSpec[] = [DIR, CMD, THINKING, ADAPTER, BACKEND];

const AGENTS: readonly CommandSpec[] = [
  {
    name: "spawn", section: "agents",
    usage: "orch spawn <name>... --tab <label> [--file <path>]... [--model <model>]... [--dir <path>] [--worktree]",
    summary: "One fleet, one command. The names are the agents.",
    flags: [
      { name: "--tab", arity: "one", placeholder: "<label>", help: "The tab, a domain. An existing tab with this label is filled. Without it the tab takes the first agent's name." },
      { ...MODEL, arity: "many", help: "One model for every agent, or repeat exactly N times for per-agent models." },
      ...AGENT_LAUNCH,
      { name: "--space", arity: "one", placeholder: "<space>", help: "File the fleet in a named orch space. Never a plexer id." },
      { name: "--prompt", arity: "many", placeholder: "<text>", help: "One task for every agent, or repeat exactly N times." },
      { name: "--file", arity: "many", placeholder: "<path>|-", help: "One task file for every agent, or repeat exactly N times. '-' reads stdin." },
      { name: "--with", arity: "many", placeholder: "<path>", help: "A file or directory the agents open for context. Must exist. Repeat per path." },
      { name: "--tasks", arity: "one", placeholder: "<file>", help: "JSON file of exactly N task strings." },
      { name: "--worktree", arity: "none", help: "Give each agent its own git worktree. Collect with 'orch review'." },
      JSON_FLAG,
    ],
  },
  {
    name: "tile", section: "agents",
    usage: "orch tile <tab|pane> <name> [--model <model>] [--dir <path>]",
    summary: "Add one named agent to an existing tab.",
    flags: [MODEL, ...AGENT_LAUNCH, JSON_FLAG],
  },
  {
    name: "rename", section: "agents",
    usage: "orch rename <target> <name> [--pane]",
    summary: "Set the agent name. --pane sets the border label.",
    flags: [{ name: "--pane", arity: "none", help: "Set only the pane border label and leave the agent name alone." }, FORCE, JSON_FLAG],
  },
  {
    name: "reset", aliases: ["new"], section: "agents",
    usage: "orch reset <target>... | --all [--model <model>]",
    summary: "Fresh session, same agent (alias: new).",
    flags: [ALL, MODEL, THINKING, FORCE, JSON_FLAG],
  },
  {
    name: "reload", section: "agents",
    usage: "orch reload <target>... | --all",
    summary: "Live-reload code after a rebuild.",
    flags: [ALL, FORCE, JSON_FLAG],
  },
  {
    name: "restart", section: "agents",
    usage: "orch restart <target>... | --all [--cmd <command>]",
    summary: "Relaunch the harness process.",
    flags: [ALL, { ...CMD, help: "The command to relaunch with. Default: the recorded adapter command." }, FORCE, JSON_FLAG],
  },
  {
    name: "close", aliases: ["kill"], section: "agents",
    usage: "orch close <target>... | --all [--stream]",
    summary: "Close (alias: kill).",
    flags: [
      { ...ALL, help: "Every agent orch spawned that the caller may close. Never a pane orch did not spawn." },
      { name: "--stream", arity: "none", help: "Also kill the caller's 'orch monitor' or 'orch events' stream." },
      JSON_FLAG,
    ],
  },
  { name: "abort", section: "agents", usage: "orch abort <target>", summary: "Cancel the current turn.", flags: [JSON_FLAG] },
  { name: "detach", section: "agents", usage: "orch detach <target>", summary: "Release the lease. The agent keeps running.", flags: [STEAL, JSON_FLAG] },
  {
    name: "adopt", section: "agents",
    usage: "orch adopt <target> | --all",
    summary: "Take an unleased agent.",
    flags: [{ ...ALL, help: "Every unleased agent." }, STEAL, JSON_FLAG],
  },
  {
    name: "reap", section: "agents",
    usage: "orch reap [<target>] [--dead]",
    summary: "Delete an agent record.",
    flags: [{ name: "--dead", arity: "none", help: "Non-interactive sweep of provably-dead agents." }, JSON_FLAG],
  },
  {
    name: "grant", section: "agents",
    usage: "orch grant [<hash>|--list]",
    summary: "Approve an action an agent was refused.",
    flags: [{ name: "--list", arity: "none", help: "Show what is waiting for approval." }],
  },
  { name: "focus", section: "agents", usage: "orch focus <target>", summary: "Jump the user's view to that pane.", flags: [FORCE, JSON_FLAG] },
  {
    name: "zoom", section: "agents",
    usage: "orch zoom <target> [--on|--off]",
    summary: "Zoom the pane full-tab.",
    flags: [
      { name: "--on", arity: "none", help: "Zoom in." },
      { name: "--off", arity: "none", help: "Zoom out." },
      { name: "--toggle", arity: "none", help: "Flip. The default." },
      FORCE,
      JSON_FLAG,
    ],
  },
  {
    name: "move", section: "agents",
    usage: "orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label <label>]",
    summary: "Move a pane to another tab.",
    flags: [
      { name: "--tab", arity: "one", placeholder: "<tab_id|label>", help: "The tab to move into." },
      { name: "--split", arity: "one", placeholder: "right|down", help: "Where the pane lands in that tab." },
      { name: "--new-tab", arity: "none", help: "Move into a fresh tab." },
      { name: "--label", arity: "one", placeholder: "<label>", help: "Label for the fresh tab." },
      FORCE,
      JSON_FLAG,
    ],
  },
  { name: "keys", section: "agents", usage: "orch keys <target> <key>...", summary: "Send raw keys.", flags: [FORCE, JSON_FLAG] },
  {
    name: "panes", section: "agents",
    usage: "orch panes [--all] [--json]",
    summary: "Raw pane list, for scripts.",
    flags: [{ ...ALL, help: "Also panes orch did not spawn." }, JSON_FLAG],
  },
];

const TAB_TARGET_FLAGS: readonly FlagSpec[] = [FORCE, JSON_FLAG];

const TABS: readonly CommandSpec[] = [
  {
    name: "tabs", section: "tabs",
    usage: "orch tabs [--all] [--json]",
    summary: "List tabs.",
    flags: [{ ...ALL, help: "Also tabs orch did not create." }, JSON_FLAG],
  },
  {
    name: "tab", section: "tabs",
    usage: "orch tab <new|rename|close|focus> ...",
    summary: "Tab management.",
    flags: [],
    subcommands: [
      {
        name: "new", usage: "orch tab new [--label <label>] [--workspace <id>] [--dir <path>]",
        summary: "Create a tab. Prints the root pane id. Never steals focus.",
        flags: [
          { name: "--label", arity: "one", placeholder: "<label>", help: "The tab label." },
          { name: "--workspace", arity: "one", placeholder: "<id>", help: "The plexer's own grouping to create it in." },
          { ...DIR, help: "Directory the root pane starts in." },
          ...TAB_TARGET_FLAGS,
        ],
      },
      { name: "rename", usage: "orch tab rename <tab_id|label> <new-label>", summary: "Relabel a tab.", flags: TAB_TARGET_FLAGS },
      { name: "close", usage: "orch tab close <tab_id|label>", summary: "Close a tab.", flags: TAB_TARGET_FLAGS },
      { name: "focus", usage: "orch tab focus <tab_id|label>", summary: "Jump the user's view to that tab.", flags: TAB_TARGET_FLAGS },
    ],
  },
  {
    name: "space", section: "tabs",
    usage: "orch space <list|create <name>|rename <space> <name>|delete <space>|focus <space>>",
    summary: "orch's own grouping of related work.",
    flags: [JSON_FLAG],
    subcommands: [
      { name: "list", usage: "orch space list [--json]", summary: "List spaces by name.", flags: [JSON_FLAG] },
      { name: "create", usage: "orch space create <name> [--json]", summary: "Create a space, and its home where one can be held.", flags: [JSON_FLAG] },
      { name: "rename", usage: "orch space rename <space> <name> [--json]", summary: "Rename a space, and its home where it has one.", flags: [JSON_FLAG] },
      { name: "delete", usage: "orch space delete <space> [--json]", summary: "Delete an empty space, closing its home.", flags: [JSON_FLAG] },
      { name: "focus", usage: "orch space focus <space> [--json]", summary: "Focus a space's home.", flags: [JSON_FLAG] },
    ],
  },
];

const HARNESS: FlagSpec = { name: "--harness", aliases: ["--agent"], arity: "one", placeholder: "<id>", help: "One harness instead of every enabled one." };

const MAINTENANCE: readonly CommandSpec[] = [
  {
    name: "daemon", section: "maintenance",
    usage: "orch daemon <start|stop|status|reload> [--json]",
    summary: "The resident daemon (orchd).",
    flags: [],
    subcommands: [
      {
        name: "start", usage: "orch daemon start [--fg] [--json]",
        summary: "Spawn orchd detached.",
        flags: [{ name: "--fg", aliases: ["--foreground"], arity: "none", help: "Keep it attached to this terminal." }, JSON_FLAG],
      },
      { name: "stop", usage: "orch daemon stop [--json]", summary: "SIGTERM the daemon that holds this ORCH_DIR's lock.", flags: [JSON_FLAG] },
      { name: "status", usage: "orch daemon status [--json]", summary: "pid, uptime, code hash, transport, and subsystem health.", flags: [JSON_FLAG] },
      { name: "reload", usage: "orch daemon reload [--json]", summary: "Re-exec the daemon on the freshly installed code.", flags: [JSON_FLAG] },
    ],
  },
  {
    name: "doctor", section: "maintenance",
    usage: "orch doctor [--fix] [-y] [--json]",
    summary: "Check the install and fix it.",
    flags: [
      { name: "--fix", arity: "none", help: "On a TTY, open the fix menu." },
      { name: "--yes", aliases: ["-y"], arity: "none", help: "Apply every fix unattended. How CI and non-TTY repairs run." },
      JSON_FLAG,
    ],
  },
  {
    name: "clean", section: "maintenance",
    usage: "orch clean [--force] [--worktrees] [--json]",
    summary: "Remove dead agent dirs and orphaned worktrees.",
    flags: [
      { ...FORCE, help: "Also delete every dead agent's records and history dir. With --worktrees, discard unmerged work." },
      { name: "--worktrees", arity: "none", help: "Also remove orphaned worktrees that are empty or merged." },
      JSON_FLAG,
    ],
  },
  {
    name: "setup", section: "maintenance",
    usage: "orch setup [--agent <id,...>] [--backend <id,...>] [--model <harness>=<model>]... [--yes] [--skills|--no-skills]",
    summary: "Onboarding wizard.",
    flags: [
      { name: "--agent", aliases: ["--adapter", "--harness"], arity: "one", placeholder: "<id[,id...]>", help: "The adapters to enable. The first is the default." },
      { name: "--backend", aliases: ["--plexer"], arity: "one", placeholder: "<id[,id...]>", help: "The plexers to enable. The first is the default." },
      { ...MODEL, arity: "many", placeholder: "<harness>=<model[:thinking]>", help: "Launch model per harness. A bare model applies only where that harness lists it." },
      { name: "--runtime", arity: "one", placeholder: "<runtime>", help: "The JS runtime orch runs under." },
      { name: "--yes", aliases: ["-y"], arity: "none", help: "Install missing dependencies without asking." },
      { name: "--no-install", arity: "none", help: "Report what is missing without installing." },
      { name: "--copy", arity: "none", help: "Copy shims instead of symlinking." },
      { name: "--skills", arity: "none", help: "Install orch's packaged skills without asking." },
      { name: "--no-skills", arity: "none", help: "Skip the skills without asking." },
      { name: "--refresh", arity: "none", help: "Ask every harness for its models again instead of using the stored catalogues." },
      { name: "--smoke", arity: "none", help: "Spawn one headless agent at the end to prove the install." },
    ],
  },
  {
    name: "settings", section: "maintenance",
    usage: "orch settings [<key> <value>] [--json] [--harness <id>] [--plexer <id>]",
    summary: "Every effective setting and its source.",
    flags: [
      JSON_FLAG,
      { ...HARNESS, help: "Switch the active default adapter." },
      { name: "--plexer", aliases: ["--backend"], arity: "one", placeholder: "<id>", help: "Switch the active default plexer." },
    ],
    subcommands: [
      {
        name: "models", usage: "orch settings models [--harness <id>] [--model <model>] [--refresh]",
        summary: "Re-pick, per harness: launch model, picker quicklist, and the launchable set.",
        flags: [
          HARNESS,
          MODEL,
          { name: "--refresh", arity: "none", help: "Ask the harnesses again instead of using the stored catalogues." },
        ],
      },
      {
        name: "thinking", usage: "orch settings thinking [<level>] [--harness <id>] [--clear]",
        summary: "Thinking effort for every launch, independent of the model.",
        flags: [{ ...HARNESS, aliases: [], help: "Set or clear that harness's override instead of the global default." }, { name: "--clear", arity: "none", help: "Remove the override named by --harness." }],
      },
      {
        name: "skills", usage: "orch settings skills [--install|--no-install] [--store <dir>] [--link <dir>[,<dir>...]]",
        summary: "Turn the skill install on or off and choose where it writes.",
        flags: [
          { name: "--install", arity: "none", help: "Write every packaged skill now." },
          { name: "--no-install", arity: "none", help: "Record the refusal and leave files already there alone." },
          { name: "--store", arity: "one", placeholder: "<dir>", help: "The one directory holding the real files. Default ~/.agents/skills." },
          { name: "--link", arity: "one", placeholder: "<dir>[,<dir>...]", help: "Harness directories symlinked into the store. Default ~/.claude/skills." },
        ],
      },
      {
        name: "notify", usage: "orch settings notify [list|add <sink> [--<field>=<value>]... [--on <state,...>]|remove <sink>]",
        summary: "The sinks orchd delivers notifications through.",
        flags: [JSON_FLAG],
        subcommands: [
          { name: "list", usage: "orch settings notify list [--json]", summary: "Each sink, the states it fires on, and where it delivers.", flags: [JSON_FLAG] },
          {
            name: "add", usage: "orch settings notify add <sink> [--<field>=<value>]... [--on <state,...>]",
            summary: "Record one sink. A sink already configured is replaced, keeping fields this call does not name.",
            flags: [{ name: "--on", arity: "one", placeholder: "<state,...>", help: "States it fires on. Default blocked,error,done." }],
            openFlags: true,
          },
          { name: "remove", usage: "orch settings notify remove <sink>", summary: "Stop delivering through that sink.", flags: [] },
        ],
      },
    ],
  },
  {
    name: "models", section: "maintenance",
    usage: "orch models [--agent <id>] [--preferred] [--search <text>] [--pick <index|spec>] [--json]",
    summary: "Every model each harness can run.",
    flags: [
      { ...HARNESS, name: "--agent", aliases: ["--harness"], help: "One harness instead of every enabled one." },
      { name: "--preferred", arity: "none", help: "Only the quicklist." },
      { name: "--search", arity: "one", placeholder: "<text>", help: "Match against spec or label, case-insensitive." },
      { name: "--pick", arity: "one", placeholder: "<index|spec>", help: "Print one full spec for scripting." },
      JSON_FLAG,
    ],
  },
  {
    name: "notify", section: "maintenance",
    usage: "orch notify test [--state <state>]",
    summary: "Fire every notification sink.",
    flags: [],
    subcommands: [
      {
        name: "test", usage: "orch notify test [--state <state>] [--json]",
        summary: "Send a synthetic transition through each configured sink.",
        flags: [{ name: "--state", arity: "one", placeholder: "<state>", help: "The state to fake. Default blocked." }, JSON_FLAG],
      },
    ],
  },
  { name: "version", aliases: ["-V", "--version"], section: "maintenance", usage: "orch version", summary: "Installed version.", flags: [] },
  { name: "help", aliases: ["-h", "--help"], section: "maintenance", usage: "orch help [<command>]", summary: "This map, or one command's detail.", flags: [] },
];

export const COMMANDS: readonly CommandSpec[] = [...OBSERVE, ...DISPATCH, ...COLLECT, ...QUEUE, ...REVIEW, ...AGENTS, ...TABS, ...MAINTENANCE];

/** The top-level spec a command word names, by name or alias. */
export function commandSpec(word: string): CommandSpec | undefined {
  return COMMANDS.find((spec) => spec.name === word || spec.aliases?.includes(word));
}

/** A command's own argv, parsed against its spec. The one parse every `cmd*` does first. */
export function parseCommand(name: string, args: readonly string[]): Invocation {
  const spec = commandSpec(name);
  if (spec === undefined) throw new Error(`no command spec named ${name}`);
  return parseInvocation(spec, args, GLOBAL_FLAGS);
}
