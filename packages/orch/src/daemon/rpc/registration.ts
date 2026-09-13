import type { OrchDir } from "../../types/core.ts";
import { hostname } from "node:os";
import { readFileSync } from "node:fs";
import { isRecord } from "../../util.ts";
import { callerSession } from "../../adapters/session-env.ts";
import { sessionProcessPid } from "../../identity/self.ts";
import { allBackends } from "../../backends/registry.ts";
import { endpointPaths } from "./wire.ts";
import type { RegisterSessionResponse } from "../../types/daemon.ts";

function isUnleasedAgent(value: unknown): value is RegisterSessionResponse["unleased"][number] {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

/** Validate every field carried by a session registration before trusting it. */
export function isRegisterSessionResponse(value: unknown): value is RegisterSessionResponse {
  return isRecord(value)
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.label === "string"
    && value.kind === "session"
    && Array.isArray(value.unleased)
    && value.unleased.every(isUnleasedAgent)
    && (value.registrationWarning === undefined || typeof value.registrationWarning === "string");
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * The plexer this process stands in, the version it runs, and the place it
 * occupies there.
 *
 * Registration is the moment orch WRITES an environment down (Rule 11), so it is
 * the one place that asks. The claim used to send `undefined` for all of these,
 * so no driving session ever got a plexer or handle row — and every later reader
 * had to sniff the process environment again to answer a question the store
 * should have held.
 */
function callerEnvironment(): { plexer: string | undefined; plexerVersion: string | undefined; handle: string | undefined } {
  const here = allBackends().find((backend) => backend.isAvailable() && backend.isInsideSession());
  if (here === undefined) return { plexer: undefined, plexerVersion: undefined, handle: undefined };
  const place = here.placementInventory?.current() ?? null;
  return { plexer: here.id, plexerVersion: here.versionInfo?.installed() ?? undefined, handle: place === null ? undefined : String(place.handle) };
}

/** Build the authenticated caller facts for session registration. */
export function sessionClaim(orchDir: OrchDir, label?: string): Record<string, unknown> {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  const session = callerSession();
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = configuredHarness ?? session?.harnessId ?? "cli";
  const sessionToken = session?.sessionId ?? null;
  const environment = callerEnvironment();
  return {
    token,
    pid: sessionProcessPid(session),
    sessionToken,
    harness,
    cwd: process.cwd(),
    label,
    plexer: environment.plexer,
    plexerVersion: environment.plexerVersion,
    handle: environment.handle,
    space: nonEmpty(process.env.ORCH_SPACE?.trim()) ?? null,
    hostName: hostname(),
    hostOs: hostOs(),
  };
}

function hostOs(): "linux" | "windows" | "darwin" {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`unsupported host OS ${process.platform}`);
}
