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
import { heldId, type HeldPtySettings, type HeldStartRequest, type HeldTerminal, type PtyExit, type PtyHolder, type PtyProcess, type PtyProvider } from "../../types/pty.ts";

interface Subscriber {
  readonly onData: (data: string) => void;
  readonly onExit: (exit: PtyExit) => void;
}

interface HeldEntry {
  readonly pty: PtyProcess;
  readonly terminal: Terminal;
  readonly serializer: SerializeAddon;
  readonly subscribers: Set<Subscriber>;
}

export class PtyHold implements PtyHolder {
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
    const entry: HeldEntry = { pty, terminal, serializer, subscribers: new Set() };
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
    const subscribers = this.entry(heldId(terminal)).subscribers;
    const subscriber: Subscriber = { onData, onExit };
    subscribers.add(subscriber);
    return () => { subscribers.delete(subscriber); };
  }

  write(terminal: HeldTerminal, data: string): void {
    this.entry(heldId(terminal)).pty.write(data);
  }

  resize(terminal: HeldTerminal, cols: number, rows: number): void {
    const entry = this.entry(heldId(terminal));
    entry.pty.resize(cols, rows);
    entry.terminal.resize(cols, rows);
  }

  kill(key: string): void {
    this.entry(key).pty.kill();
  }

  count(): number {
    return this.entries.size;
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
