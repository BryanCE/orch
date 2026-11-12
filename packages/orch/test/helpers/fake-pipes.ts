import type { PipesExit, PipesProcess, PipesProvider, PipesSpawn } from "../../src/types/pipes.ts";

class FakePipes implements PipesProcess {
  private readonly incoming = new TransformStream<Uint8Array, Uint8Array>();
  private readonly outgoing = new TransformStream<Uint8Array, Uint8Array>();
  private readonly stderrListeners = new Set<(text: string) => void>();
  private resolveExit: (exit: PipesExit) => void = () => undefined;
  readonly input = this.incoming.writable;
  readonly output = this.outgoing.readable;
  readonly fromOrchd = this.incoming.readable;
  readonly toOrchd = this.outgoing.writable;
  readonly exited = new Promise<PipesExit>((resolve) => { this.resolveExit = resolve; });
  killed = false;

  constructor(readonly pid: number, readonly request: PipesSpawn) {}

  onStderr(listener: (text: string) => void): void { this.stderrListeners.add(listener); }
  stderr(text: string): void { for (const listener of this.stderrListeners) listener(text); }
  exit(code: number | null): void { this.resolveExit({ code, signal: null }); }
  kill(): void {
    this.killed = true;
    this.exit(null);
  }
}

/** Hands out fake pipes with the program's stream ends exposed to tests. Pids count up from
 *  `firstPid`, or each comes from `firstPid` when it is a function; the default is 0, 1, 2. */
export function fakePipes(firstPid: number | (() => number) = 0): { readonly provider: PipesProvider; readonly spawned: FakePipes[] } {
  const spawned: FakePipes[] = [];
  let next = typeof firstPid === "number" ? firstPid : 0;
  const nextPid = typeof firstPid === "number" ? () => next++ : firstPid;
  const provider: PipesProvider = {
    spawn(request) {
      const process = new FakePipes(nextPid(), request);
      spawned.push(process);
      return process;
    },
  };
  return { provider, spawned };
}
