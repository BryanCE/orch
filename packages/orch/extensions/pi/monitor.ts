import { Type } from "typebox";
import { subscribeEvents } from "../../src/daemon/client/rpc.ts";
import { onMonitor } from "../../src/commands/events.ts";
import { notificationText } from "../../src/notify/format.ts";
import { agentInMineScope } from "../../src/policy/scope.ts";
import type { BridgeToolResult, HarnessApi, HarnessTool } from "../../src/types/agent.ts";
import type { EventSubscription } from "../../src/types/daemon.ts";
import type { Services } from "../../src/types/services.ts";

interface MonitorTool extends Omit<HarnessTool, "execute"> {
  execute(id: string, params: { enabled?: boolean }): BridgeToolResult;
}

type MonitorHarness = Pick<HarnessApi, "sendUserMessage"> & {
  on(event: "session_shutdown", handler: () => void): void;
  registerTool(tool: MonitorTool): void;
};

/** Bind a session-scoped daemon monitor to Pi's steering input. */
export function registerPiMonitor(
  harness: MonitorHarness,
  services: Pick<Services, "orchDir" | "logger" | "settings">,
  ownKey: () => string | undefined,
  subscribe: typeof subscribeEvents = subscribeEvents,
): void {
  let subscription: EventSubscription | undefined;
  let generation = 0;
  const stop = (): void => {
    generation += 1;
    subscription?.close();
    subscription = undefined;
  };
  harness.on("session_shutdown", stop);
  harness.registerTool({
    name: "orch_monitor",
    label: "Orch monitor",
    description: "Start or stop background monitoring of your orch agents. Returns immediately; matching events arrive as steering messages. Omit enabled to inspect whether monitoring is armed. Peer messages already arrive through the orch bridge.",
    promptSnippet: "Monitor owned orch agents in the background and receive events as steering messages",
    promptGuidelines: ["Use orch_monitor with enabled=true before dispatching workers instead of holding a Bash call open on orch monitor. Stop it with enabled=false when the fleet task is finished."],
    parameters: Type.Object({ enabled: Type.Optional(Type.Boolean()) }),
    execute: (_id, params: { enabled?: boolean }) => {
      if (params.enabled === false) stop();
      if (params.enabled === true && subscription === undefined) {
        const key = ownKey();
        if (!key) throw new Error("This session has no orch identity yet; monitoring cannot start.");
        const activeGeneration = ++generation;
        subscription = subscribe(services.orchDir, { logger: services.logger }, (event) => {
          if (generation !== activeGeneration || ownKey() !== key || event.key === key) return;
          if (!agentInMineScope({ mineAddress: key, leaseOwner: event.holder ?? null, recordSpawnedBy: event.spawnedBy })) return;
          if (!onMonitor(services.settings.current().monitor.on)(event)) return;
          const { title, body } = notificationText(event);
          harness.sendUserMessage(`[orch monitor: ${event.key}] ${title}\n${body}`, { deliverAs: "steer" });
        }, (oldestSeq) => {
          if (generation !== activeGeneration || ownKey() !== key) return;
          harness.sendUserMessage(`[orch monitor] Event replay has a gap before sequence ${oldestSeq}. Read your agents' current status and results to reconcile missed events.`, { deliverAs: "steer" });
        });
      }
      return {
        content: [{ type: "text", text: subscription === undefined ? "Orch monitor stopped." : "Orch monitor armed. Owned-agent events will arrive as steering messages; the connection retries automatically." }],
        details: undefined,
      };
    },
  });
}
