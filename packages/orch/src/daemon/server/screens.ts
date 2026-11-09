// The screens one connection is attached to, and the one queue their output shares on its way
// to the viewer. The agent never waits on a viewer: when the socket backs up, output queues
// here, and when the queue outgrows its bound the backlog is dropped and the viewer gets a
// fresh snapshot once it has caught up.
import type { Writable } from "node:stream";
import { encodeLine } from "../client/wire.ts";
import type { ScreenChunk, ScreenConnection, ScreenSource } from "../../types/screen.ts";

interface Attached {
  readonly source: ScreenSource;
  /** Its backlog was dropped: output is ignored until a fresh snapshot replaces it. */
  stale: boolean;
  /** A fresh snapshot was asked of the source and has not arrived. */
  refreshing: boolean;
}

interface Queued {
  readonly key: string;
  readonly kind: ScreenChunk["kind"];
  readonly encoded: string;
  readonly bytes: number;
}

/** The screens a connection writing to `out` is attached to. */
export function screenConnection(out: Writable): ScreenConnection {
  const screens = new Map<string, Attached>();
  const queue: Queued[] = [];
  let queuedBytes = 0;
  let limitBytes = 0;
  /** `out` refused more until it drains. */
  let blocked = false;

  const dequeue = (keep: (entry: Queued) => boolean): void => {
    const kept = queue.filter(keep);
    queue.length = 0;
    queue.push(...kept);
    queuedBytes = kept.reduce((sum, entry) => sum + entry.bytes, 0);
  };

  const write = (encoded: string): void => {
    if (out.destroyed || out.writableEnded) return;
    blocked = !out.write(encoded);
  };

  /** Drop the backlog of every screen that has one. Each gets a fresh snapshot once the
   *  viewer catches up; an end line is never dropped. */
  const overflow = (): void => {
    for (const entry of queue) {
      const screen = screens.get(entry.key);
      if (screen !== undefined && entry.kind !== "end") screen.stale = true;
    }
    dequeue((entry) => entry.kind === "end");
  };

  const refreshStale = (): void => {
    for (const screen of screens.values()) {
      if (!screen.stale || screen.refreshing) continue;
      screen.refreshing = true;
      screen.source.refresh();
    }
  };

  out.on("drain", () => {
    blocked = false;
    while (!blocked && queue.length > 0) {
      const entry = queue.shift();
      if (entry === undefined) break;
      queuedBytes -= entry.bytes;
      write(entry.encoded);
    }
    if (!blocked) refreshStale();
  });

  const release = (key: string): void => {
    const screen = screens.get(key);
    if (screen === undefined) return;
    screens.delete(key);
    dequeue((entry) => entry.key !== key);
    screen.source.release();
  };

  return {
    open(key, source, queueBytes) {
      release(key);
      limitBytes = queueBytes;
      screens.set(key, { source, stale: false, refreshing: false });
    },
    push(key, chunk) {
      const screen = screens.get(key);
      if (screen === undefined) return;
      if (chunk.kind === "data" && screen.stale) return;
      if (chunk.kind === "snapshot") {
        // A snapshot supersedes whatever of this screen is still queued.
        screen.stale = false;
        screen.refreshing = false;
        dequeue((entry) => entry.key !== key);
      }
      if (chunk.kind === "end") screens.delete(key);
      const encoded = encodeLine({ kind: "screen", key, chunk });
      if (!blocked && queue.length === 0) {
        write(encoded);
        return;
      }
      const bytes = Buffer.byteLength(encoded);
      queue.push({ key, kind: chunk.kind, encoded, bytes });
      queuedBytes += bytes;
      if (queuedBytes > limitBytes) overflow();
    },
    source(key) {
      const screen = screens.get(key);
      if (screen === undefined) throw new Error(`this connection is not attached to ${key}'s screen`);
      return screen.source;
    },
    attached: (key) => screens.has(key),
    close: release,
    closeAll() {
      for (const key of [...screens.keys()]) release(key);
    },
  };
}
