import { spawn as spawnProcess } from "node:child_process";
import { processIsAlive, processStartToken } from "../process-identity.ts";
import type { ProcessRole, RecordedProcess, StartRequest, StartedProcess } from "../types/backend.ts";
import type { LocalProcessRoleDeps } from "../types/backend.ts";

function startLocalProcess(request: StartRequest): StartedProcess {
  const [executable, ...args] = request.argv;
  if (!executable) throw new Error("process start requires a non-empty argv");
  const child = spawnProcess(executable, args, {
    cwd: request.cwd,
    env: { ...process.env, ...(request.env ?? {}) },
    detached: request.detached ?? true,
    stdio: "ignore",
  });
  const pid = child.pid;
  if (!pid) throw new Error(`process ${executable} did not provide a pid`);
  const startToken = processStartToken(pid);
  if (!startToken) {
    try { child.kill("SIGTERM"); } catch { /* the process is not safely addressable */ }
    throw new Error(`process ${executable} did not provide a start token`);
  }
  child.unref();
  return { pid, startToken };
}

/** Node process implementation shared by every composed environment provider. */
export class LocalProcessRole implements ProcessRole {
  private readonly alive: (pid: number) => boolean;
  private readonly token: (pid: number) => string | undefined;
  private readonly startProcess: (request: StartRequest) => StartedProcess;
  private readonly signalProcess: (pid: number, signal: NodeJS.Signals) => void;

  constructor(deps: LocalProcessRoleDeps = {}) {
    this.alive = deps.isAlive ?? processIsAlive;
    this.token = deps.startToken ?? processStartToken;
    this.startProcess = deps.spawn ?? startLocalProcess;
    this.signalProcess = deps.signal ?? ((pid, signal) => process.kill(pid, signal));
  }

  start(request: StartRequest): StartedProcess {
    return this.startProcess(request);
  }

  state(process: RecordedProcess): "alive" | "dead" | "replaced" {
    if (!this.alive(process.pid)) return "dead";
    return this.token(process.pid) === process.startToken ? "alive" : "replaced";
  }

  kill(process: RecordedProcess, signal: NodeJS.Signals): void {
    const state = this.state(process);
    if (state !== "alive") throw new Error(`cannot kill process ${process.pid}: process instance is ${state}`);
    this.signalProcess(process.pid, signal);
  }
}

export const localProcessRole = new LocalProcessRole();
