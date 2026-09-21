import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { retryingSync } from "../retry.ts";
import { errorMessage, isRecord } from "../util.ts";
import type { ToolExecRecord, ToolExecutor } from "../types/backend.ts";
import type { RetryPolicy } from "../types/core.ts";

export const DEFAULT_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: "utf8",
  timeout: 5000,
  stdio: ["ignore", "pipe", "pipe"],
};

/** Reattempt anything that is not obviously permanent. A caller that can read
 *  its tool's error codes should narrow this; one that cannot is still better
 *  served retrying than failing a spawn on a 200ms race. */
export const DEFAULT_TOOL_RETRY: RetryPolicy = { attempts: 4, delayMs: 250, backoff: 2 };

export function toolOutputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString("utf8");
  if (value === undefined) return "";
  const json = JSON.stringify(value);
  return json ?? "";
}

export function toolErrorDetail(error: unknown): string {
  if (isRecord(error)) {
    const status = typeof error.status === "number" ? `exit status ${error.status}` : undefined;
    const stderr = error.stderr === undefined ? "" : toolOutputText(error.stderr).trim();
    const stdout = error.stdout === undefined ? "" : toolOutputText(error.stdout).trim();
    const message = error.message === undefined ? toolOutputText(error) : toolOutputText(error.message);
    return [status, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`, message].filter(Boolean).join("; ");
  }
  return error instanceof Error ? errorMessage(error) : toolOutputText(error);
}

const realExecutor: ToolExecutor = (binary, args, options) => execFileSync(binary, [...args], options);

let toolExecObserver: (exec: ToolExecRecord) => void = () => undefined;

export function observeToolExec(observe: (exec: ToolExecRecord) => void): void {
  toolExecObserver = observe;
}

/** Run one external tool command, reattempting the failures the policy admits. */
export function runTool(
  binary: string,
  args: readonly string[],
  policy: RetryPolicy = DEFAULT_TOOL_RETRY,
  options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS,
  executor: ToolExecutor = realExecutor,
): string {
  let attempt = 0;
  const observedAttempt = (): string => {
    attempt += 1;
    const startedAt = Date.now();
    try {
      const output = executor(binary, args, options);
      toolExecObserver({ binary, args, attempt, ok: true, elapsedMs: Date.now() - startedAt });
      return output;
    } catch (error: unknown) {
      toolExecObserver({ binary, args, attempt, ok: false, elapsedMs: Date.now() - startedAt });
      throw error;
    }
  };
  return retryingSync(`${binary} ${args.join(" ")}`, observedAttempt, policy);
}

/** Run one external tool command, answering null instead of throwing. For the
 *  inventory reads where "no answer" and "an error" are the same to the caller. */
export function runToolBestEffort(
  binary: string,
  args: readonly string[],
  policy: RetryPolicy = DEFAULT_TOOL_RETRY,
  options: ExecFileSyncOptionsWithStringEncoding = DEFAULT_OPTIONS,
  executor: ToolExecutor = realExecutor,
): string | null {
  try {
    return runTool(binary, args, policy, options, executor);
  } catch {
    return null;
  }
}
