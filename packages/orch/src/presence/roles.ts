import { loadPresence } from "./store.ts";
import type { CaptureRequest, CaptureRole, CapturedOutput } from "../types/backend.ts";
import type { OrchDir } from "../types/core.ts";

/** Read only orch-owned captured status/result files; no plexer screen is consulted. */
export function createCaptureRole(root: OrchDir): CaptureRole {
  return {
    read(agentId: string, request: CaptureRequest): CapturedOutput {
      const entry = loadPresence(root).get(agentId);
      if (!entry) throw new Error(`cannot capture ${agentId}: no presence record`);
      const source = request.source ?? "all";
      return {
        status: source === "result" ? null : entry.status,
        result: source === "status" ? null : entry.result,
      };
    },
  };
}



