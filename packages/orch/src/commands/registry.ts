// fallow-ignore-file code-duplication -- declarative command table; similar flag lists are data, not logic.
/** Every orch command, declared once. The parser reads the flags; `orch help` and every usage line read all of it. */

import { DURATION_FORMS } from "../cli/duration.ts";
import { parseInvocation } from "../cli/parse.ts";
import type { CommandSpec, FlagSpec, Invocation } from "../cli/spec.ts";

const ALL: FlagSpec = { name: "--all", arity: "none", help: "Every agent you may act on, instead of named targets." };
const STEAL: FlagSpec = { name: "--steal", arity: "none", help: "Act on an agent a live foreign holder leases." };
const STEAL_LEASE: FlagSpec = { ...STEAL, help: "Operator-only. Take the lease from a live holder." };
const SPACE: FlagSpec = { name: "--space", arity: "one", placeholder: "<space>", help: "Only that orch space." };
const REACH_SPACE: FlagSpec = { ...SPACE, help: "Resolve the target in that space. Operator-only outside your own." };
const DRIVE: readonly FlagSpec[] = [STEAL_LEASE, REACH_SPACE];
const RAW: FlagSpec = { name: "--raw", arity: "none", help: "Send the exact prompt, with no worker header." };
const MODEL: FlagSpec = { name: "--model", arity: "one", placeholder: "<model[:thinking]>", help: "Pin the model. A short name expands to the one listed, allowed model that contains it." };
const THINKING: FlagSpec = { name: "--thinking", arity: "one", placeholder: "<level>", help: "Thinking effort: off, minimal, low, medium, high, xhigh, max." };
const HARNESS: FlagSpec = { name: "--harness", arity: "one", placeholder: "<harness>", help: "Harness id: pi, omp, claude, codex." };
const PLEXER: FlagSpec = { name: "--plexer", arity: "one", placeholder: "<plexer>", help: "Plexer id: herdr, tmux, orca, headless." };
const DIR: FlagSpec = { name: "--dir", arity: "one", placeholder: "<path>", help: "Directory the agent starts in. Default: the spawner's own." };
const CMD: FlagSpec = { name: "--cmd", arity: "one", placeholder: "<command>", help: "Harness command to launch. Default: the harness's own." };
const COUNT: FlagSpec = { name: "-n", arity: "one", placeholder: "<count>", help: "How many." };
const LOCAL: FlagSpec = { name: "--local", arity: "none", help: "Skip configured remote hosts." };
const ONLY: FlagSpec = { name: "--only", arity: "one", placeholder: "<state,...>", help: "Keep only rows in these states." };
const HIDE: FlagSpec = { name: "--hide", arity: "one", placeholder: "<state,...>", help: "Drop rows in these states." };

const STREAM_FLAGS: readonly FlagSpec[] = [
  { name: "--agent", arity: "many", placeholder: "<target>", help: "Watch one agent. Repeatable." },
  { ...ALL, help: "Operator-only. Also the other orchs' agents in your space. Never past it." },
  ONLY,
  HIDE,
  { name: "--since-seq", arity: "one", placeholder: "<seq>", help: "Resume after this durable sequence. A pruned range is reported as a gap." },
  { name: "--once", arity: "none", help: "Print what is buffered and exit instead of streaming." },
];

/** Accepted on every command. */
export const GLOBAL_FLAGS: readonly FlagSpec[] = [
  { name: "--help", aliases: ["-h"], arity: "none", help: "Print this command's help." },
  { name: "--json", arity: "none", help: "Machine-readable output." },
  { name: "--stale-ok", arity: "none", help: "Run against a daemon whose code hash differs from the installed build." },
];

const OBSERVE: readonly CommandSpec[] = [
  {
    name: "status", section: "observe",
    summary: "Fleet table with cost and context. The default command.",
    flags: [
      { name: "--capacity", arity: "none", help: "Print only the capacity line." },
      { name: "--human", arity: "none", help: "Render harness and directory details for a person." },
      { ...ALL, help: "Operator-only. Also the other orchs' agents in your space, and panes orch did not spawn." },
      { ...SPACE, help: "Read one named space." },
      { name: "--agent", arity: "one", placeholder: "<target>", help: "Show one agent, whatever its state." },
      ONLY,
      { ...HIDE, placeholder: "<column|state,...>", help: "Drop these columns, and rows in these states." },
      LOCAL,
      { name: "--offline", arity: "none", help: "Read presence files only. Never dials or starts orchd." },
      { name: "--live", arity: "none", help: "Full-screen table redrawn on every daemon event. TTY only; q or esc quits." },
    ],
  },
  { name: "whoami", section: "observe", summary: "Who orch sees as the caller in this terminal. Registers nothing.", flags: [] },
  { name: "monitor", section: "observe", summary: "Push stream of the states an orch acts on. Arm it as a Monitor.", flags: STREAM_FLAGS },
  { name: "events", section: "observe", summary: "Every state transition, mid-turn flips included.", flags: STREAM_FLAGS },
  {
    name: "questions", section: "observe",
    summary: "Agents blocked on a question.",
    flags: [LOCAL, { ...ALL, help: "Operator-only. Every agent on the machine." }],
  },
  {
    name: "runs", section: "observe", args: "[<target>]",
    summary: "Dispatch history, newest first.",
    flags: [{ ...COUNT, help: "How many rows." }],
  },
  {
    name: "logs", section: "observe",
    summary: "Structured diagnosis records. --json emits raw records.",
    flags: [
      { name: "--since", arity: "one", placeholder: "<duration>", help: `Records from then on: ${DURATION_FORMS}. Milliseconds count from the epoch.` },
      { name: "--level", arity: "one", placeholder: "<level>", help: "Exact severity to include." },
      { name: "--agent", arity: "one", placeholder: "<target>", help: "Only that agent's records." },
      { name: "--dispatch", arity: "one", placeholder: "<id>", help: "Only that dispatch's records." },
    ],
  },
];

const DISPATCH: readonly CommandSpec[] = [
  {
    name: "dispatch", section: "dispatch", args: "<target> \"<prompt>\" | --file <path>|-",
    summary: "Send a task onto a clean session. Durable.",
    flags: [
      { name: "--file", arity: "one", placeholder: "<path>|-", help: "Read the prompt from a file, or from stdin with '-'." },
      { name: "--with", arity: "many", placeholder: "<path>", help: "A file or directory the agent opens for context. Must exist." },
      { name: "--keep-context", arity: "none", help: "Send onto the session the agent already has, without clearing it." },
      { name: "--rename", arity: "one", placeholder: "<name>", help: "Rename the agent before sending the task." },
      RAW,
      MODEL,
      THINKING,
      { ...HARNESS, help: "Route through this harness instead of the recorded one." },
      ...DRIVE,
    ],
  },
  { name: "answer", section: "dispatch", args: "<target> \"<text>\"", summary: "Answer the question the agent is asking.", flags: DRIVE },
  { name: "steer", section: "dispatch", args: "<target> <text...>", summary: "Mid-run instruction. The reply says if it applied.", flags: DRIVE },
  {
    name: "broadcast", section: "dispatch", args: "\"<text>\" <target>... | --all",
    summary: "Steer several.",
    flags: [{ ...ALL, help: "Operator-only. Every agent you hold an open lease on." }, STEAL],
  },
  { name: "pipe", section: "dispatch", args: "<target> <target> [\"<instruction>\"]", summary: "Hand the first agent's result to the second.", flags: [] },
  {
    name: "model", section: "dispatch", args: "<target> <model[:thinking]>",
    summary: "Change the model.",
    flags: [{ name: "--no-wait", arity: "none", help: "Return before the agent confirms the change." }, ...DRIVE],
  },
  {
    name: "wait", section: "dispatch", args: "<target>",
    summary: "Block until one agent reaches a state.",
    flags: [
      { name: "--status", arity: "one", placeholder: "<state>", help: "The state to wait for: done, idle, working, blocked. Default done." },
      { name: "--timeout", arity: "one", placeholder: "<duration>", help: `Give up after this long: ${DURATION_FORMS}. A date/time gives up at that instant.` },
    ],
  },
];

const COLLECT: readonly CommandSpec[] = [
  {
    name: "result", section: "collect", args: "<target>...",
    summary: "Each target's result. --json prints one array, one entry per target.",
    flags: [{ ...STEAL, help: "Read an agent a live foreign holder leases." }],
  },
  { name: "tail", section: "collect", args: "<target>", summary: "Last session entries.", flags: [{ ...COUNT, help: "How many entries. Default: the counts.tail setting." }] },
  { name: "peek", section: "collect", args: "<target>", summary: "What is on the pane screen now.", flags: [{ ...COUNT, help: "How many screen lines. Default: the counts.peek setting." }] },
  { name: "session", section: "collect", args: "<target>", summary: "Session path and stats.", flags: [] },
];

const TAKER: FlagSpec = { name: "--agent", arity: "one", placeholder: "<target>", help: "The agent that takes it. Default: the caller." };

const QUEUE: readonly CommandSpec[] = [
  {
    name: "queue", section: "queue",
    summary: "Durable task queue.",
    flags: [],
    subcommands: [
      {
        name: "add", args: "\"<task text>\"",
        summary: "Add a task and print its id.",
        flags: [
          { name: "--agent", arity: "one", placeholder: "<target>", help: "Scope the task to one agent." },
          { name: "--pack", arity: "one", placeholder: "<target>", help: "Scope the task to that agent's pack." },
          { ...SPACE, help: "Scope the task to a space." },
          { name: "--host", arity: "one", placeholder: "<host>", help: "Enqueue on a configured remote host." },
          { name: "--worktree", arity: "none", help: "Run it in a fresh git worktree." },
        ],
      },
      { name: "list", summary: "Queued, claimed, and settled tasks.", flags: [] },
      { name: "history", summary: "Completed, failed, and cancelled tasks.", flags: [] },
      { name: "cancel", args: "<id>", summary: "Cancel an unclaimed task.", flags: [] },
      { name: "edit", args: "<id> \"<task text>\"", summary: "Replace an unclaimed task's text.", flags: [] },
      { name: "take-on", args: "<id>", summary: "Claim a task for an agent now.", flags: [TAKER] },
      { name: "reap", args: "<id>", summary: "Delete a settled task.", flags: [] },
      {
        name: "intake", args: "[<space>]",
        summary: "Pull queued tasks into an agent.",
        flags: [{ name: "--close", arity: "none", help: "Close the agent when the intake settles." }, { ...TAKER, help: "The agent that takes them. Default: the caller." }],
      },
    ],
  },
  {
    name: "work", section: "queue",
    summary: "Assign queued tasks to idle agents.",
    flags: [{ name: "--pass", arity: "none", help: "One assignment pass instead of the daemon's loop." }],
  },
];

const REVIEW: readonly CommandSpec[] = [
  {
    name: "review", section: "review",
    summary: "Review done worktree agents.",
    flags: [],
    subcommands: [
      { name: "list", summary: "Done worktree agents with commits ahead of their base.", flags: [] },
      { name: "approve", args: "<target>", summary: "Merge the branch and remove the worktree.", flags: [] },
      {
        name: "reject", args: "<target> -m \"<feedback>\"",
        summary: "Re-dispatch feedback into the same worktree.",
        flags: [{ name: "-m", arity: "one", placeholder: "<feedback>", help: "The feedback to send." }],
      },
    ],
  },
];

/** Where and how an agent launches. Shared by spawn and tile; each adds its own model flag. */
const AGENT_LAUNCH: readonly FlagSpec[] = [DIR, CMD, THINKING, HARNESS, PLEXER];
const TAB_STEAL: FlagSpec = { ...STEAL, help: "Act on a tab holding an agent a live foreign holder leases." };

const AGENTS: readonly CommandSpec[] = [
  {
    name: "spawn", section: "agents", args: "<name>...",
    summary: "One fleet, one command. The names are the agents.",
    flags: [
      { name: "--tab", arity: "one", placeholder: "<tab>", help: "The tab label. Default: a random label like elk-glacier-01." },
      { ...MODEL, arity: "many", help: "The model. One, or one per name." },
      ...AGENT_LAUNCH,
      { ...SPACE, help: "The orch space the agents join." },
      { name: "--prompt", arity: "many", placeholder: "<text>", help: "The task text. One, or one per name." },
      { name: "--file", arity: "many", placeholder: "<path>|-", help: "The task file. One, or one per name. '-' reads stdin." },
      { name: "--with", arity: "many", placeholder: "[<name>=]<path>", help: "A context file or directory. Must exist." },
      { name: "--tasks", arity: "one", placeholder: "<path>", help: "A JSON array of task strings, one per name." },
      { name: "--worktree", arity: "none", help: "A git worktree per agent." },
    ],
  },
  { name: "tile", section: "agents", args: "<tab> <name>", summary: "Add one named agent to an existing tab.", flags: [MODEL, ...AGENT_LAUNCH] },
  {
    name: "rename", section: "agents", args: "<target> <name>",
    summary: "Set the agent name. --pane sets the border label.",
    flags: [{ name: "--pane", arity: "none", help: "Set only the pane border label and leave the agent name alone." }, STEAL],
  },
  { name: "reset", aliases: ["new"], section: "agents", args: "<target>... | --all", summary: "Fresh session, same agent (alias: new).", flags: [ALL, MODEL, THINKING, STEAL] },
  { name: "reload", section: "agents", args: "<target>... | --all", summary: "Live-reload code after a rebuild.", flags: [ALL, STEAL] },
  {
    name: "restart", section: "agents", args: "<target>... | --all",
    summary: "Relaunch the harness process.",
    flags: [ALL, { ...CMD, help: "The command to relaunch with. Default: the recorded harness command." }, STEAL],
  },
  {
    name: "close", aliases: ["kill"], section: "agents", args: "<target>... | --all",
    summary: "Close (alias: kill).",
    flags: [
      { ...ALL, help: "Every agent orch spawned that you may close. Never a pane orch did not spawn." },
      { name: "--stream", arity: "none", help: "Also kill your 'orch monitor' or 'orch events' stream." },
    ],
  },
  { name: "abort", section: "agents", args: "<target> [<text...>]", summary: "Cancel the current turn, then steer with the text.", flags: [] },
  { name: "detach", section: "agents", args: "<target>", summary: "Release the lease. The agent keeps running.", flags: [STEAL_LEASE] },
  { name: "adopt", section: "agents", args: "<target> | --all", summary: "Take an unleased agent.", flags: [{ ...ALL, help: "Every unleased agent." }, STEAL_LEASE] },
  {
    name: "reap", section: "agents", args: "[<target>]",
    summary: "Delete an agent record.",
    flags: [{ name: "--dead", arity: "none", help: "Sweep every provably dead agent without asking." }],
  },
  {
    name: "grant", section: "agents", args: "[<id>]",
    summary: "Approve an action an agent was refused.",
    flags: [],
    subcommands: [{ name: "list", summary: "What is waiting for approval.", flags: [] }],
  },
  { name: "lock", section: "agents", args: "-- '<command>'", summary: "Run a locked or gated command once orchd allows it.", flags: [] },
  { name: "focus", section: "agents", args: "<target>", summary: "Jump the user's view to that pane.", flags: [STEAL] },
  {
    name: "zoom", section: "agents", args: "<target>",
    summary: "Zoom the pane full-tab. Default: flip.",
    flags: [{ name: "--zoom", arity: "none", help: "Zoom in." }, { name: "--no-zoom", arity: "none", help: "Zoom out." }, STEAL],
  },
  {
    name: "move", section: "agents", args: "<target> --tab <tab> | --new-tab",
    summary: "Move a pane to another tab.",
    flags: [
      { name: "--tab", arity: "one", placeholder: "<tab>", help: "The tab to move into." },
      { name: "--split", arity: "one", placeholder: "<right|down>", help: "Where the pane lands in that tab." },
      { name: "--new-tab", arity: "none", help: "Move into a fresh tab." },
      { name: "--label", arity: "one", placeholder: "<label>", help: "Label for the fresh tab." },
      STEAL,
    ],
  },
  { name: "keys", section: "agents", args: "<target> <key>...", summary: "Send raw keys.", flags: [STEAL] },
  {
    name: "pane", section: "agents",
    summary: "Raw panes, for scripts.",
    flags: [],
    subcommands: [{ name: "list", summary: "List panes.", flags: [{ ...ALL, help: "Operator-only. Also panes orch did not spawn." }] }],
  },
];

const TABS: readonly CommandSpec[] = [
  {
    name: "tab", section: "tabs",
    summary: "Tab management.",
    flags: [],
    subcommands: [
      { name: "list", summary: "List tabs.", flags: [{ ...ALL, help: "Also tabs outside the plexer grouping your pane is in." }] },
      {
        name: "new",
        summary: "Create a tab. Prints the root pane id. Never steals focus.",
        flags: [
          { name: "--label", arity: "one", placeholder: "<label>", help: "The tab label." },
          { ...SPACE, help: "The orch space to create it in." },
          { ...DIR, help: "Directory the root pane starts in." },
        ],
      },
      { name: "rename", args: "<tab> <label>", summary: "Relabel a tab.", flags: [TAB_STEAL] },
      { name: "close", args: "<tab>", summary: "Close a tab.", flags: [TAB_STEAL] },
      { name: "focus", args: "<tab>", summary: "Jump the user's view to that tab.", flags: [TAB_STEAL] },
    ],
  },
  {
    name: "space", section: "tabs",
    summary: "orch's own grouping of related work.",
    flags: [],
    subcommands: [
      { name: "list", summary: "List spaces by name.", flags: [] },
      { name: "create", args: "<name>", summary: "Create a space, and its home where one can be held.", flags: [] },
      { name: "rename", args: "<space> <name>", summary: "Rename a space, and its home where it has one.", flags: [] },
      { name: "delete", args: "<space>", summary: "Delete an empty space, closing its home.", flags: [] },
      { name: "focus", args: "<space>", summary: "Focus a space's home.", flags: [] },
    ],
  },
];

const MAINTENANCE: readonly CommandSpec[] = [
  {
    name: "daemon", section: "maintenance",
    summary: "The resident daemon (orchd).",
    flags: [],
    subcommands: [
      {
        name: "start",
        summary: "Spawn orchd detached.",
        flags: [{ name: "--fg", aliases: ["--foreground"], arity: "none", help: "Keep it attached to this terminal." }],
      },
      { name: "stop", summary: "SIGTERM the daemon that holds this ORCH_DIR's lock.", flags: [] },
      { name: "status", summary: "pid, uptime, code hash, transport, and subsystem health.", flags: [] },
      { name: "reload", summary: "Re-exec the daemon on the freshly installed code.", flags: [] },
    ],
  },
  {
    name: "doctor", section: "maintenance",
    summary: "Check the install and fix it.",
    flags: [
      { name: "--fix", arity: "none", help: "On a TTY, open the fix menu." },
      { name: "--yes", aliases: ["-y"], arity: "none", help: "Apply every fix unattended. How CI and non-TTY repairs run." },
    ],
  },
  {
    name: "clean", section: "maintenance",
    summary: "Remove dead agent dirs and orphaned worktrees.",
    flags: [
      { name: "--all", arity: "none", help: "Also delete every dead agent's records and history. With --worktrees, discard unmerged work." },
      { name: "--worktrees", arity: "none", help: "Also remove orphaned worktrees that are empty or merged." },
    ],
  },
  {
    name: "setup", section: "maintenance",
    summary: "Onboarding wizard.",
    flags: [
      { ...HARNESS, placeholder: "<harness,...>", help: "The harnesses to enable. The first is the default." },
      { ...PLEXER, placeholder: "<plexer,...>", help: "The plexers to enable. The first is the default." },
      { ...MODEL, arity: "many", placeholder: "<harness>=<model[:thinking]>", help: "Launch model per harness. A bare model applies only where that harness lists it." },
      { name: "--runtime", arity: "one", placeholder: "<runtime>", help: "The JS runtime orch runs under." },
      { name: "--yes", aliases: ["-y"], arity: "none", help: "Never prompt. Missing dependencies are reported unless --install." },
      { name: "--install", arity: "none", help: "Install every missing dependency without asking." },
      { name: "--no-install", arity: "none", help: "Report what is missing without installing." },
      { name: "--copy", arity: "none", help: "Copy shims instead of symlinking." },
      { name: "--skills", arity: "none", help: "Install orch's packaged skills without asking." },
      { name: "--no-skills", arity: "none", help: "Skip the skills without asking." },
      { name: "--refresh", arity: "none", help: "Ask every harness for its models again instead of using the stored catalogues." },
      { name: "--smoke", arity: "none", help: "Spawn one headless agent at the end to prove the install." },
    ],
  },
  {
    name: "settings", section: "maintenance", args: "[<key> <value>]",
    summary: "Every effective setting and its source.",
    flags: [{ ...HARNESS, help: "Switch the default harness." }, { ...PLEXER, help: "Switch the default plexer." }],
    subcommands: [
      {
        name: "models",
        summary: "Re-pick, per harness: launch model, picker quicklist, and the launchable set.",
        flags: [
          { ...HARNESS, help: "One harness instead of every enabled one." },
          { ...MODEL, placeholder: "<harness>=<model[:thinking]>" },
          { name: "--refresh", arity: "none", help: "Ask the harnesses again instead of using the stored catalogues." },
        ],
      },
      {
        name: "thinking", args: "[<level>]",
        summary: "Thinking effort for every launch, independent of the model.",
        flags: [
          { ...HARNESS, help: "Set or clear that harness's override instead of the global default." },
          { name: "--clear", arity: "none", help: "Remove the override named by --harness." },
        ],
      },
      {
        name: "skills",
        summary: "Turn the skill install on or off and choose where it writes.",
        flags: [
          { name: "--skills", arity: "none", help: "Write every packaged skill now." },
          { name: "--no-skills", arity: "none", help: "Record the refusal and leave files already there alone." },
          { name: "--store", arity: "one", placeholder: "<path>", help: "The one directory holding the real files. Default ~/.agents/skills." },
          { name: "--link", arity: "one", placeholder: "<path>[,<path>...]", help: "Harness directories symlinked into the store. Default ~/.claude/skills." },
        ],
      },
      {
        name: "notify",
        summary: "The sinks orchd delivers notifications through.",
        flags: [],
        subcommands: [
          { name: "list", summary: "Each sink, the states it fires on, and where it delivers.", flags: [] },
          {
            name: "add", args: "<sink> [--<field>=<value>]...",
            summary: "Record one sink. A sink already configured is replaced, keeping fields this call does not name.",
            flags: [{ ...ONLY, help: "States it fires on. Default blocked,error,done." }],
            openFlags: true,
          },
          { name: "remove", args: "<sink>", summary: "Stop delivering through that sink.", flags: [] },
        ],
      },
      { name: "grant", args: "<key>", summary: "Let an agent write that setting with orch settings.", flags: [] },
      { name: "revoke", args: "<key>", summary: "Make that setting the human's alone again.", flags: [] },
    ],
  },
  {
    name: "models", section: "maintenance",
    summary: "Every model each harness can run.",
    flags: [
      { ...HARNESS, help: "One harness instead of every enabled one." },
      { name: "--preferred", arity: "none", help: "Only the quicklist." },
      { name: "--search", arity: "one", placeholder: "<text>", help: "Match against spec or label, case-insensitive." },
      { name: "--pick", arity: "one", placeholder: "<index|spec>", help: "Print one full spec for scripting." },
    ],
  },
  {
    name: "notify", section: "maintenance",
    summary: "Fire every notification sink.",
    flags: [],
    subcommands: [
      {
        name: "test",
        summary: "Send a synthetic transition through each configured sink.",
        flags: [{ name: "--state", arity: "one", placeholder: "<state>", help: "The state to fake. Default blocked." }],
      },
    ],
  },
  { name: "version", aliases: ["-V", "--version"], section: "maintenance", summary: "Installed version.", flags: [] },
  { name: "help", aliases: ["-h", "--help"], section: "maintenance", args: "[<command>]", summary: "This map, or one command's detail.", flags: [] },
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
