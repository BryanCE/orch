import * as filesystem from "node:fs";
import { declaredRuntime } from "../config.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "../runtimes.ts";
import { binaryPath, errorMessage } from "../util.ts";
import type { CheckResult, RuntimeObservations } from "../types/doctor.ts";

const id = "runtime";
const label = "Declared runtime";

/**
 * The runtime THIS process is executing under. Read from the runtime's own
 * version table rather than from PATH or from an env var: a process cannot be
 * wrong about what is interpreting it.
 */
export function runningRuntime(): OrchRuntime {
  const versions = process.versions;
  if (versions.bun) return "bun";
  if (versions.deno) return "deno";
  return "node";
}

const SHEBANG = /^#![^\r\n]*/;

/** Point an entrypoint at `runtime`, so switching runtimes needs no rebuild. */
export function writeShebangRuntime(file: string, runtime: OrchRuntime): void {
  const source = filesystem.readFileSync(file, "utf8");
  filesystem.writeFileSync(file, source.replace(SHEBANG, `#!/usr/bin/env ${runtime}`));
  filesystem.chmodSync(file, 0o755);
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
    return { id, label, status: "skip", detail: errorMessage(error) };
  }

  const resolve = observations.resolve ?? binaryPath;
  const running = observations.running ?? runningRuntime();
  const entrypointOf = observations.entrypoint ?? (() => observedEntrypoint(resolve));
  const problems: string[] = [];

  const resolved = resolve(declared);
  if (!resolved) {
    problems.push(`declared runtime ${declared} is not on PATH, so every harness shim spawn will fail`);
  }

  const entrypoint = entrypointOf();
  const staleEntrypoint = entrypoint?.runtime && entrypoint.runtime !== declared ? entrypoint : null;
  if (staleEntrypoint) {
    problems.push(`the orch entrypoint (${staleEntrypoint.path}) has a ${staleEntrypoint.runtime} shebang but settings.json declares ${declared}`);
  }

  if (!problems.length) {
    return { id, label, status: "ok", detail: `running under ${declared} as declared (${resolved ?? declared})` };
  }
  const result: CheckResult = {
    id,
    label,
    status: "fail",
    detail: `${problems.join("; ")}; fix: orch doctor --fix, or re-record with orch setup --runtime ${running}`,
  };
  if (staleEntrypoint) {
    result.fix = {
      description: `point ${staleEntrypoint.path} at ${declared}`,
      apply: () => writeShebangRuntime(staleEntrypoint.path, declared),
    };
  }
  return result;
}
