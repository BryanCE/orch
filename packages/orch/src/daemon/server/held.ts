import { Terminal } from "@xterm/headless";
import { SerializeAddon } from "@xterm/addon-serialize";
import { heldId, type HeldPtySettings, type HeldPtysByPid, type HeldStartRequest, type HeldTerminal, type PtyExit, type PtyHolder, type PtyProcess, type PtyProvider, type PtyScreens } from "../../types/pty.ts";

/** The bytes that reset a terminal to an empty screen: a viewer's screen after a relaunch,
 *  matching the new program's fresh one. */
const RESET_SCREEN = "\x1bc";

interface Subscriber {
  readonly onData: (data: string) => void;
  readonly onExit: (exit: PtyExit) => void;
}

type HeldSource =
  | { readonly kind: "pty"; readonly pty: PtyProcess; readonly request: HeldStartRequest }
  | { readonly kind: "writer"; readonly close: () => void };

interface HeldEntry {
  readonly source: HeldSource;
  readonly terminal: Terminal;
  readonly serializer: SerializeAddon;
  readonly subscribers: Set<Subscriber>;
}

/** Screens fed by held PTYs or orchd writers, with one replay and live output path. */
export class PtyHold implements PtyHolder, HeldPtysByPid, PtyScreens {
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
    const entry = this.openEntry(key, { kind: "pty", request, pty }, { cols, rows, scrollback });
    pty.onData((data) => { this.output(entry, data); });
    pty.onExit((exit) => { this.end(key, entry, exit); });
    return { pid: pty.pid };
  }

  /** Open a screen whose transcript orchd writes instead of a PTY. */
  openScreen(key: string, size: { readonly cols: number; readonly rows: number }): { write(text: string): void; close(): void } {
    if (this.entries.has(key) || this.starting.has(key)) throw new Error(`a PTY is already held for ${key}`);
    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      this.end(key, entry, { exitCode: 0, signal: null });
    };
    const entry = this.openEntry(key, { kind: "writer", close }, { ...size, scrollback: this.settings().scrollback_lines });
    return { write: (text) => { if (!closed) this.output(entry, text); }, close };
  }

  private openEntry(key: string, source: HeldSource, size: { readonly cols: number; readonly rows: number; readonly scrollback: number }): HeldEntry {
    const terminal = new Terminal({ ...size, allowProposedApi: true });
    const serializer = new SerializeAddon();
    terminal.loadAddon(serializer);
    const entry: HeldEntry = { source, terminal, serializer, subscribers: new Set() };
    this.entries.set(key, entry);
    return entry;
  }

  private output(entry: HeldEntry, data: string): void {
    entry.terminal.write(data, () => {
      for (const subscriber of entry.subscribers) subscriber.onData(data);
    });
  }

  private end(key: string, entry: HeldEntry, exit: PtyExit): void {
    entry.terminal.write("", () => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      const subscribers = [...entry.subscribers];
      entry.subscribers.clear();
      entry.terminal.dispose();
      for (const subscriber of subscribers) subscriber.onExit(exit);
    });
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
    const { source } = this.entry(heldId(terminal));
    if (source.kind === "pty") source.pty.write(data);
  }

  resize(terminal: HeldTerminal, cols: number, rows: number): void {
    const entry = this.entry(heldId(terminal));
    if (entry.source.kind === "pty") entry.source.pty.resize(cols, rows);
    entry.terminal.resize(cols, rows);
  }

  /** Type into the PTY whose program has `pid`: a backend role addresses a held agent by the
   *  handle it recorded, which is that pid. False when no PTY held here runs it. */
  writeToPid(pid: number, data: string): boolean {
    const held = this.byPid(pid);
    if (held === null) return false;
    held.source.pty.write(data);
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
    const { key, entry, source } = held;
    const subscribers = [...entry.subscribers];
    entry.subscribers.clear();
    const { cols, rows } = entry.terminal;
    const exit = await new Promise<PtyExit>((resolve) => {
      entry.subscribers.add({ onData: () => undefined, onExit: resolve });
      source.pty.kill();
    });
    let started: { readonly pid: number };
    try {
      started = await this.start(key, { ...source.request, args: [...args] });
    } catch (error: unknown) {
      for (const subscriber of subscribers) subscriber.onExit(exit);
      throw error;
    }
    const next = this.entry(key);
    if (next.source.kind === "pty") next.source.pty.resize(cols, rows);
    next.terminal.resize(cols, rows);
    for (const subscriber of subscribers) {
      subscriber.onData(RESET_SCREEN);
      next.subscribers.add(subscriber);
    }
    return started;
  }

  private byPid(pid: number): { readonly key: string; readonly entry: HeldEntry; readonly source: Extract<HeldSource, { kind: "pty" }> } | null {
    for (const [key, entry] of this.entries) {
      const { source } = entry;
      if (source.kind === "pty" && source.pty.pid === pid) return { key, entry, source };
    }
    return null;
  }

  kill(key: string): void {
    const { source } = this.entry(key);
    if (source.kind === "pty") source.pty.kill();
    else source.close();
  }

  count(): number {
    return this.entries.size;
  }

  ids(): readonly string[] {
    return [...this.entries.keys()];
  }

  killAll(): void {
    for (const key of this.entries.keys()) this.kill(key);
  }

  private entry(key: string): HeldEntry {
    const entry = this.entries.get(key);
    if (entry === undefined) throw new Error(`no PTY is held for ${key}`);
    return entry;
  }
}
