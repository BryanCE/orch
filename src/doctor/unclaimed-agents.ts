import { loadConfigOrNull } from "../config.ts";
import { liveAgents } from "../store/agent-rows.ts";
import type { CheckResult } from "../types/doctor.ts";

/** Report live agents that have remained unclaimed past the configured threshold. */
export function checkUnclaimedAgents(orchDir: string, now = Date.now()): CheckResult {
  const threshold = loadConfigOrNull(orchDir)?.doctor.unclaimed_after_ms;
  if (threshold === undefined) {
    return { id: "unclaimed-agents", label: "Unclaimed agents", status: "skip", detail: "no settings.json; doctor.unclaimed_after_ms is not configured" };
  }
  const violations = liveAgents(orchDir).filter((agent) =>
    agent.claimedAt === null && now - agent.createdAt > threshold);

  if (!violations.length) {
    return {
      id: "unclaimed-agents",
      label: "Unclaimed agents",
      status: "ok",
      detail: "no live agents remain unclaimed past doctor.unclaimed_after_ms",
    };
  }
  return {
    id: "unclaimed-agents",
    label: "Unclaimed agents",
    status: "warn",
    detail: violations
      .map((agent) => `${agent.name} (${agent.id}) spawned ${Math.floor((now - agent.createdAt) / 60_000)} min ago, never claimed`)
      .join("\n    "),
  };
}
