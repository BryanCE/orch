/**
 * The orch backend for the pi-orchestrator pack system — the seam Davis's
 * subagents extension calls a `SubagentBackend` (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/backend.ts), reshaped for orch: instead of
 * spawning subagent processes, it taps orch's own machinery —
 *   events    → the daemon's push stream (self-healing across restarts)
 *   facts     → the presence store ($ORCH_DIR/agents/<KEY>/status.json)
 *   send      → the daemon's `message` RPC (orch's delivery mechanism, needs no screen)
 *   abort     → the orch CLI, so control traffic stays on the one dispatcher
 */
import { execFile } from "node:child_process";
import { errorMessage } from "../util.ts";
import { Context, Effect, Layer, Stream } from "effect";
import { subscribeEvents } from "../daemon/client/rpc.ts";
import { presenceAgentDir } from "../presence/history.ts";
import { sendPeerMessage } from "../agent/peers.ts";
import { isNotifyEvent } from "../notify/event.ts";
import { selectAgentStatus } from "../store/status-rows.ts";
import { PackAbortError, PackSendError } from "./domain.ts";
import type { PackEnrichment, PackSourceConfig, PackSourceShape } from "../types/seat.ts";
import type { NotifyEvent } from "../types/notify.ts";

export class PackSource extends Context.Tag("orch/seat/PackSource")<PackSource, PackSourceShape>() {}

function transitionName(value: NotifyEvent): string {
  const name = value.name ?? value.agent;
  return typeof name === "string" && name !== "" ? name : value.key;
}

function makePackSource(config: PackSourceConfig): PackSourceShape {
  const transitions = Stream.async<NotifyEvent>((emit) => {
    const subscription = subscribeEvents(config.orchDir, { since: 0 }, (event) => {
      if (!isNotifyEvent(event)) return;
      void emit.single({ ...event, name: transitionName(event) });
    }, undefined, true);
    return Effect.sync(() => subscription.close());
  });

  return {
    transitions,
    ownKey: config.ownKey,
    enrich(key: string): PackEnrichment {
      const status = selectAgentStatus(config.orchDir, key);
      if (!status) return {};
      return {
        sessionPath: status.sessionPath ?? undefined,
        presenceDir: presenceAgentDir(key, config.orchDir),
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
          const outcome = await sendPeerMessage(config.orchDir, config.daemon, key, text, own);
          if (!outcome.startsWith("sent")) throw new Error(outcome);
          return outcome;
        },
        catch: (cause) => new PackSendError({ message: errorMessage(cause) }),
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
