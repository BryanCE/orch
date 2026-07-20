import * as filesystem from "node:fs";
import { declaredRuntime } from "../config.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import { binaryPath } from "../util.ts";
import type { CheckResult } from "../doctor-types.ts";

const id = "runtime";
const label = "Declared runtime";

/**
 * The runtime THIS process is executing under. Read from the runtime's own
 * version table rather than from PATH or from an env var: a process cannot be
 * wrong about what is interpreting it.
 */
export function runningRuntime(): OrchRuntime {
  const versions = process.versions as Record<string, string | undefined>;
  if (versions.bun) return "bun";
  if (versions.deno) return "deno";
  return "node";
}

/**
 * The runtime named by an executable's shebang, or null when the file is not a
 * shebang script (a real binary, or unreadable). Recognizes both `#!/usr/bin/env
 * node` and a direct interpreter path like `#!/usr/local/bin/node`.
 */
export function shebangRuntime(file: string): OrchRuntime | null {
  let head: string;
  try {
    const handle = filesystem.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(256);
      const read = filesystem.readSync(handle, buffer, 0, 256, 0);
      head = buffer.subarray(0, read).toString("utf8").split(/\r?\n/)[0] ?? "";
    } finally {
      filesystem.closeSync(handle);
    }
  } catch {
    return null;
  }
  if (!head.startsWith("#!")) return null;
  // Match the interpreter as a whole path segment so "nodemon" never reads as "node".
  return ORCH_RUNTIMES.find((runtime) => new RegExp(`(?:^|[/\\s])${runtime}(?:\\s|$)`).test(head)) ?? null;
}

/**
 * Verify the DECLARED runtime against installed reality — the check the runtime
 * key exists for. No runtime is privileged here: the defect is the MISMATCH, not
 * which runtime won. Running under bun is perfectly fine if that is what you
 * declared; running under bun while settings.json says node means orch and its
 * shims disagree about the world, and that is what goes wrong silently.
 *
 * Two independent drifts are caught:
 *
 *  1. orch is executing under a runtime other than the declared one. This is the
 *     failure that motivated the whole axis: the `orch` entrypoint was a stale
 *     symlink to `bin/orch.ts` carrying a different shebang than the install
 *     declared, so every invocation ran under the wrong runtime for weeks with
 *     doctor reporting nothing, because no check compared declared to actual.
 *  2. The resolved `orch` entrypoint's shebang names a different runtime. This
 *     still fires when doctor itself happens to run under the declared runtime,
 *     so a mismatched entrypoint cannot hide behind a lucky invocation.
 *
 * A declared runtime missing from PATH is also a failure: the harness shims are
 * spawned by claude/codex using that runtime, so an absent binary means every
 * shim invocation fails silently at agent runtime rather than here.
 */
/**
 * Observations the verdict depends on. Injected so each row of the table is
 * testable deterministically — a test asserting the "running under bun" verdict
 * must not require the suite to actually be running under bun.
 */
export interface RuntimeObservations {
  /** The runtime actually executing orch. */
  running?: OrchRuntime;
  /** Absolute path of a runtime on PATH, or null when absent. */
  resolve?: (bin: string) => string | null;
  /** Runtime named by the resolved `orch` entrypoint's shebang, or null. */
  entrypoint?: () => { path: string; runtime: OrchRuntime | null } | null;
}

function observedEntrypoint(resolve: (bin: string) => string | null): { path: string; runtime: OrchRuntime | null } | null {
  const entrypoint = resolve("orch");
  if (!entrypoint) return null;
  let target = entrypoint;
  try {
    target = filesystem.realpathSync(entrypoint);
  } catch {}
  return { path: target, runtime: shebangRuntime(target) };
}

export function checkRuntime(orchDir: string, observations: RuntimeObservations = {}): CheckResult {
  let declared: OrchRuntime;
  try {
    declared = declaredRuntime(orchDir);
  } catch (error: unknown) {
    // checkConfig owns malformed-settings reporting; stay silent rather than duplicate it.
    return { id, label, status: "skip", detail: error instanceof Error ? error.message : String(error) };
  }

  const resolve = observations.resolve ?? binaryPath;
  const running = observations.running ?? runningRuntime();
  const entrypointOf = observations.entrypoint ?? (() => observedEntrypoint(resolve));
  const problems: string[] = [];

  const resolved = resolve(declared);
  if (!resolved) {
    problems.push(`declared runtime ${declared} is not on PATH, so every harness shim spawn will fail`);
  }

  if (running !== declared) {
    problems.push(`orch is running under ${running} but settings.json declares ${declared}`);
  }

  const entrypoint = entrypointOf();
  if (entrypoint?.runtime && entrypoint.runtime !== declared) {
    problems.push(`the orch entrypoint (${entrypoint.path}) has a ${entrypoint.runtime} shebang but settings.json declares ${declared}`);
  }

  if (!problems.length) {
    return { id, label, status: "ok", detail: `running under ${declared} as declared (${resolved ?? declared})` };
  }
  return {
    id,
    label,
    status: "fail",
    detail: `${problems.join("; ")}; fix: rebuild and reinstall with bun run build:dev, or re-record with orch setup --runtime ${running}`,
  };
}
