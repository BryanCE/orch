/**
 * The orch backend for the pi-orchestrator pack system — the seam Davis's
 * subagents extension calls a `SubagentBackend` (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/backend.ts), reshaped for orch: instead of
 * spawning subagent processes, it taps orch's own machinery —
 *   events    → the daemon's push stream (self-healing across restarts)
 *   facts     → the daemon's `agent-status` RPC
 *   send      → the daemon's `message` RPC (orch's delivery mechanism, needs no screen)
 *   abort     → the daemon's `abort` RPC, which goes through the one control dispatcher
 *   session   → the daemon's `agent-read` RPC, which reads the session wherever the agent runs
 */
import { errorMessage } from "orch/core/util.ts";
import { Context, Effect, Layer, Stream } from "effect";
import { subscribeEvents } from "orch/core/daemon/client/rpc.ts";
import { callerCredential } from "orch/core/identity/credential.ts";
import { sendPeerMessage } from "orch/core/agent/peers.ts";
import { isNotifyEvent } from "orch/core/notify/event.ts";
import { PackAbortError, PackSendError, transitionName } from "./domain.ts";
import type { PackEnrichment, PackSourceConfig, PackSourceShape, SessionRead } from "./types.ts";
import type { NotifyEvent } from "orch/core/types/notify.ts";

export class PackSource extends Context.Tag("orch/seat/PackSource")<PackSource, PackSourceShape>() {}

function makePackSource(config: PackSourceConfig): PackSourceShape {
  const transitions = Stream.async<NotifyEvent>((emit) => {
    const subscription = subscribeEvents(config.orchDir, { since: 0 }, (event) => {
      if (!isNotifyEvent(event)) return;
      void emit.single({ ...event, name: transitionName(event) });
    });
    return Effect.sync(() => subscription.close());
  });

  return {
    transitions,
    ownKey: config.ownKey,
    async enrich(key: string): Promise<PackEnrichment> {
      const status = (await config.daemon.ask("agent-status", { target: key }))?.status;
      if (!status) return {};
      return {
        thinking: status.thinking ?? undefined,
        usage: status.contextPercent === null && status.contextTokens === null
          ? undefined
          : {
              tokens: status.contextTokens ?? undefined,
              percent: status.contextPercent ?? undefined,
            },
        lastText: status.lastText ?? undefined,
      };
    },
    send(key: string, text: string) {
      return Effect.tryPromise({
        try: async () => {
          const own = config.ownKey();
          if (!own) throw new Error("this session has no orch identity yet");
          const outcome = await sendPeerMessage(config.daemon, key, text, own);
          if (!outcome.startsWith("sent")) throw new Error(outcome);
          return outcome;
        },
        catch: (cause) => new PackSendError({ message: errorMessage(cause) }),
      });
    },
    abort(key: string) {
      return Effect.tryPromise({
        try: async () => {
          const outcome = await config.daemon.ask("abort", { target: key, caller: callerCredential() });
          if (outcome === undefined) throw new Error(`orchd did not abort ${key}`);
          if (outcome.outcome === "answer") throw new Error(outcome.text);
        },
        catch: (cause) => new PackAbortError({ message: errorMessage(cause) }),
      });
    },
    async readSession(key: string): Promise<SessionRead | undefined> {
      const answer = await config.daemon.ask("agent-read", { caller: callerCredential(), key, read: { kind: "session" } });
      if (answer?.reading.kind !== "session") return undefined;
      return { host: answer.host, lookup: answer.reading.lookup };
    },
  };
}

export function packSourceLayer(config: PackSourceConfig): Layer.Layer<PackSource> {
  return Layer.succeed(PackSource, makePackSource(config));
}
