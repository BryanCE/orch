import { loadConfig } from "../config.ts";
import { liveAgents } from "../store/agent-rows.ts";
import { depthOf } from "../policy/provenance.ts";
import type { CheckResult } from "../types/doctor.ts";

/** Report live agents whose provenance depth exceeds the configured fleet limit. */
export function checkProvenanceDepth(orchDir: string): CheckResult {
  const maxDepth = loadConfig(orchDir).fleet.max_depth;
  const rows = new Map(liveAgents(orchDir).map((row) => [row.id, row]));
  const violations = [...rows.values()].flatMap((agent) => {
    const depth = depthOf((id) => rows.get(id), agent.id);
    return depth > maxDepth ? [{ agent, depth }] : [];
  });

  if (!violations.length) {
    return { id: "provenance-depth", label: "Provenance depth", status: "ok", detail: "no agents exceed fleet.max_depth" };
  }
  return {
    id: "provenance-depth",
    label: "Provenance depth",
    status: "warn",
    detail: violations
      .map(({ agent, depth }) => `${agent.name} (${agent.id}) is at depth ${depth}; fleet.max_depth (${maxDepth})`)
      .join("\n    "),
  };
}
