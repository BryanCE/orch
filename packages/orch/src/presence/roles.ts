import { presenceEntry } from "./store.ts";
import type { CaptureRequest, CaptureRole, CapturedOutput } from "../types/backend.ts";
import type { OrchDir } from "../types/core.ts";

/** Read only orch-owned captured status/result files; no plexer screen is consulted. */
export function createCaptureRole(root: OrchDir): CaptureRole {
  return {
    read(agentId: string, request: CaptureRequest): CapturedOutput {
      const entry = presenceEntry(root, agentId);
      if (!entry) throw new Error(`cannot capture ${agentId}: no presence record`);
      const source = request.source ?? "all";
      return {
        status: source === "result" ? null : entry.status,
        result: source === "status" ? null : entry.result,
      };
    },
  };
}

/** A backend's capture role, bound to the orch dir the backend learns after construction. */
export function createBackendCaptureRole(backend: string, orchDir: () => OrchDir | undefined): CaptureRole {
  return {
    read: (agentId, request) => {
      const directory = orchDir();
      if (directory === undefined) throw new Error(`${backend} capture requires an orch directory`);
      return createCaptureRole(directory).read(agentId, request);
    },
  };
}
