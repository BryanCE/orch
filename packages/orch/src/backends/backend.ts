import { BACKEND_IDS, type BackendHandle, type BackendId, type CaptureRole, type HomeSubject } from "../types/backend.ts";
import type { BackendSpawnOpts } from "../types/backend.ts";
import type { AgentAdapter } from "../types/adapter.ts";
import { createCaptureRole } from "../presence/roles.ts";
import type { OrchDir } from "../types/core.ts";

/** Render a native handle without falling back to Object.prototype.toString. */
export function describeHandle(handle: BackendHandle): string {
  return typeof handle === "string" ? handle : handle.toString();
}

/**
 * The label a home is opened with (E8). An orch that opens a home of its own
 * must leave it marked: an unlabelled workspace is named by the plexer's own
 * counter, so the fleet inside it reads as random agents with no discoverable
 * origin, sitting beside the human's own panes. The caller's label wins when it
 * has one — a space the human named is already discoverable by that name — and
 * otherwise the mark names the subject orch opened the home for.
 *
 * The subject id is narrowed to the grammar every plexer accepts for a display
 * name: it reaches here from callers that derive it from a path, and tmux
 * refuses `.` and `:` in a session name.
 */
export function homeLabel(subject: HomeSubject, requested?: string | null): string {
  if (requested) return requested;
  const id = subject.id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `orch-${subject.kind}-${id || subject.kind}`;
}

export function createInteractiveCommand(adapter: AgentAdapter, opts: BackendSpawnOpts): string {
  const command = opts.cmd ?? adapter.workerLaunch?.restrictedInteractiveCmd(opts) ?? adapter.interactiveCmd(opts);
  if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);
  return command;
}

export function createBackendCaptureRole(backend: string, orchDir: () => OrchDir | undefined): CaptureRole {
  return {
    read: (agentId, request) => {
      const directory = orchDir();
      if (directory === undefined) throw new Error(`${backend} capture requires an orch directory`);
      return createCaptureRole(directory).read(agentId, request);
    },
  };
}

export function isBackendId(value: unknown): value is BackendId {
  return typeof value === "string" && (BACKEND_IDS as readonly string[]).includes(value);
}

/** Herdr's backend-owned notification sink id — the one spelling core may import. */
export const HERDR_SINK_ID = "herdr";

