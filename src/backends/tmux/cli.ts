import { type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { runTool, runToolBestEffort } from "../tool-exec.ts";

const DEFAULT_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  timeout: 5000,
  stdio: ["ignore", "pipe", "pipe"],
};

/** Run tmux and swallow any failure, returning null instead of throwing. */
export function bestEffortTmux(args: string[]): string | null {
  return runToolBestEffort("tmux", args);
}

/** Run tmux and let a failure throw (matches herdrExec: callers treat it as an error). */
export function execTmux(args: string[], options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS): string {
  return runTool("tmux", args, undefined, options);
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

/** One pane's id and cell geometry, for layout planning. */
export interface TmuxPaneRect {
  readonly paneId: string;
  readonly rect: { readonly width: number; readonly height: number; readonly x: number; readonly y: number };
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
