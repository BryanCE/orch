import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";

const DEFAULT_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  timeout: 5000,
  stdio: ["ignore", "pipe", "pipe"],
};

/** Run tmux and swallow any failure, returning null instead of throwing. */
export function bestEffortTmux(args: string[]): string | null {
  try {
    return execFileSync("tmux", args, DEFAULT_OPTIONS);
  } catch {
    return null;
  }
}

/** Run tmux and let a failure throw (matches herdrExec: callers treat it as an error). */
export function execTmux(args: string[], options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS): string {
  return execFileSync("tmux", args, options);
}

/** One tmux pane row from the shared inventory query (D1). */
export interface TmuxPane {
  readonly paneId: string;
  readonly session: string;
  readonly windowId: string;
  readonly windowIndex: string;
  readonly windowName: string;
  readonly paneTitle: string;
  readonly paneActive: boolean;
  readonly windowActive: boolean;
  readonly sessionAttached: boolean;
  readonly agentKey: string;
  readonly agent: string;
  readonly agentName: string;
}

const FIELD_SEP = "\t";

/** tmux format string for the one `list-panes -a` query every enumeration reads from. */
const PANE_FORMAT = [
  "#{pane_id}",
  "#{session_name}",
  "#{window_id}",
  "#{window_index}",
  "#{window_name}",
  "#{pane_title}",
  "#{pane_active}",
  "#{window_active}",
  "#{session_attached}",
  "#{@orch_agent_key}",
  "#{@orch_agent}",
  "#{@orch_agent_name}",
].join(FIELD_SEP);

function parsePaneRow(line: string): TmuxPane | null {
  const [paneId, session, windowId, windowIndex, windowName, paneTitle, paneActive, windowActive, sessionAttached, agentKey, agent, agentName] =
    line.split(FIELD_SEP);
  if (!paneId) return null;
  return {
    paneId,
    session: session ?? "",
    windowId: windowId ?? "",
    windowIndex: windowIndex ?? "",
    windowName: windowName ?? "",
    paneTitle: paneTitle ?? "",
    paneActive: paneActive === "1",
    windowActive: windowActive === "1",
    sessionAttached: sessionAttached === "1",
    agentKey: agentKey ?? "",
    agent: agent ?? "",
    agentName: agentName ?? "",
  };
}

/** Every pane across every session, from one `list-panes -a` call (D1). */
export function tmuxPanes(): TmuxPane[] {
  const output = bestEffortTmux(["list-panes", "-a", "-F", PANE_FORMAT]);
  if (!output) return [];
  return output.split(/\r?\n/).flatMap((line) => {
    const pane = parsePaneRow(line);
    return pane ? [pane] : [];
  });
}

/** Panes stamped with an orch presence key, i.e. panes orch itself spawned. */
export function orchPanes(): TmuxPane[] {
  return tmuxPanes().filter((pane) => pane.agentKey.length > 0);
}
