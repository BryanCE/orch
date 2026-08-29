import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { retryingSync, type RetryPolicy } from "../retry.ts";
import type { ToolExecutor } from "../types/backend.ts";

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
