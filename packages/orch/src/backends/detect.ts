import { detectHerdr } from "./herdr/detect.ts";
import { detectTmux } from "./tmux/detect.ts";
import { detectOrca } from "./orca/detect.ts";
import type { DetectedPlexer } from "../types/backend.ts";

const detectors: readonly (() => DetectedPlexer | undefined)[] = [detectHerdr, detectTmux, detectOrca];

export function detectPlexer(): DetectedPlexer | undefined {
  for (const detect of detectors) {
    const facts = detect();
    if (facts !== undefined) return facts;
  }
  return undefined;
}
