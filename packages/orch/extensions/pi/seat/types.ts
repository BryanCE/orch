import type { Effect, Stream } from "effect";
import type { PackAbortError, PackSendError } from "./domain.ts";
import type { DaemonClient } from "orch/core/types/agent.ts";
import type { OrchDir } from "orch/core/types/core.ts";
import type { NotifyEvent } from "orch/core/types/notify.ts";

/** Presence-store facts that events do not carry, refreshed on read. */
export interface PackEnrichment {
  readonly sessionPath?: string;
  readonly presenceDir?: string;
  readonly cwd?: string;
  readonly thinking?: string;
  readonly usage?: { readonly tokens?: number; readonly contextWindow?: number; readonly percent?: number };
  readonly lastText?: string;
  readonly asking?: { readonly question: string; readonly id: string };
}

/**
 * The manager folds `PackTransition`s into one snapshot per agent. This is
 * everything the status line and both TUI views read.
 */
export interface PackSnapshot {
  readonly key: string;
  readonly name: string;
  readonly state: string;
  readonly model: string | null;
  readonly task: string;
  readonly lastError?: string;
  readonly cost?: number;
  readonly dispatchId?: string;
  readonly createdAt: number;
  readonly lastTransitionAt: number;
  /** The event that put the agent in its current state; an alert is spelled from it. */
  readonly lastEvent: NotifyEvent;
  /** Presence facts, refreshed lazily; may lag the event stream. */
  readonly info: PackEnrichment;
}

export interface OrchSeatOptions {
  readonly orchDir: OrchDir;
  /** This session's orch identity, once presence has minted it. */
  readonly ownKey: () => string | undefined;
}

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

export interface PackManagerShape {
  send(key: string, text: string): Effect.Effect<string, PackSendError>;
  readonly view: PackReadView;
  readonly disposeAll: Effect.Effect<void>;
}

export interface PackRuntime {
  readonly manager: PackManagerShape;
  dispose(): Promise<void>;
}

export interface PackSourceShape {
  /** Every daemon transition, unfiltered; the manager applies the identity wall. */
  readonly transitions: Stream.Stream<NotifyEvent>;
  /** This session's own identity; the pack is the agents THIS key spawned. */
  ownKey(): string | undefined;
  /** Presence facts for one agent, straight off disk. */
  enrich(key: string): PackEnrichment;
  /** Steer or continue one agent through its daemon link. */
  send(key: string, text: string): Effect.Effect<string, PackSendError>;
  /** Cancel one agent's current turn via the CLI dispatcher. */
  abort(key: string): Effect.Effect<void, PackAbortError>;
}

export interface PackSourceConfig {
  readonly orchDir: OrchDir;
  readonly ownKey: () => string | undefined;
  readonly daemon: DaemonClient;
}

export interface TranscriptCache {
  path?: string;
  lines: string[];
  readAt: number;
  width: number;
}
