import type { DetectedPlexer } from "../../types/backend.ts";

export function insideTmux(): boolean {
  return !!process.env.TMUX;
}

export function callerTmuxPane(): string | undefined {
  return process.env.TMUX_PANE;
}

export function detectTmux(): DetectedPlexer | undefined {
  return insideTmux() ? { plexer: "tmux", handle: callerTmuxPane() } : undefined;
}
