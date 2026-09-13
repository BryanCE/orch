import { cmdStatus, parseStatusOptions } from "./status.ts";
import { cmdStatusLive } from "./status-live.ts";
import type { Services } from "../types/services.ts";

/** The `status` verb: `--live` runs the terminal view, every other form the one-shot table.
 *  The split lives here so `status.ts` never imports the live view that imports it. */
export async function cmdStatusVerb(services: Services, args: string[]): Promise<void> {
  const options = parseStatusOptions(args);
  if (options.live) return cmdStatusLive(services, options);
  return cmdStatus(services, options);
}
