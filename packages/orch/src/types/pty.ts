import type { HereAgent } from "./agent-place.ts";
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

/** What one PTY this orchd holds is for: an agent proven to run here, or the login `orch host
 *  add` runs for the human, which is no agent. */
export type HeldTerminal =
  | { readonly kind: "agent"; readonly agent: HereAgent }
  | { readonly kind: "login"; readonly id: string };

/** The id a held terminal's PTY was started under. */
export function heldId(terminal: HeldTerminal): string {
  switch (terminal.kind) {
    case "agent":
      return terminal.agent.id;
    case "login":
      return terminal.id;
    default: {
      const exhaustive: never = terminal;
      throw new Error(`unknown held terminal ${String(exhaustive)}`);
    }
  }
}

/**
 * Every PTY this orchd holds, by the id it was started under. The attach stream reads a
 * snapshot, then follows the live feed; input and resize come back through it. A PTY is
 * this machine's, so every read and write names what it is for: an agent's only once the
 * agent is proven to run here. Starting one, and killing one, come before or after the
 * agent's row says where it runs, so they take the id.
 */
export interface PtyHolder {
  /** Start the program in a new PTY held under `id`: an agent's minted id, or a login's key.
   *  Resolves with its pid once it runs. */
  start(id: string, request: HeldStartRequest): Promise<{ readonly pid: number }>;
  has(terminal: HeldTerminal): boolean;
  /** The screen and its scrollback as escape sequences that redraw it on an empty terminal. */
  snapshot(terminal: HeldTerminal): string;
  /** The last `lines` lines of the screen and its scrollback, as plain text. */
  text(terminal: HeldTerminal, lines: number): string;
  /** Follow the PTY's output from the end of the current snapshot. Returns the unsubscribe. */
  subscribe(terminal: HeldTerminal, onData: (data: string) => void, onExit: (exit: PtyExit) => void): () => void;
  write(terminal: HeldTerminal, data: string): void;
  resize(terminal: HeldTerminal, cols: number, rows: number): void;
  /** End the program started under `id`. */
  kill(id: string): void;
  count(): number;
  /** End every held PTY: orchd is stopping. */
  killAll(): void;
}
