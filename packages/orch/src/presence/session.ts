import { launchCredential } from "../identity/launch.ts";
import { agentIdBySessionToken } from "../store/agent-rows.ts";
import { envOrchDir } from "../services.ts";
import { ensurePresenceAgentDir } from "./writer.ts";
import type { PresenceRecord } from "../types/presence.ts";
import type { OrchDir } from "../types/core.ts";

export type PresenceSession =
  | { readonly kind: "not-orch" }
  | { readonly kind: "ok"; readonly key: string; readonly orchDir: OrchDir; readonly directory: string };

/** The hook shim's whole root: who am I, where is orch, where do I write. A driving
 *  session is identified by its harness session id, which orch recorded at registration.
 *  `not-orch` means no launch credential or registered driving session: nothing to record. */
export function presenceSession(sessionId: string | null = null): PresenceSession {
  // Task 6-02 moves this env read into src/services.ts.
  const root = envOrchDir();
  const key = launchCredential();
  const sessionKey = key === null && sessionId !== null ? agentIdBySessionToken(root, sessionId) : null;
  const resolvedKey = key ?? sessionKey;
  if (resolvedKey === null) return { kind: "not-orch" };
  const directory = ensurePresenceAgentDir(resolvedKey, root);
  if (directory === undefined) return { kind: "not-orch" };
  return { kind: "ok", key: resolvedKey, orchDir: root, directory };
}

/** Build the status fields shared by every harness hook shim. */
export function baseStatus(input: {
  cwd: string;
  project: string | null;
  lastText: string | null;
  updatedAt: string;
}): PresenceRecord {
  return {
    cwd: input.cwd,
    project: input.project,
    lastText: input.lastText,
    updatedAt: input.updatedAt,
  };
}
