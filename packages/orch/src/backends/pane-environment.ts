import { environmentOf } from "../store/agent-view.ts";
import type { BackendId } from "../types/backend.ts";
import type { OrchDir } from "../types/core.ts";
import { isAgentId } from "./identity.ts";

export function resolvePaneHandle(id: string | null, orchDir: OrchDir, backendId: BackendId): string | null {
  if (!isAgentId(id)) return null;
  try {
    const environment = environmentOf(orchDir, id);
    return environment.plexer === backendId ? environment.handle : null;
  } catch {
    return null;
  }
}

export function hasPaneHandle(id: string | null, orchDir: OrchDir, backendId: BackendId): boolean {
  return resolvePaneHandle(id, orchDir, backendId) !== null;
}
