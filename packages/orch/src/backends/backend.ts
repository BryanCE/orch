import { BACKEND_IDS, type Backend, type BackendId, type HomeSubject } from "../types/backend.ts";

/**
 * Whether orch can drive this environment from where it stands.
 *
 * Standing inside a session of it is one way in. A control server that answers
 * is the other, and it is the one that matters for an orch the plexer never
 * launched: a running herdr is a herdr orch can open a workspace in, whether or
 * not this process sits in one of its panes. Both facts are read off declared
 * roles (Rule 9), so an environment that gains a server gains this with no edit
 * here — and one that declares neither is simply not reachable, which is an
 * answer.
 */
export function backendReachable(backend: Backend): boolean {
  return backend.isInsideSession() || (backend.serverInfo?.running() ?? null) !== null;
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

export function isBackendId(value: unknown): value is BackendId {
  return typeof value === "string" && (BACKEND_IDS as readonly string[]).includes(value);
}

/** Herdr's backend-owned notification sink id — the one spelling core may import. */
export const HERDR_SINK_ID = "herdr";

