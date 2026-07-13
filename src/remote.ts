import { execFileSync } from "node:child_process";
import type { HostConfig } from "./config.ts";

export const DEFAULT_REMOTE_TIMEOUT_MS = 3000;

export type RemoteFailureKind = "dead-host" | "timeout" | "non-json" | "invalid-config";

export interface RemoteFailure {
  kind: RemoteFailureKind;
  host: string;
  message: string;
  stderr?: string;
  stdout?: string;
}

export type RemoteResult =
  | { ok: true; value: unknown }
  | { ok: false; failure: RemoteFailure };

export type RemoteOptions = {
  timeoutMs?: number;
  /** Primarily for hermetic callers; ORCH_SSH_BIN is used otherwise. */
  sshBin?: string;
};

function outputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return value === undefined || value === null ? "" : String(value);
}

function errorField(error: unknown, field: string): unknown {
  return error && typeof error === "object" ? Reflect.get(error, field) : undefined;
}

function detail(error: unknown): string {
  const stderr = outputText(errorField(error, "stderr")).trim();
  const message = outputText(errorField(error, "message")).trim();
  return stderr || message || "ssh failed";
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function commandArgs(command: string | readonly string[]): string[] {
  if (Array.isArray(command)) return [...command];
  return command.trim() ? command.trim().split(/\s+/) : [];
}

/** Run one JSON-producing orch command on a configured SSH host. */
export function runRemote(
  hostName: string,
  host: HostConfig,
  command: string | readonly string[],
  options: RemoteOptions = {},
): RemoteResult {
  const destination = host.dest ?? host.ssh;
  if (!destination) {
    return {
      ok: false,
      failure: { kind: "invalid-config", host: hostName, message: `Host "${hostName}" has no SSH destination (expected dest).` },
    };
  }

  const commandParts = commandArgs(command);
  if (commandParts[commandParts.length - 1] !== "--json") commandParts.push("--json");
  const remoteCommand = host.orch_dir
    ? ["env", `ORCH_DIR=${shellQuote(host.orch_dir)}`, "orch", ...commandParts]
    : ["orch", ...commandParts];
  const sshBin = options.sshBin ?? process.env.ORCH_SSH_BIN ?? "ssh";
  const timeout = options.timeoutMs ?? host.timeout_ms ?? DEFAULT_REMOTE_TIMEOUT_MS;
  const args = ["-o", "BatchMode=yes", destination, ...remoteCommand];

  try {
    const stdout = execFileSync(sshBin, args, {
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      return { ok: true, value: JSON.parse(stdout.trim()) };
    } catch {
      return {
        ok: false,
        failure: {
          kind: "non-json",
          host: hostName,
          message: `Host "${hostName}" returned non-JSON output: ${stdout.trim().slice(0, 200)}`,
          stdout,
        },
      };
    }
  } catch (error: unknown) {
    const timedOut = errorField(error, "code") === "ETIMEDOUT"
      || errorField(error, "signal") === "SIGTERM"
      || errorField(error, "killed") === true;
    const kind: RemoteFailureKind = timedOut ? "timeout" : "dead-host";
    const stdout = outputText(errorField(error, "stdout"));
    const stderr = outputText(errorField(error, "stderr"));
    return {
      ok: false,
      failure: {
        kind,
        host: hostName,
        message: timedOut ? `Host "${hostName}" timed out after ${timeout}ms.` : `Host "${hostName}" is unreachable: ${detail(error)}`,
        ...(stdout ? { stdout } : {}),
        ...(stderr ? { stderr } : {}),
      },
    };
  }
}

export const executeRemote = runRemote;
