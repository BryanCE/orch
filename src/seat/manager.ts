/**
 * PackManager — owns this session's pack: the orch agents it spawned.
 *
 * Adapted from Ben Davis's SubagentManager (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/manager.ts): the same pump-fiber → folded-snapshot
 * → synchronous read-model architecture, with two orch-shaped differences:
 * agents are BORN elsewhere (orch spawn) and discovered from the daemon's
 * event stream rather than created by this manager, and killing this session
 * never kills an agent — work survives its spawner, always. The manager's
 * scope owns only the subscription and fibers, never a pane.
 */
import { Context, Effect, Fiber, Layer, Runtime, Stream } from "effect";
import {
  SETTLED_STATES,
  type PackEnrichment,
  type PackSendError,
  type PackSnapshot,
  type PackTransition,
} from "./domain.ts";
import { PackSource, type PackSourceShape } from "./source.ts";

const MAX_TRACKED = 128;
const TASK_MAX_LENGTH = 4_096;

// --- Internal state -----------------------------------------------------------

/** Mutable snapshot; exposed to readers via the readonly PackSnapshot type. */
interface MutableSnapshot {
  key: string;
  name: string;
  state: string;
  model: string | null;
  task: string;
  lastError?: string;
  cost?: number;
  dispatchId?: string;
  createdAt: number;
  lastTransitionAt: number;
  info: PackEnrichment;
}

interface Entry {
  snapshot: MutableSnapshot;
  /** Millis of the last presence read, so renders do not hammer the disk. */
  enrichedAt: number;
}

const ENRICH_TTL_MS = 1_000;

// --- Read model ----------------------------------------------------------------

/** Synchronous bridge for the TUI. Snapshots are live objects; do not mutate. */
export interface PackReadView {
  list(): readonly PackSnapshot[];
  get(key: string): PackSnapshot | undefined;
  size(): number;
  /** Any-change notification (status line, dashboard). */
  subscribe(listener: () => void): () => void;
  /** Per-agent notification (takeover view). */
  subscribeTo(key: string, listener: () => void): () => void;
  /** Fire-and-forget: steer/continue an agent (takeover input). */
  requestSend(key: string, text: string): void;
  /** Fire-and-forget: abort an agent's current turn (dashboard `x`, takeover). */
  requestAbort(key: string): void;
  /** Refresh one agent's presence facts now (takeover open). */
  refresh(key: string): void;
}

// --- Service --------------------------------------------------------------------

export interface PackManagerShape {
  send(key: string, text: string): Effect.Effect<string, PackSendError>;
  readonly view: PackReadView;
  readonly disposeAll: Effect.Effect<void>;
}

export class PackManager extends Context.Tag("orch/seat/PackManager")<PackManager, PackManagerShape>() {}

// --- Implementation --------------------------------------------------------------

const makeManager = Effect.gen(function* () {
  const source: PackSourceShape = yield* PackSource;
  const runtime = yield* Effect.runtime<never>();
  const runDetached = Runtime.runFork(runtime);

  const entries = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  const keyListeners = new Map<string, Set<() => void>>();
  let disposed = false;

  const notify = (key?: string) => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A failed status/render listener must not corrupt fold state.
      }
    }
    if (key) {
      for (const listener of keyListeners.get(key) ?? []) {
        try {
          listener();
        } catch {
          // Same.
        }
      }
    }
  };

  /** The identity wall: an event joins the pack only when THIS session spawned its agent. */
  const isOwn = (transition: PackTransition): boolean => {
    const own = source.ownKey();
    return own !== undefined && transition.spawnedBy === own;
  };

  const enrich = (entry: Entry, force = false) => {
    const now = Date.now();
    if (!force && now - entry.enrichedAt < ENRICH_TTL_MS) return;
    entry.enrichedAt = now;
    entry.snapshot.info = source.enrich(entry.snapshot.key);
  };

  const pruneSettled = () => {
    if (entries.size <= MAX_TRACKED) return;
    const candidates = [...entries.values()]
      .filter((entry) => SETTLED_STATES.has(entry.snapshot.state))
      .sort((a, b) => a.snapshot.lastTransitionAt - b.snapshot.lastTransitionAt);
    for (const entry of candidates) {
      if (entries.size <= MAX_TRACKED) break;
      entries.delete(entry.snapshot.key);
    }
  };

  const foldTransition = (transition: PackTransition) => {
    if (!isOwn(transition)) return;
    if (transition.newState === "exited") {
      // A closed pane leaves the board; orch's registry keeps the history.
      entries.delete(transition.key);
      notify(transition.key);
      return;
    }
    const existing = entries.get(transition.key);
    const at = transition.ts ? Date.parse(transition.ts) || Date.now() : Date.now();
    if (existing) {
      const s = existing.snapshot;
      s.name = transition.name;
      s.state = transition.newState;
      s.model = transition.model ?? s.model;
      s.task = (transition.task ?? s.task).slice(0, TASK_MAX_LENGTH);
      s.lastError = transition.lastError ?? (transition.newState === "error" ? s.lastError : undefined);
      s.cost = transition.cost ?? s.cost;
      s.dispatchId = transition.dispatchId ?? s.dispatchId;
      s.lastTransitionAt = at;
      enrich(existing);
    } else {
      const entry: Entry = {
        snapshot: {
          key: transition.key,
          name: transition.name,
          state: transition.newState,
          model: transition.model,
          task: (transition.task ?? "").slice(0, TASK_MAX_LENGTH),
          lastError: transition.lastError,
          cost: transition.cost,
          dispatchId: transition.dispatchId,
          createdAt: at,
          lastTransitionAt: at,
          info: {},
        },
        enrichedAt: 0,
      };
      entries.set(transition.key, entry);
      enrich(entry);
    }
    pruneSettled();
    notify(transition.key);
  };

  // Pump: fold the daemon stream into snapshots for as long as the manager
  // lives. The subscription self-heals across daemon restarts, so the fiber
  // only ends when the manager's scope closes.
  const pump = yield* Effect.forkDaemon(
    Stream.runForEach(source.transitions, (transition) =>
      Effect.sync(() => {
        if (!disposed) foldTransition(transition);
      })),
  );

  const send = (key: string, text: string) => source.send(key, text);

  const view: PackReadView = {
    list: () => {
      const rows = [...entries.values()];
      for (const entry of rows) enrich(entry);
      return rows
        .map((entry) => entry.snapshot as PackSnapshot)
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    get: (key) => entries.get(key)?.snapshot,
    size: () => entries.size,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeTo: (key, listener) => {
      let set = keyListeners.get(key);
      if (!set) {
        set = new Set();
        keyListeners.set(key, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) keyListeners.delete(key);
      };
    },
    requestSend: (key, text) => {
      runDetached(send(key, text).pipe(Effect.ignore));
    },
    requestAbort: (key) => {
      runDetached(source.abort(key).pipe(Effect.ignore));
    },
    refresh: (key) => {
      const entry = entries.get(key);
      if (entry) {
        enrich(entry, true);
        notify(key);
      }
    },
  };

  const disposeAll = Effect.gen(function* () {
    disposed = true;
    yield* Fiber.interrupt(pump);
    entries.clear();
    listeners.clear();
    keyListeners.clear();
  });

  yield* Effect.addFinalizer(() => disposeAll.pipe(Effect.ignore));

  return {
    send,
    view,
    disposeAll,
  } satisfies PackManagerShape;
});

export const PackManagerLive: Layer.Layer<PackManager, never, PackSource> =
  Layer.scoped(PackManager, makeManager);
