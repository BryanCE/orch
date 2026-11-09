import { spawn as spawnProcess } from "node:child_process";
import { freshStartToken, processIsAlive, recordedInstanceIsLive } from "../process-identity.ts";
import type { InstanceProbe } from "../process-identity.ts";
import type { ForegroundRole, ProcessRole, LocalProcess, StartRequest, StartedProcess } from "../types/backend.ts";
import type { BackendHandle, LocalProcessRoleDeps } from "../types/backend.ts";
import { observedHere } from "../local-process.ts";

/** The process orch is running in, and the one that invoked it. */
export function isOwnProcess(pid: number): boolean {
  return pid === process.pid || pid === process.ppid;
}

/** The default signal: never orch itself, never its parent, never a process on another host. */
export function signalOtherProcess(target: LocalProcess, signal: NodeJS.Signals): void {
  if (isOwnProcess(target.pid)) throw new Error(`cannot signal process ${target.pid}: orch is running in it`);
  process.kill(target.pid, signal);
}

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
  const startToken = freshStartToken(pid);
  if (!startToken) {
    try { child.kill("SIGTERM"); } catch { /* the process is not safely addressable */ }
    throw new Error(`process ${executable} did not provide a start token`);
  }
  child.unref();
  return { ...observedHere(pid, startToken), startToken };
}

/** Node process implementation shared by every composed environment provider. */
export class LocalProcessRole<Handle = BackendHandle> implements ProcessRole<Handle> {
  private readonly alive: (pid: number) => boolean;
  private readonly token: (pid: number) => string | undefined;
  private readonly startProcess: (request: StartRequest) => StartedProcess;
  private readonly signalProcess: (process: LocalProcess, signal: NodeJS.Signals) => void;

  private readonly probe: InstanceProbe;

  constructor(private readonly pidOf: (handle: Handle) => number | null, deps: LocalProcessRoleDeps = {}) {
    this.alive = deps.isAlive ?? processIsAlive;
    this.token = deps.startToken ?? freshStartToken;
    this.startProcess = deps.spawn ?? startLocalProcess;
    this.signalProcess = deps.signal ?? signalOtherProcess;
    this.probe = { isAlive: this.alive, startToken: this.token };
  }

  start(request: StartRequest): StartedProcess {
    return this.startProcess(request);
  }

  running(handle: Handle): LocalProcess {
    const pid = this.pidOf(handle);
    // A handle with no process cannot be recorded as an agent.
    if (pid === null) throw new Error(`this environment reports no process for ${String(handle)}`);
    return observedHere(pid, this.token(pid) ?? null);
  }

  state(process: LocalProcess): "alive" | "dead" | "replaced" {
    if (recordedInstanceIsLive(process, this.probe)) return "alive";
    return this.alive(process.pid) ? "replaced" : "dead";
  }

  kill(process: LocalProcess, signal: NodeJS.Signals): void {
    const state = this.state(process);
    if (state !== "alive") throw new Error(`cannot kill process ${process.pid}: process instance is ${state}`);
    this.signalProcess(process, signal);
  }
}

/** The process a placing environment runs an agent under: its place's own shell,
 * whose death IS the agent's exit. The foreground role is passed as a thunk
 * because a provider composes its process role before its pane roles exist. */
export function placedShellPid<Handle>(foreground: () => ForegroundRole<Handle>): (handle: Handle) => number | null {
  return (handle) => foreground().read(handle).shellPid;
}
