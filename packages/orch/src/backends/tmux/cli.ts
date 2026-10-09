import { type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { DEFAULT_TOOL_RETRY, plexerExecOptions, runTool, runToolBestEffort, toolErrorDetail } from "../tool-exec.ts";
import type { RetryPolicy } from "../../types/core.ts";
import type { TmuxPane, TmuxPaneRect } from "../../types/plexer.ts";

/** tmux answered that no server runs: an empty plexer, not a fault. */
export function noTmuxServer(error: unknown): boolean {
  return /no server running|error connecting to/.test(toolErrorDetail(error));
}

/** With no tmux server running, every retry fails the same way, and each wait blocks
 *  orchd: four tries cost an enumeration about 1.8s on a machine that runs no tmux. */
export const TMUX_RETRY: RetryPolicy = {
  ...DEFAULT_TOOL_RETRY,
  retryable: (error) => !noTmuxServer(error),
};

/** Run tmux and swallow any failure, returning null instead of throwing. */
export function bestEffortTmux(args: string[]): string | null {
  return runToolBestEffort("tmux", args, TMUX_RETRY);
}

/** Run tmux and let a failure throw (matches herdrExec: callers treat it as an error). */
export function execTmux(args: string[], options: ExecFileSyncOptionsWithStringEncoding = plexerExecOptions()): string {
  return runTool("tmux", args, TMUX_RETRY, options);
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
function tmuxPanes(): TmuxPane[] {
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

const RECT_FORMAT = ["#{pane_id}", "#{pane_width}", "#{pane_height}", "#{pane_left}", "#{pane_top}"].join(FIELD_SEP);

function parseRectRow(line: string): TmuxPaneRect | null {
  const [paneId, width, height, left, top] = line.split(FIELD_SEP);
  if (!paneId) return null;
  return { paneId, rect: { width: Number(width), height: Number(height), x: Number(left), y: Number(top) } };
}

/** Every pane of one window with its geometry, orch-spawned or not. Throws on failure. */
export function windowPaneRects(window: string): TmuxPaneRect[] {
  return execTmux(["list-panes", "-t", window, "-F", RECT_FORMAT])
    .split(/\r?\n/)
    .flatMap((line) => {
      const pane = parseRectRow(line);
      return pane ? [pane] : [];
    });
}
