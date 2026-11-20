/**
 * The env vars a harness session exports, and the full allowlist an orch shim may
 * read.
 *
 * This module does not import adapters. `src/runtime.ts` builds deno's
 * `--allow-env` list from it, which is the only reason `runtime.ts` used to import
 * `adapters/registry.ts` — the import that closed two module cycles
 * (through a harness adapter and its hooks module back to runtime). Both sides
 * import this module instead, so neither the registry nor any adapter is on
 * the shim's import path.
 *
 * Each adapter reads its own names from here, so a harness's env vocabulary still
 * has exactly ONE definition site — and adding a harness updates the allowlist by
 * construction, because the allowlist is derived from this table.
 */

import { LAUNCH_ENV } from "../identity/launch.ts";
import { ENVIRONMENT_ENV } from "./environment.ts";
import { optionalString } from "../util.ts";
import type { AgentAdapter } from "../types/adapter.ts";
import type { CallerSession } from "../types/core.ts";

import { CLAUDE_SESSION_ENV } from "../../extensions/claude/session-env.ts";
import { CODEX_SESSION_ENV } from "../../extensions/codex/session-env.ts";
import { OMP_SESSION_ENV } from "../../extensions/omp/session-env.ts";
import { OPENCODE_SESSION_ENV } from "../../extensions/opencode/session-env.ts";
import { PI_SESSION_ENV } from "../../extensions/pi/session-env.ts";

/** Each harness's session env vocabulary, declared in its own directory. */
export const HARNESS_SESSION_ENV = {
  pi: PI_SESSION_ENV,
  omp: OMP_SESSION_ENV,
  codex: CODEX_SESSION_ENV,
  claude: CLAUDE_SESSION_ENV,
  opencode: OPENCODE_SESSION_ENV,
} as const;

/** Env vars orch's own shims read, independent of any harness. */
const ORCH_SHIM_ENV_VARS: readonly string[] = [LAUNCH_ENV, ENVIRONMENT_ENV, "ORCH_DIR", "ORCH_AGENT_LOG", "ORCH_PROJECT", "HOME", "USERPROFILE"];

/** The complete `--allow-env` grant for a shim: orch's own vars plus every harness's. */
export const SHIM_ENV_VARS: readonly string[] = [...new Set<string>([
  ...ORCH_SHIM_ENV_VARS,
  ...Object.values(HARNESS_SESSION_ENV).flatMap((harness) => Object.values(harness)),
])];

interface SessionEnvironment {
  readonly id: string;
  readonly marker: string | undefined;
  readonly sessionId: string | undefined;
  readonly sessionPid: string | undefined;
}

export function callerSession(adapters: readonly AgentAdapter[] = []): CallerSession | null {
  const candidates: readonly SessionEnvironment[] = adapters.length > 0
    ? adapters.map((adapter) => ({ id: adapter.id, marker: adapter.sessionEnvMarker, sessionId: adapter.sessionIdEnv, sessionPid: adapter.sessionPidEnv }))
    : Object.entries(HARNESS_SESSION_ENV).map(([id, env]) => ({ id, marker: env.marker, sessionId: "sessionId" in env ? env.sessionId : undefined, sessionPid: "sessionPid" in env ? env.sessionPid : undefined }));
  const marked = candidates.find((adapter) =>
    adapter.marker !== undefined && optionalString(process.env[adapter.marker]) !== undefined);
  if (!marked) return null;
  const sessionId = marked.sessionId ? optionalString(process.env[marked.sessionId]) ?? null : null;
  const rawPid = marked.sessionPid ? optionalString(process.env[marked.sessionPid]) : undefined;
  const pid = rawPid !== undefined && /^[0-9]+$/.test(rawPid) ? Number(rawPid) : null;
  return { harnessId: marked.id, sessionId, pid: pid !== null && pid > 0 ? pid : null };
}
