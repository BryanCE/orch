import { execFile, execFileSync } from "node:child_process";
import type { HostConfig } from "./config.ts";

const DEFAULT_REMOTE_TIMEOUT_MS = 3000;

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

export interface RemoteOptions {
  timeoutMs?: number;
  /** Primarily for hermetic callers; ORCH_SSH_BIN is used otherwise. */
  sshBin?: string;
}

export interface SshResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code?: number;
}

/** Execute an arbitrary command over SSH (used by diagnostics and remote probes). */
export function runSSH(destination: string, command: string, options: RemoteOptions = {}): SshResult {
  const sshBin = options.sshBin ?? process.env.ORCH_SSH_BIN ?? "ssh";
  const timeout = options.timeoutMs ?? DEFAULT_REMOTE_TIMEOUT_MS;
  try {
    const stdout = execFileSync(sshBin, ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", destination, command], {
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: windowsCommandShell(sshBin),
    });
    return { ok: true, stdout: outputText(stdout), stderr: "", code: 0 };
  } catch (error: unknown) {
    return {
      ok: false,
      stdout: outputText(errorField(error, "stdout")),
      stderr: outputText(errorField(error, "stderr")),
      code: typeof errorField(error, "status") === "number" ? errorField(error, "status") as number : undefined,
    };
  }
}

function windowsCommandShell(sshBin: string): boolean {
  return process.platform === "win32" && /\.(?:cmd|bat)$/i.test(sshBin);
}

function outputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value) ?? "";
  return JSON.stringify(value) ?? "";
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
  if (typeof command !== "string") return command.slice();
  return command.trim() ? command.trim().split(/\s+/) : [];
}

function sshArgs(host: HostConfig, command: string | readonly string[], destination: string): string[] {
  const commandParts = commandArgs(command);
  if (commandParts[commandParts.length - 1] !== "--json") commandParts.push("--json");
  const remoteCommand = host.orch_dir
    ? ["env", `ORCH_DIR=${shellQuote(host.orch_dir)}`, "orch", ...commandParts]
    : ["orch", ...commandParts];
  return ["-o", "BatchMode=yes", destination, ...remoteCommand];
}

function parsedOutput(hostName: string, stdout: string): RemoteResult {
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
}

function failedOutput(hostName: string, error: unknown, timeout: number): RemoteResult {
  const timedOut = errorField(error, "code") === "ETIMEDOUT"
    || errorField(error, "signal") === "SIGTERM"
    || errorField(error, "killed") === true;
  const stdout = outputText(errorField(error, "stdout"));
  const stderr = outputText(errorField(error, "stderr"));
  return {
    ok: false,
    failure: {
      kind: timedOut ? "timeout" : "dead-host",
      host: hostName,
      message: timedOut ? `Host "${hostName}" timed out after ${timeout}ms.` : `Host "${hostName}" is unreachable: ${detail(error)}`,
      ...(stdout ? { stdout } : {}),
      ...(stderr ? { stderr } : {}),
    },
  };
}

/** Run one JSON-producing orch command on a configured SSH host. */
export function runRemote(
  hostName: string,
  host: HostConfig,
  command: string | readonly string[],
  options: RemoteOptions = {},
): RemoteResult {
  const destination = host.dest;
  if (!destination) {
    return {
      ok: false,
      failure: { kind: "invalid-config", host: hostName, message: `Host "${hostName}" has no SSH destination (expected dest).` },
    };
  }
  const sshBin = options.sshBin ?? process.env.ORCH_SSH_BIN ?? "ssh";
  const timeout = options.timeoutMs ?? host.timeout_ms ?? DEFAULT_REMOTE_TIMEOUT_MS;
  try {
    const stdout = execFileSync(sshBin, sshArgs(host, command, destination), {
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: windowsCommandShell(sshBin),
    });
    return parsedOutput(hostName, stdout);
  } catch (error: unknown) {
    return failedOutput(hostName, error, timeout);
  }
}

/** Asynchronous JSON command executor for parallel multi-host reads. */
export function runRemoteAsync(
  hostName: string,
  host: HostConfig,
  command: string | readonly string[],
  options: RemoteOptions = {},
): Promise<RemoteResult> {
  const destination = host.dest;
  if (!destination) {
    return Promise.resolve({
      ok: false,
      failure: { kind: "invalid-config", host: hostName, message: `Host "${hostName}" has no SSH destination (expected dest).` },
    });
  }
  const sshBin = options.sshBin ?? process.env.ORCH_SSH_BIN ?? "ssh";
  const timeout = options.timeoutMs ?? host.timeout_ms ?? DEFAULT_REMOTE_TIMEOUT_MS;
  return new Promise((resolve) => {
    execFile(sshBin, sshArgs(host, command, destination), {
      timeout,
      encoding: "utf8",
      windowsHide: true,
      shell: windowsCommandShell(sshBin),
    }, (error, stdout, stderr) => {
      if (!error) {
        resolve(parsedOutput(hostName, outputText(stdout)));
        return;
      }
      const out = outputText(stdout);
      const err = outputText(stderr);
      const timedOut = errorField(error, "code") === "ETIMEDOUT"
        || errorField(error, "signal") === "SIGTERM"
        || errorField(error, "killed") === true;
      resolve({
        ok: false,
        failure: {
          kind: timedOut ? "timeout" : "dead-host",
          host: hostName,
          message: timedOut ? `Host "${hostName}" timed out after ${timeout}ms.` : `Host "${hostName}" is unreachable: ${err.trim() || error.message || "ssh failed"}`,
          ...(out ? { stdout: out } : {}),
          ...(err ? { stderr: err } : {}),
        },
      });
    });
  });
}
