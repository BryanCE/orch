import { cmdStatus } from "./index.ts";
import { parseStatusOptions } from "./options.ts";
import { cmdStatusLive } from "./live.ts";
import type { Services } from "../../types/services.ts";

/** The `status` verb: `--live` runs the terminal view, every other form the one-shot table.
 *  The split lives here so status modules never import the live view that imports them. */
export async function cmdStatusVerb(services: Services, args: string[]): Promise<void> {
  const options = parseStatusOptions(args);
  if (options.live) return cmdStatusLive(services, options);
  return cmdStatus(services, options);
}
