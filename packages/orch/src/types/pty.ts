/** One program to run inside a pseudo-terminal. */
export interface PtySpawnRequest {
  /** The executable. Its arguments are `args`, never a shell line. */
  readonly file: string;
  readonly args: readonly string[];
  readonly cwd: string;
  /** The child's whole environment. An undefined value leaves that variable unset. */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** The terminal type the child sees as TERM. */
  readonly term: string;
  readonly cols: number;
  readonly rows: number;
}

/** How a PTY's program ended. `signal` is null when it exited on its own. */
export interface PtyExit {
  readonly exitCode: number;
  readonly signal: number | null;
}

/** One running pseudo-terminal and the program inside it. */
export interface PtyProcess {
  /** The program's OS process id on this host. */
  readonly pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  /** End the program. Its exit arrives through `onExit`. */
  kill(): void;
  onData(listener: (data: string) => void): void;
  onExit(listener: (exit: PtyExit) => void): void;
}

/** The PTY port. One provider runs on a native PTY library; tests hand in a fake. */
export interface PtyProvider {
  spawn(request: PtySpawnRequest): Promise<PtyProcess>;
}

/** What the holder needs to start one agent's PTY; the size and terminal type are settings. */
export type HeldStartRequest = Pick<PtySpawnRequest, "file" | "args" | "cwd" | "env">;

/** The PTY sizes and scrollback the holder reads from settings, each time it needs them. */
export interface HeldPtySettings {
  readonly scrollback_lines: number;
  readonly cols: number;
  readonly rows: number;
  readonly term: string;
}

/**
 * Every agent PTY this orchd holds, by agent key. The attach stream reads a
 * snapshot, then follows the live feed; input and resize come back through it.
 */
export interface PtyHolder {
  /** Start the program in a new PTY held under `key`. Resolves with its pid once it runs. */
  start(key: string, request: HeldStartRequest): Promise<{ readonly pid: number }>;
  has(key: string): boolean;
  /** The screen and its scrollback as escape sequences that redraw it on an empty terminal. */
  snapshot(key: string): string;
  /** Follow the PTY's output from the end of the current snapshot. Returns the unsubscribe. */
  subscribe(key: string, onData: (data: string) => void, onExit: (exit: PtyExit) => void): () => void;
  write(key: string, data: string): void;
  resize(key: string, cols: number, rows: number): void;
  kill(key: string): void;
  count(): number;
  /** End every held PTY: orchd is stopping. */
  killAll(): void;
}
