import type { DetectedPlexer } from "../../types/backend.ts";
import type { PlexerEnv } from "../../shared/plexer-env.ts";

export function insideTmux(env: PlexerEnv = process.env): boolean {
  return !!env.TMUX;
}

export function callerTmuxPane(env: PlexerEnv = process.env): string | undefined {
  return env.TMUX_PANE;
}

export function detectTmux(env: PlexerEnv): DetectedPlexer | undefined {
  return insideTmux(env) ? { plexer: "tmux", handle: callerTmuxPane(env) } : undefined;
}
