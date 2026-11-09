import type { PtyExit, PtyProcess, PtyProvider, PtySpawnRequest } from "../../src/types/pty.ts";

/** A PTY with no program behind it: the test plays the program's output and exit. */
export class FakePty implements PtyProcess {
  readonly written: string[] = [];
  readonly sizes: { readonly cols: number; readonly rows: number }[] = [];
  killed = false;
  private readonly dataListeners: ((data: string) => void)[] = [];
  private readonly exitListeners: ((exit: PtyExit) => void)[] = [];

  constructor(readonly pid: number, readonly request: PtySpawnRequest) {}

  write(data: string): void { this.written.push(data); }
  resize(cols: number, rows: number): void { this.sizes.push({ cols, rows }); }
  kill(): void {
    this.killed = true;
    this.exit({ exitCode: 0, signal: 15 });
  }
  onData(listener: (data: string) => void): void { this.dataListeners.push(listener); }
  onExit(listener: (exit: PtyExit) => void): void { this.exitListeners.push(listener); }

  /** The program prints. */
  emit(data: string): void { for (const listener of this.dataListeners) listener(data); }
  /** The program ends. */
  exit(exit: PtyExit): void { for (const listener of this.exitListeners) listener(exit); }
}

/** Hands out fake PTYs and keeps every one it made, newest last. */
export class FakePtyProvider implements PtyProvider {
  readonly spawned: FakePty[] = [];
  private nextPid: number;

  constructor(firstPid = 4_000_000) { this.nextPid = firstPid; }

  spawn(request: PtySpawnRequest): Promise<PtyProcess> {
    const pty = new FakePty(this.nextPid++, request);
    this.spawned.push(pty);
    return Promise.resolve(pty);
  }

  /** The newest fake PTY; throws when none was spawned. */
  last(): FakePty {
    const pty = this.spawned.at(-1);
    if (pty === undefined) throw new Error("no PTY was spawned");
    return pty;
  }
}
