import { cmdStatus, parseStatusOptions } from "./status.ts";
import { cmdStatusLive } from "./status-live.ts";

/** The `status` verb: `--live` runs the terminal view, every other form the one-shot table.
 *  The split lives here so `status.ts` never imports the live view that imports it. */
export async function cmdStatusVerb(args: string[]): Promise<void> {
  const options = parseStatusOptions(args);
  if (options.live) return cmdStatusLive(options);
  return cmdStatus(options);
}
