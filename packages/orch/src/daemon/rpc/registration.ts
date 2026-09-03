import { hostname } from "node:os";
import { readFileSync } from "node:fs";
import { isRecord } from "../../util.ts";
import { callerSession } from "../../adapters/session-env.ts";
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

/** Build the authenticated caller facts for session registration. */
export function sessionClaim(orchDir: string, label?: string): Record<string, unknown> {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  const session = callerSession();
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = configuredHarness ?? session?.harnessId ?? "cli";
  const sessionToken = session?.sessionId ?? null;
  return {
    token,
    pid: session?.pid ?? process.pid,
    sessionToken,
    harness,
    cwd: process.cwd(),
    label,
    plexer: undefined,
    plexerVersion: undefined,
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
