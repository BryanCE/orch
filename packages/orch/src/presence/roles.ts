import { loadPresence } from "./store.ts";
import { orchDir } from "./writer.ts";
import type { CaptureRequest, CaptureRole, CapturedOutput } from "../types/backend.ts";

type RootSource = string | (() => string);

function resolveRoot(root: RootSource): string {
  return typeof root === "function" ? root() : root;
}

/** Read only orch-owned captured status/result files; no plexer screen is consulted. */
export function createCaptureRole(root: RootSource): CaptureRole {
  return {
    read(agentId: string, request: CaptureRequest): CapturedOutput {
      const entry = loadPresence(resolveRoot(root)).get(agentId);
      if (!entry) throw new Error(`cannot capture ${agentId}: no presence record`);
      const source = request.source ?? "all";
      return {
        status: source === "result" ? null : entry.status,
        result: source === "status" ? null : entry.result,
      };
    },
  };
}

/** Shared capture role for providers whose environment uses orch's local presence files. */
export const capture: CaptureRole = createCaptureRole(() => orchDir());

