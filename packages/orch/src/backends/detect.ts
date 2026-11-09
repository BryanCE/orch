import { detectHerdr } from "./herdr/detect.ts";
import { detectTmux } from "./tmux/detect.ts";
import { detectOrca } from "./orca/detect.ts";
import type { DetectedPlexer } from "../types/backend.ts";
import type { PlexerEnv } from "../shared/plexer-env.ts";

const detectors: readonly ((env: PlexerEnv) => DetectedPlexer | undefined)[] = [detectHerdr, detectTmux, detectOrca];

/** The plexer `env` says its process stands in. orchd runs this over a caller's forwarded markers. */
export function detectPlexer(env: PlexerEnv): DetectedPlexer | undefined {
  for (const detect of detectors) {
    const facts = detect(env);
    if (facts !== undefined) return facts;
  }
  return undefined;
}
