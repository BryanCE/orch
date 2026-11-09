import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:os";
import type { PtyExit, PtyProcess, PtyProvider, PtySpawnRequest } from "../../src/types/pty.ts";

/** A PTY whose program is a real child process: a shell that waits for one line and exits 3.
 *  What is typed into the PTY is recorded; the test plays what the program prints. */
export class ChildPty implements PtyProcess {
  readonly written: string[] = [];
  readonly pid: number;
  private readonly dataListeners: ((data: string) => void)[] = [];
  private readonly exitListeners: ((exit: PtyExit) => void)[] = [];

  constructor(readonly child: ChildProcess) {
    if (child.pid === undefined) throw new Error("the stand-in harness did not start");
    this.pid = child.pid;
    child.once("exit", (code, signal) => {
      const exit: PtyExit = { exitCode: code ?? 0, signal: signal === null ? null : constants.signals[signal] };
      for (const listener of this.exitListeners) listener(exit);
    });
  }

  write(data: string): void { this.written.push(data); }
  resize(): void { /* the stand-in draws nothing */ }
  kill(): void { this.child.kill("SIGTERM"); }
  onData(listener: (data: string) => void): void { this.dataListeners.push(listener); }
  onExit(listener: (exit: PtyExit) => void): void { this.exitListeners.push(listener); }

  /** The program prints. */
  emit(data: string): void { for (const listener of this.dataListeners) listener(data); }
  /** The program reads its line and exits on its own. */
  finish(): void { this.child.stdin?.end("\n"); }
  /** Everything typed so far, as one string. */
  typed(): string { return this.written.join(""); }
}

/** Starts a {@link ChildPty} for each held PTY and keeps them all, newest last. */
export class ChildPtyProvider implements PtyProvider {
  readonly spawned: ChildPty[] = [];
  /** Called with each PTY once it runs: a test's stand-in bridge reports from here. */
  onSpawn: (pty: ChildPty, request: PtySpawnRequest) => void = () => undefined;

  spawn(request: PtySpawnRequest): Promise<PtyProcess> {
    const child = spawn("sh", ["-c", "read line; exit 3"], { stdio: ["pipe", "ignore", "ignore"] });
    const pty = new ChildPty(child);
    this.spawned.push(pty);
    this.onSpawn(pty, request);
    return Promise.resolve(pty);
  }

  last(): ChildPty {
    const pty = this.spawned.at(-1);
    if (pty === undefined) throw new Error("no PTY was spawned");
    return pty;
  }

  /** Kill every stand-in still running, for a test's teardown. */
  close(): void {
    for (const { child } of this.spawned) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
}
