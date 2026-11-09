// An agent's screen, streamed to a viewer: `orch attach` on this machine, or another host's
// orchd relaying it to a viewer there. The orchd that runs the agent holds its terminal; every
// other orchd only carries the stream.
import type { PtyHolder } from "./pty.ts";

/** One piece of an agent's screen as it reaches a viewer.
 *
 *  `snapshot` is the whole screen and its scrollback, serialized: a viewer resets its terminal
 *  and draws it. `data` is the agent's output since the last piece. `end` means nothing more
 *  comes, and says why.
 *
 *  Output travels as the string the holder hands over, as is. node-pty decodes the agent's
 *  UTF-8 with a streaming decoder, so a chunk never splits a character, and JSON carries any
 *  string. */
export type ScreenChunk =
  | { readonly kind: "snapshot"; readonly data: string }
  | { readonly kind: "data"; readonly data: string }
  | { readonly kind: "end"; readonly reason: string };

/** What a viewer needs of orchd's terminal holder. */
export type ScreenHolder = Pick<PtyHolder, "has" | "snapshot" | "subscribe" | "write" | "resize">;

/** Where one attached screen comes from: the holder here, or another host's orchd over its link. */
export interface ScreenSource {
  /** Keystrokes from the viewer, to the agent. */
  input(data: string): void | Promise<void>;
  resize(cols: number, rows: number): void | Promise<void>;
  /** The viewer fell behind and its backlog was dropped: send a fresh snapshot. */
  refresh(): void;
  /** The viewer let go: stop streaming to it. */
  release(): void;
}

/** One connection's attached screens. Output for each passes through one bounded queue: a viewer
 *  too slow to keep up loses its backlog and gets a fresh snapshot, and never slows the agent. */
export interface ScreenConnection {
  /** Attach to `key`'s screen, replacing an attach to it already open on this connection. */
  open(key: string, source: ScreenSource, queueBytes: number): void;
  /** One piece of `key`'s screen, for this connection's viewer. */
  push(key: string, chunk: ScreenChunk): void;
  /** The source of a screen this connection is attached to; refuses one it is not. */
  source(key: string): ScreenSource;
  attached(key: string): boolean;
  /** Let go of one screen. */
  close(key: string): void;
  /** Let go of every screen: the connection ended. */
  closeAll(): void;
}
