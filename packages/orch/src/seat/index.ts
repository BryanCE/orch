/**
 * The orchestrator seat: what a pi session gets when it is the MAIN harness
 * driving orch. Wires the Effect pack runtime to pi's UI — a themed status
 * line, transition alerts, and the /orch-view dashboard + per-agent views.
 *
 * Modeled on Ben Davis's subagents extension registration
 * (davis7dotsh/my-pi-setup, extensions/subagents/index.ts). A session that
 * never spawned an agent sees NOTHING: no status line, no reminder that orch
 * exists — the pack is discovered from daemon events carrying this session's
 * own identity as spawner, never from the environment.
 */
import type { ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import { ALERT_STATES } from "./domain.ts";
import { createPackRuntime } from "./runtime.ts";
import { openPackDashboard } from "./ui/takeover.ts";
import { isRecord } from "../util.ts";
import type { HarnessApi, HarnessContext } from "../types/agent.ts";
import type { OrchSeatOptions, PackRuntime, PackSnapshot } from "../types/seat.ts";

/** The pi UI surface this seat actually uses. Declared as what we need rather than
 *  asserted from the harness type, so a harness that lacks it simply fails the guard
 *  instead of crashing at the call. */
interface SeatNotifyUi { notify(text: string, level: "error" | "warning"): void }
interface SeatStatusUi { setStatus(id: string, line: string | undefined): void }

function hasMethod(value: unknown, name: string): boolean {
  if (!isRecord(value)) return false;
  return typeof value[name] === "function";
}

function hasNotify(value: unknown): value is SeatNotifyUi {
  return hasMethod(value, "notify");
}

function hasSetStatus(value: unknown): value is SeatStatusUi {
  return hasMethod(value, "setStatus");
}

const STATUS_ID = "orch";
const SQUARE = "■";

interface PackCounts {
  working: number;
  blocked: number;
  failed: number;
  done: number;
}

export function countStates(agents: readonly PackSnapshot[]): PackCounts {
  const counts: PackCounts = { working: 0, blocked: 0, failed: 0, done: 0 };
  for (const agent of agents) {
    if (agent.state === "working" || agent.state === "spawning") counts.working += 1;
    else if (agent.state === "blocked" || agent.state === "asking") counts.blocked += 1;
    else if (agent.state === "error" || agent.state === "aborted") counts.failed += 1;
    else counts.done += 1;
  }
  return counts;
}

/** `orch: ■ 2 working · ■ 1 blocked · ■ 3 done · /orch-view to view`, themed. */
export function formatSeatStatus(theme: Theme, agents: readonly PackSnapshot[]): string {
  const counts = countStates(agents);
  const parts: string[] = [];
  if (counts.working > 0) parts.push(theme.fg("warning", `${SQUARE} ${counts.working} working`));
  if (counts.blocked > 0) parts.push(theme.fg("error", `${SQUARE} ${counts.blocked} blocked`));
  if (counts.failed > 0) parts.push(theme.fg("error", `${SQUARE} ${counts.failed} failed`));
  if (counts.done > 0) parts.push(theme.fg("success", `${SQUARE} ${counts.done} done`));
  parts.push(theme.fg("accent", "/orch-view") + theme.fg("dim", " to view"));
  return `${theme.fg("muted", "orch:")} ${parts.join(theme.fg("dim", " · "))}`;
}

export function hasTheme(ui: unknown): ui is { theme: Theme } {
  if (typeof ui !== "object" || ui === null || !("theme" in ui)) return false;
  const theme = ui.theme;
  return typeof theme === "object" && theme !== null && "fg" in theme && typeof theme.fg === "function";
}

/** Register the orchestrator seat on a pi session. */
interface SeatRegistrationApi {
  on: HarnessApi["on"];
  registerCommand: HarnessApi["registerCommand"];
}

function isDashboardContext(value: unknown): value is ExtensionCommandContext {
  if (typeof value !== "object" || value === null || !("ui" in value)) return false;
  const ui = value.ui;
  return typeof ui === "object" && ui !== null && "custom" in ui && typeof ui.custom === "function";
}

export function registerOrchSeat(pi: SeatRegistrationApi, options: OrchSeatOptions): void {
  let runtime: PackRuntime | undefined;
  let unsubscribe: (() => void) | undefined;
  /** Last state seen per agent, for alerting on the transition INTO an alert state. */
  const lastStates = new Map<string, string>();

  const ensureRuntime = (): PackRuntime => {
    runtime ??= createPackRuntime({ orchDir: options.orchDir, ownKey: options.ownKey });
    return runtime;
  };

  pi.on("session_start", (_event: unknown, ctx: HarnessContext) => {
    if (!ctx.hasUI) return;
    const view = ensureRuntime().manager.view;
    const ui: unknown = ctx.ui;
    const theme = hasTheme(ui) ? ui.theme : undefined;

    const onChange = (): void => {
      const agents = view.list();
      // Alert once per entry into an attention state; a re-render never re-alerts.
      for (const agent of agents) {
        const previous = lastStates.get(agent.key);
        lastStates.set(agent.key, agent.state);
        if (ALERT_STATES.has(agent.state) && previous !== undefined && !ALERT_STATES.has(previous)) {
          const detail = agent.info.asking?.question ?? agent.lastError ?? agent.task ?? agent.state;
          if (hasNotify(ui)) ui.notify(`${agent.name}: ${detail.slice(0, 120)}`, agent.state === "error" ? "error" : "warning");
        }
      }
      // An empty pack renders as NOTHING; this seat stays invisible until it spawns.
      const line = agents.length === 0 || !theme ? undefined : formatSeatStatus(theme, agents);
      if (hasSetStatus(ui)) ui.setStatus(STATUS_ID, line);
    };

    unsubscribe?.();
    unsubscribe = view.subscribe(onChange);
    onChange();
  });

  pi.on("session_shutdown", () => {
    unsubscribe?.();
    unsubscribe = undefined;
    const active = runtime;
    runtime = undefined;
    if (active) void active.dispose();
  });

  pi.registerCommand("orch-view", {
    description: "View and steer the orch agents this session spawned",
    handler: async (_args: string | undefined, ctx: HarnessContext) => {
      if (isDashboardContext(ctx)) await openPackDashboard(ctx, ensureRuntime().manager.view);
    },
  });
}

