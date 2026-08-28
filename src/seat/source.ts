/**
 * The orch backend for the pi-orchestrator pack system — the seam Davis's
 * subagents extension calls a `SubagentBackend` (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/backend.ts), reshaped for orch: instead of
 * spawning subagent processes, it taps orch's own machinery —
 *   events    → the daemon's push stream (self-healing across restarts)
 *   facts     → the presence store ($ORCH_DIR/agents/<KEY>/status.json)
 *   send      → the peer inbox (orch's delivery mechanism, needs no screen)
 *   abort     → the orch CLI, so control traffic stays on the one dispatcher
 */
import { execFile } from "node:child_process";
import { Context, Effect, Layer, Stream } from "effect";
import { subscribeEvents } from "../daemon/rpc.ts";
import { presenceAgentDir, readPresenceStatus } from "../presence/store.ts";
import { sendPeerMessage } from "../agent/peers.ts";
import { isRecord } from "../util.ts";
import * as path from "node:path";
import { PackAbortError, PackSendError, type PackEnrichment, type PackTransition } from "./domain.ts";

export interface PackSourceShape {
  /** Every daemon transition, unfiltered; the manager applies the identity wall. */
  readonly transitions: Stream.Stream<PackTransition>;
  /** This session's own identity; the pack is the agents THIS key spawned. */
  ownKey(): string | undefined;
  /** Presence facts for one agent, straight off disk. */
  enrich(key: string): PackEnrichment;
  /** Steer or continue one agent through its inbox. */
  send(key: string, text: string): Effect.Effect<string, PackSendError>;
  /** Cancel one agent's current turn via the CLI dispatcher. */
  abort(key: string): Effect.Effect<void, PackAbortError>;
}

export class PackSource extends Context.Tag("orch/seat/PackSource")<PackSource, PackSourceShape>() {}

function isTransition(value: unknown): value is PackTransition & Record<string, unknown> {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.oldState === "string"
    && typeof value.newState === "string";
}

function transitionName(value: PackTransition & Record<string, unknown>): string {
  const name = value.name ?? (value as { agent?: unknown }).agent;
  return typeof name === "string" && name !== "" ? name : value.key;
}

export interface PackSourceConfig {
  readonly orchDir: string;
  readonly ownKey: () => string | undefined;
}

export function makePackSource(config: PackSourceConfig): PackSourceShape {
  const transitions = Stream.async<PackTransition>((emit) => {
    const subscription = subscribeEvents(config.orchDir, { since: 0 }, (event) => {
      if (!isTransition(event)) return;
      void emit.single({ ...event, name: transitionName(event) });
    });
    return Effect.sync(() => subscription.close());
  });

  return {
    transitions,
    ownKey: config.ownKey,
    enrich(key: string): PackEnrichment {
      const dir = presenceAgentDir(key);
      const status = readPresenceStatus(path.join(dir, "status.json"));
      if (!status) return {};
      return {
        sessionPath: status.sessionPath,
        presenceDir: dir,
        cwd: status.cwd,
        thinking: status.thinking,
        usage: status.context
          ? { tokens: status.context.tokens, percent: status.context.percent }
          : undefined,
        lastText: status.lastText,
        asking: status.asking ? { question: status.asking.question, id: status.asking.id } : undefined,
      };
    },
    send(key: string, text: string) {
      return Effect.try({
        try: () => {
          const own = config.ownKey();
          if (!own) throw new Error("this session has no orch identity yet");
          const outcome = sendPeerMessage(key, text, own);
          if (!outcome.startsWith("sent")) throw new Error(outcome);
          return outcome;
        },
        catch: (cause) =>
          new PackSendError({ message: cause instanceof Error ? cause.message : String(cause) }),
      });
    },
    abort(key: string) {
      return Effect.async<void, PackAbortError>((resume) => {
        execFile("orch", ["abort", key], { timeout: 15_000 }, (error, _stdout, stderr) => {
          if (error) {
            resume(Effect.fail(new PackAbortError({ message: stderr.trim() || error.message })));
          } else {
            resume(Effect.void);
          }
        });
      });
    },
  };
}

export function packSourceLayer(config: PackSourceConfig): Layer.Layer<PackSource> {
  return Layer.succeed(PackSource, makePackSource(config));
}
