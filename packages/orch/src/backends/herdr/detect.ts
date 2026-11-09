import type { DetectedPlexer } from "../../types/backend.ts";
import type { PlexerEnv } from "../../shared/plexer-env.ts";
import { createHerdrCli } from "./cli.ts";

export function herdrEnvironmentPresent(env: PlexerEnv = process.env): boolean {
  return env.HERDR_ENV === "1";
}

export function callerPaneHandle(env: PlexerEnv = process.env): string | undefined {
  return env.HERDR_PANE_ID;
}

export function insideHerdr(env: PlexerEnv = process.env): boolean {
  return herdrEnvironmentPresent(env) || callerPaneHandle(env) !== undefined;
}

export function detectHerdr(env: PlexerEnv): DetectedPlexer | undefined {
  return insideHerdr(env)
    ? { plexer: "herdr", handle: callerPaneHandle(env), plexerVersion: createHerdrCli().version() ?? undefined }
    : undefined;
}
