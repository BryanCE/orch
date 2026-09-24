import { hasPaneHandle, resolvePaneHandle } from "./pane-environment.ts";
import type { OrchDir } from "../types/core.ts";
import type { PaneStatusSnapshot } from "../types/plexer.ts";
import type { BackendId } from "../types/backend.ts";

export interface PaneHudProvider {
  paneHandle: (id: string | null, orchDir: OrchDir) => string | null;
  hudActive: (id: string | null, orchDir: OrchDir) => boolean;
  createPaneStatusReporter: (id: string | null, paneId: string | null, orchDir: OrchDir) => (snapshot: PaneStatusSnapshot) => void;
}

export function resolveHudPane(id: string | null, orchDir: OrchDir, plexer: BackendId): string | null {
  return resolvePaneHandle(id, orchDir, plexer);
}

export function isHudPaneActive(id: string | null, orchDir: OrchDir, plexer: BackendId): boolean {
  return hasPaneHandle(id, orchDir, plexer);
}
