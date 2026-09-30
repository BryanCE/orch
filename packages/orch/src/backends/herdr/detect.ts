import type { DetectedPlexer } from "../../types/backend.ts";
import { createHerdrCli } from "./cli.ts";

export function herdrEnvironmentPresent(): boolean {
  return process.env.HERDR_ENV === "1";
}

export function callerPaneHandle(): string | undefined {
  return process.env.HERDR_PANE_ID;
}

export function insideHerdr(): boolean {
  return herdrEnvironmentPresent() || callerPaneHandle() !== undefined;
}

export function detectHerdr(): DetectedPlexer | undefined {
  return insideHerdr()
    ? { plexer: "herdr", handle: callerPaneHandle(), plexerVersion: createHerdrCli().version() ?? undefined }
    : undefined;
}
