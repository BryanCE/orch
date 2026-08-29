import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { retryingSync, type RetryPolicy } from "../retry.ts";

/**
 * One exec seam for every external tool orch drives — every plexer, every
 * harness CLI. It names none of them: a binary and its argv go in, output comes
 * out, and the retry policy is the caller's to state.
 *
 * Why it exists: orch's commands fail on TIMING far more often than on being
 * wrong. A pane whose shell has not finished coming up, a plexer server still
 * binding its socket, a loaded machine — each answers with a refusal that would
 * have succeeded moments later. Failing the whole spawn on the first of those is
 * what makes orch feel unreliable on slower hardware, and it is not a per-harness
 * problem, so it does not get a per-harness fix (Rule 9).
 */
export type ToolExecutor = (
  binary: string,
  args: readonly string[],
  options: ExecFileSyncOptionsWithStringEncoding,
) => string;

const DEFAULT_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  timeout: 5000,
  stdio: ["ignore", "pipe", "pipe"],
};

/** Reattempt anything that is not obviously permanent. A caller that can read
 *  its tool's error codes should narrow this; one that cannot is still better
 *  served retrying than failing a spawn on a 200ms race. */
export const DEFAULT_TOOL_RETRY: RetryPolicy = { attempts: 4, delayMs: 250, backoff: 2 };

const realExecutor: ToolExecutor = (binary, args, options) => execFileSync(binary, [...args], options);

let executor: ToolExecutor = realExecutor;

/** Replace the process boundary. Tests drive orch's tool handling without ever
 *  starting a plexer, which is the only way to exercise the retry paths. */
export function setToolExecutor(next: ToolExecutor | null): void {
  executor = next ?? realExecutor;
}

/** Run one external tool command, reattempting the failures the policy admits. */
export function runTool(
  binary: string,
  args: readonly string[],
  policy: RetryPolicy = DEFAULT_TOOL_RETRY,
  options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS,
): string {
  return retryingSync(`${binary} ${args.join(" ")}`, () => executor(binary, args, options), policy);
}

/** Run one external tool command, answering null instead of throwing. For the
 *  inventory reads where "no answer" and "an error" are the same to the caller. */
export function runToolBestEffort(
  binary: string,
  args: readonly string[],
  policy: RetryPolicy = DEFAULT_TOOL_RETRY,
  options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS,
): string | null {
  try {
    return runTool(binary, args, policy, options);
  } catch {
    return null;
  }
}
