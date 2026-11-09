/**
 * The PTYs this orchd holds, keyed by the id each was started under. Every call but `start`
 * and `kill` names what the PTY is for (`HeldTerminal`): an agent only as proven to run here.
 *
 * orchd is long-lived and owns the terminal of every agent it runs, so a viewer can
 * attach, detach and reattach to the live screen. Each entry is the agent's PTY, an
 * `@xterm/headless` terminal fed by everything the PTY prints, and a serializer over it.
 *
 * API, which the attach stream builds on:
 * - `start(key, request)` runs `request.file` with `request.args` in a new PTY sized by the
 *   `pty` settings and resolves with its pid. A key is held once.
 * - `has(terminal)` says whether a PTY is held for the terminal.
 * - `snapshot(terminal)` is the screen plus up to `pty.scrollback_lines` of scrollback, as escape
 *   sequences that redraw it on an empty terminal.
 * - `text(terminal, lines)` is the last `lines` lines of the screen and scrollback as plain text.
 * - `subscribe(terminal, onData, onExit)` follows the output from exactly where the current
 *   snapshot ends: a chunk reaches subscribers only once the terminal has taken it, so a
 *   snapshot taken and a subscription made in the same tick neither miss nor repeat a byte.
 *   `onExit` fires once when the program ends. Returns the unsubscribe.
 * - `write(terminal, data)` types into the PTY; `resize(terminal, cols, rows)` resizes the PTY and its
 *   screen together.
 * - `kill(key)` ends the program; the entry goes when its exit arrives.
 * - `count()` is how many PTYs are held; `killAll()` ends them all as orchd stops.
 *
 * A call naming a key that is not held throws.
 */
import { Terminal } from "@xterm/headless";
import { SerializeAddon } from "@xterm/addon-serialize";
import { heldId, type HeldPtySettings, type HeldPtysByPid, type HeldStartRequest, type HeldTerminal, type PtyExit, type PtyHolder, type PtyProcess, type PtyProvider } from "../../types/pty.ts";

/** The bytes that reset a terminal to an empty screen: a viewer's screen after a relaunch,
 *  matching the new program's fresh one. */
const RESET_SCREEN = "\x1bc";

interface Subscriber {
  readonly onData: (data: string) => void;
  readonly onExit: (exit: PtyExit) => void;
}

interface HeldEntry {
  /** What the PTY was started with, for a relaunch that keeps all of it but the arguments. */
  readonly request: HeldStartRequest;
  readonly pty: PtyProcess;
  readonly terminal: Terminal;
  readonly serializer: SerializeAddon;
  readonly subscribers: Set<Subscriber>;
}

export class PtyHold implements PtyHolder, HeldPtysByPid {
  private readonly entries = new Map<string, HeldEntry>();
  /** Ids whose PTY is being started, so a second start for one is refused at once. */
  private readonly starting = new Set<string>();

  constructor(private readonly provider: PtyProvider, private readonly settings: () => HeldPtySettings) {}

  async start(key: string, request: HeldStartRequest): Promise<{ readonly pid: number }> {
    if (this.entries.has(key) || this.starting.has(key)) throw new Error(`a PTY is already held for ${key}`);
    const { cols, rows, scrollback_lines: scrollback, term } = this.settings();
    this.starting.add(key);
    let pty: PtyProcess;
    try {
      pty = await this.provider.spawn({ ...request, term, cols, rows });
    } finally {
      this.starting.delete(key);
    }
    const terminal = new Terminal({ cols, rows, scrollback, allowProposedApi: true });
    const serializer = new SerializeAddon();
    terminal.loadAddon(serializer);
    const entry: HeldEntry = { request, pty, terminal, serializer, subscribers: new Set() };
    this.entries.set(key, entry);
    pty.onData((data) => {
      terminal.write(data, () => {
        for (const subscriber of entry.subscribers) subscriber.onData(data);
      });
    });
    pty.onExit((exit) => {
      // After every chunk already written: the exit is the feed's last word.
      terminal.write("", () => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        const subscribers = [...entry.subscribers];
        entry.subscribers.clear();
        terminal.dispose();
        for (const subscriber of subscribers) subscriber.onExit(exit);
      });
    });
    return { pid: pty.pid };
  }

  has(terminal: HeldTerminal): boolean {
    return this.entries.has(heldId(terminal));
  }

  snapshot(terminal: HeldTerminal): string {
    return this.entry(heldId(terminal)).serializer.serialize({ scrollback: this.settings().scrollback_lines });
  }

  text(terminal: HeldTerminal, lines: number): string {
    const buffer = this.entry(heldId(terminal)).terminal.buffer.active;
    const shown: string[] = [];
    for (let row = Math.max(0, buffer.length - lines); row < buffer.length; row++) shown.push(buffer.getLine(row)?.translateToString(true) ?? "");
    return shown.join("\n");
  }

  subscribe(terminal: HeldTerminal, onData: (data: string) => void, onExit: (exit: PtyExit) => void): () => void {
    const key = heldId(terminal);
    const subscriber: Subscriber = { onData, onExit };
    this.entry(key).subscribers.add(subscriber);
    // A relaunch moves its subscribers to the new entry, so the one it is in now lets it go.
    return () => { this.entries.get(key)?.subscribers.delete(subscriber); };
  }

  write(terminal: HeldTerminal, data: string): void {
    this.entry(heldId(terminal)).pty.write(data);
  }

  resize(terminal: HeldTerminal, cols: number, rows: number): void {
    const entry = this.entry(heldId(terminal));
    entry.pty.resize(cols, rows);
    entry.terminal.resize(cols, rows);
  }

  /** Type into the PTY whose program has `pid`: a backend role addresses a held agent by the
   *  handle it recorded, which is that pid. False when no PTY held here runs it. */
  writeToPid(pid: number, data: string): boolean {
    const held = this.byPid(pid);
    if (held === null) return false;
    held.entry.pty.write(data);
    return true;
  }

  /** End the program with `pid`, then start `args` under the same id once its exit has arrived:
   *  the id is held once, and its entry goes only with that exit. The subscribers follow the
   *  agent, not the program: they never see this exit, their screen is reset to the new empty
   *  one at the size it had, and they take the new program's output from there. A relaunch that
   *  cannot start ends them with the old program's exit. */
  async relaunchPid(pid: number, args: readonly string[]): Promise<{ readonly pid: number } | null> {
    const held = this.byPid(pid);
    if (held === null) return null;
    const { key, entry } = held;
    const subscribers = [...entry.subscribers];
    entry.subscribers.clear();
    const { cols, rows } = entry.terminal;
    const exit = await new Promise<PtyExit>((resolve) => {
      entry.subscribers.add({ onData: () => undefined, onExit: resolve });
      entry.pty.kill();
    });
    let started: { readonly pid: number };
    try {
      started = await this.start(key, { ...entry.request, args: [...args] });
    } catch (error: unknown) {
      for (const subscriber of subscribers) subscriber.onExit(exit);
      throw error;
    }
    const next = this.entry(key);
    next.pty.resize(cols, rows);
    next.terminal.resize(cols, rows);
    for (const subscriber of subscribers) {
      subscriber.onData(RESET_SCREEN);
      next.subscribers.add(subscriber);
    }
    return started;
  }

  private byPid(pid: number): { readonly key: string; readonly entry: HeldEntry } | null {
    for (const [key, entry] of this.entries) if (entry.pty.pid === pid) return { key, entry };
    return null;
  }

  kill(key: string): void {
    this.entry(key).pty.kill();
  }

  count(): number {
    return this.entries.size;
  }

  ids(): readonly string[] {
    return [...this.entries.keys()];
  }

  killAll(): void {
    for (const entry of this.entries.values()) entry.pty.kill();
  }

  private entry(key: string): HeldEntry {
    const entry = this.entries.get(key);
    if (entry === undefined) throw new Error(`no PTY is held for ${key}`);
    return entry;
  }
}
