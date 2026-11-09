import { createOrcaCli, type OrcaCli } from "./cli.ts";
import type { DetectedPlexer } from "../../types/backend.ts";
import type { PlexerEnv } from "../../shared/plexer-env.ts";

export const ORCA_PANE_KEY = "ORCA_PANE_KEY";

export function callerOrcaPaneKey(env: PlexerEnv = process.env): string | undefined {
  const key = env[ORCA_PANE_KEY];
  return key === "" ? undefined : key;
}

export function currentOrcaTerminal(cli: OrcaCli, env: PlexerEnv = process.env) {
  const key = callerOrcaPaneKey(env);
  return key === undefined ? undefined : cli.terminals().find((row) => `${row.tabId}:${row.leafId}` === key);
}

export function detectOrca(env: PlexerEnv): DetectedPlexer | undefined {
  if (callerOrcaPaneKey(env) === undefined) return undefined;
  const cli = createOrcaCli();
  return {
    plexer: "orca",
    handle: currentOrcaTerminal(cli, env)?.handle,
    plexerVersion: cli.version() ?? undefined,
  };
}
