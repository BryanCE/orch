import { heldId, type HeldTerminal, type PtyExit } from "../../src/types/pty.ts";
import type { ScreenHolder } from "../../src/types/screen.ts";

interface FakeScreen {
  screen: string;
  readonly subscribers: Set<{ readonly onData: (data: string) => void; readonly onExit: (exit: PtyExit) => void }>;
  readonly input: string[];
  readonly sizes: { readonly cols: number; readonly rows: number }[];
}

/** A terminal holder with no terminal behind it: the screen is everything printed so far, and
 *  the test plays the agent's output and exit. */
export class FakeScreenHolder implements ScreenHolder {
  private readonly screens = new Map<string, FakeScreen>();
  /** How many snapshots were taken, by agent. */
  readonly snapshots = new Map<string, number>();

  /** Hold an agent whose screen shows `screen`. */
  hold(key: string, screen = ""): void {
    this.screens.set(key, { screen, subscribers: new Set(), input: [], sizes: [] });
  }

  /** The agent prints. */
  print(key: string, data: string): void {
    const held = this.held(key);
    held.screen += data;
    for (const subscriber of held.subscribers) subscriber.onData(data);
  }

  /** The agent ends. */
  exit(key: string, exit: PtyExit): void {
    const held = this.held(key);
    this.screens.delete(key);
    for (const subscriber of held.subscribers) subscriber.onExit(exit);
  }

  /** What the viewer typed into the agent. */
  input(key: string): readonly string[] {
    return this.held(key).input;
  }

  sizes(key: string): readonly { readonly cols: number; readonly rows: number }[] {
    return this.held(key).sizes;
  }

  subscriberCount(key: string): number {
    return this.held(key).subscribers.size;
  }

  has(terminal: HeldTerminal): boolean {
    return this.screens.has(heldId(terminal));
  }

  snapshot(terminal: HeldTerminal): string {
    const key = heldId(terminal);
    this.snapshots.set(key, (this.snapshots.get(key) ?? 0) + 1);
    return this.held(key).screen;
  }

  subscribe(terminal: HeldTerminal, onData: (data: string) => void, onExit: (exit: PtyExit) => void): () => void {
    const subscribers = this.held(heldId(terminal)).subscribers;
    const subscriber = { onData, onExit };
    subscribers.add(subscriber);
    return () => { subscribers.delete(subscriber); };
  }

  write(terminal: HeldTerminal, data: string): void {
    this.held(heldId(terminal)).input.push(data);
  }

  resize(terminal: HeldTerminal, cols: number, rows: number): void {
    this.held(heldId(terminal)).sizes.push({ cols, rows });
  }

  private held(key: string): FakeScreen {
    const held = this.screens.get(key);
    if (held === undefined) throw new Error(`no screen is held for ${key}`);
    return held;
  }
}
