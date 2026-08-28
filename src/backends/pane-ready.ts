/** What a plexer can see about the processes a pane is running right now. */
export interface PaneForeground {
  /** The pane's own shell. Null when the plexer does not report it. */
  shellPid: number | null;
  /** Leader of the process group holding the terminal. Null on panes whose OS
   *  exposes no foreground group — Windows-side panes, where only names remain. */
  foregroundPid: number | null;
  processes: readonly string[];
}

export const NO_PANE_FOREGROUND: PaneForeground = { shellPid: null, foregroundPid: null, processes: [] };

/** What a plexer counts as a pane's own shell. Copied from herdr's
 *  `is_pane_shell_process_name` so orch reads exactly the fact herdr reads. */
const SHELL_PROCESS_NAMES = new Set([
  "sh", "bash", "dash", "zsh", "fish", "ksh", "mksh", "csh", "tcsh",
  "elvish", "xonsh", "nu", "pwsh", "powershell", "cmd",
]);

/** herdr's own normalization: basename, no login-shell dash, no `.exe`, lowercased.
 *  A login shell reports as `-bash`, and matching on a `sh` suffix instead calls
 *  `ssh` a shell. */
function processName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.replace(/^-+/, "").toLowerCase().replace(/\.exe$/, "");
}

/** True while the pane's own shell owns the terminal. That covers an idle prompt
 *  AND a shell still sourcing its rc files, which are indistinguishable from
 *  outside — so this answers "no command is running", never "input is accepted". */
export function paneAtShellPrompt(foreground: PaneForeground): boolean {
  if (foreground.shellPid !== null && foreground.foregroundPid !== null) {
    return foreground.shellPid === foreground.foregroundPid;
  }
  return foreground.processes.length > 0
    && foreground.processes.every((name) => SHELL_PROCESS_NAMES.has(processName(name)));
}

/** True once a command owns the terminal instead of the shell — the only proof
 *  from outside that a line typed into a pane actually ran. */
function paneRunsCommand(foreground: PaneForeground): boolean {
  return foreground.processes.length > 0 && !paneAtShellPrompt(foreground);
}

/** Sleep on this thread without a runtime dependency: orch ships to node, and
 *  every caller here is synchronous. */
export function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
