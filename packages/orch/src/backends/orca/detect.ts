import { createOrcaCli, type OrcaCli } from "./cli.ts";
import type { DetectedPlexer } from "../../types/backend.ts";

export const ORCA_PANE_KEY = "ORCA_PANE_KEY";

export function callerOrcaPaneKey(): string | undefined {
  const key = process.env[ORCA_PANE_KEY];
  return key === "" ? undefined : key;
}

export function currentOrcaTerminal(cli: OrcaCli) {
  const key = callerOrcaPaneKey();
  return key === undefined ? undefined : cli.terminals().find((row) => `${row.tabId}:${row.leafId}` === key);
}

export function detectOrca(): DetectedPlexer | undefined {
  if (callerOrcaPaneKey() === undefined) return undefined;
  const cli = createOrcaCli();
  return {
    plexer: "orca",
    handle: currentOrcaTerminal(cli)?.handle,
    plexerVersion: cli.version() ?? undefined,
  };
}
