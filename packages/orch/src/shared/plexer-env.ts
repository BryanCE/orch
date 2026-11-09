/**
 * The env vars a caller forwards so orchd can tell which plexer it stands in.
 *
 * A plexer's env vars are named by its id upper-cased, alone or as a prefix: the
 * same ownership convention `scripts/check-bridge.ts` enforces. The CLI forwards
 * every such var raw and names no plexer; each plexer's detector, in its backend,
 * reads its own names from the forwarded set inside orchd. Adding a plexer adds
 * its id and nothing here.
 */
import { BACKEND_IDS } from "../types/backend.ts";

/** An environment to read plexer markers from: a process's own, or a caller's forwarded set. */
export type PlexerEnv = Readonly<Record<string, string | undefined>>;

const PREFIXES: readonly string[] = BACKEND_IDS.map((id) => id.toUpperCase());

function plexerOwned(name: string): boolean {
  return PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}_`));
}

/** The plexer-owned env vars set in `env`, raw, for a claim to carry to orchd. */
export function plexerEnvMarkers(env: PlexerEnv): Record<string, string> {
  const markers: Record<string, string> = {};
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined && plexerOwned(name)) markers[name] = value;
  }
  return markers;
}
