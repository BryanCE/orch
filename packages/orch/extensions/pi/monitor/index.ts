// The monitor tool: watch any long-running command, and get each line it prints as a message,
// mid-turn or waking the agent when idle. It runs in this harness's process, so it has no time
// limit unless the agent sets one, and an idle agent is never woken by a watch expiring.
import { Type } from "typebox";
import { createLocalBashOperations, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { toolResult } from "orch/core/agent/peers.ts";
import { Watches } from "./watches.ts";
import { MONITOR_MESSAGE, attachMonitorItem, endText, isMonitorUi, monitorMessageComponent, openMonitorPanel } from "./ui.ts";
import type { HarnessApi, HarnessContext } from "orch/core/types/agent.ts";
import type { SettingsManager } from "orch/core/types/services.ts";
import type { Watch, WatchEnd, WatchLimits } from "./watch.ts";

/** The harness surface the monitor needs beyond orch's common one. */
type MonitorApi = HarnessApi & Pick<ExtensionAPI, "sendMessage" | "registerMessageRenderer">;

function hasMonitorApi(harness: HarnessApi): harness is MonitorApi {
  return typeof Reflect.get(harness, "sendMessage") === "function"
    && typeof Reflect.get(harness, "registerMessageRenderer") === "function";
}

interface MonitorParams {
  readonly command: string;
  readonly description: string;
  readonly timeout_ms?: number;
}

interface MonitorStopParams {
  readonly id: string;
}

function header(watch: Watch): string {
  return `[monitor ${watch.id}: ${watch.description}]`;
}

/** Register the monitor tool, its stop tool, and its views on a harness that can carry them. */
export function registerMonitor(harness: HarnessApi, settings: SettingsManager): void {
  if (!hasMonitorApi(harness)) return;
  const watches = new Watches(createLocalBashOperations().exec);
  let closing = false;

  const limits = (): WatchLimits => {
    const tool = settings.current().monitor_tool;
    return { batchMs: tool.batch_ms, maxEventsPerMinute: tool.max_events_per_minute, tailLines: tool.tail_lines };
  };

  // The item under the editor is bound to the UI of the latest context that reached this
  // extension. At session start that UI can be the harness's no-op stand-in, before its screen
  // binds, so each monitor call binds it again with a live one.
  let detachItem: (() => void) | undefined;
  const attachItem = (ctx: HarnessContext): void => {
    const ui: unknown = ctx.ui;
    if (!ctx.hasUI || !isMonitorUi(ui)) return;
    detachItem?.();
    detachItem = attachMonitorItem(ui, watches);
  };

  const ports = {
    onEvent: (watch: Watch, lines: readonly string[]): void => {
      harness.sendMessage(
        { customType: MONITOR_MESSAGE, content: `${header(watch)}\n${lines.join("\n")}`, display: true, details: { id: watch.id } },
        { triggerTurn: true, deliverAs: "steer" },
      );
    },
    onEnd: (watch: Watch, end: WatchEnd): void => {
      // The agent stopped it and already has the tool's answer; a closing session tells no one.
      if (closing || (end.kind === "stopped" && end.by === "agent")) return;
      const content = `${header(watch)} ${endText(end)}, after ${watch.events} event${watch.events === 1 ? "" : "s"}`;
      // The user stopping a watch is news for the agent's next turn, never a reason to wake it.
      const delivery = end.kind === "stopped" ? { deliverAs: "nextTurn" as const } : { triggerTurn: true, deliverAs: "steer" as const };
      harness.sendMessage({ customType: MONITOR_MESSAGE, content, display: true, details: { id: watch.id } }, delivery);
    },
  };

  harness.registerTool({
    name: "monitor",
    label: "Monitor",
    description: "Start a background monitor on a long-running command. Each output line is an event: it arrives as a message, during your turn or waking you when idle. Lines within a short window arrive as one message. It returns at once with the monitor's id. It has no time limit unless timeout_ms is set. Exit ends the watch, and you get one message saying how it ended.",
    promptSnippet: "Watch a long-running command and get each line it prints as a message",
    promptGuidelines: [
      "Use monitor to watch a long-running command (a log tail, a build, a test run, orch monitor) instead of polling it or sleeping; filter its output to the lines you act on, with grep --line-buffered on every pipe stage.",
      "Use monitor_stop with the id monitor returned to end a watch you no longer need.",
    ],
    parameters: Type.Object({
      command: Type.String({ description: "Shell command. Each output line is an event; exit ends the watch." }),
      description: Type.String({ description: "Short name for what this watches; it heads every message." }),
      timeout_ms: Type.Optional(Type.Integer({ minimum: 1000, description: "Stop the watch after this many milliseconds. Leave it out to watch until the command exits or you stop it." })),
    }),
    execute(_toolCallId, params: MonitorParams, _signal, _onUpdate, ctx: HarnessContext) {
      attachItem(ctx);
      const watch = watches.start(
        { description: params.description, command: params.command, cwd: process.cwd(), timeoutMs: params.timeout_ms ?? null },
        limits(),
        ports,
      );
      return Promise.resolve(toolResult(`Monitor ${watch.id} started. Each line it prints arrives as a message headed ${header(watch)}. Keep working; stop it with monitor_stop ${watch.id}.`));
    },
  });

  harness.registerTool({
    name: "monitor_stop",
    label: "Stop monitor",
    description: "Stop a monitor that the monitor tool started, by its id.",
    parameters: Type.Object({ id: Type.String({ description: "The id monitor returned, such as m1." }) }),
    execute(_toolCallId, params: MonitorStopParams) {
      const watch = watches.get(params.id);
      if (watch === undefined) return Promise.resolve(toolResult(`No monitor ${params.id}.`));
      if (!watch.running) return Promise.resolve(toolResult(`Monitor ${params.id} already ended.`));
      watch.halt({ kind: "stopped", by: "agent" });
      return Promise.resolve(toolResult(`Monitor ${params.id} stopped after ${watch.events} event${watch.events === 1 ? "" : "s"}.`));
    },
  });

  harness.registerMessageRenderer(MONITOR_MESSAGE, (message, options, theme) => {
    const content = typeof message.content === "string"
      ? message.content
      : message.content.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n");
    return monitorMessageComponent(content, options.expanded, options.outputPad, theme);
  });

  harness.on("session_start", (_event: unknown, ctx: HarnessContext) => attachItem(ctx));
  harness.on("session_shutdown", () => {
    closing = true;
    detachItem?.();
    detachItem = undefined;
    watches.stopAll();
  });

  harness.registerCommand("monitors", {
    description: "View the commands this session watches with the monitor tool, their output, and stop them",
    handler: async (_args: string | undefined, ctx: HarnessContext) => {
      const ui: unknown = ctx.ui;
      if (isMonitorUi(ui)) await openMonitorPanel(ui, watches);
    },
  });
}
