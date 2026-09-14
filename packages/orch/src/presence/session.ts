import { launchCredential } from "../identity/launch.ts";
import { agentIdBySessionToken } from "../store/agent-rows.ts";
import { envOrchDir } from "../services.ts";
import type { OrchDir } from "../types/core.ts";

export type PresenceSession =
  | { readonly kind: "not-orch" }
  | { readonly kind: "ok"; readonly key: string; readonly orchDir: OrchDir; readonly timeoutMs: number };

/** Resolve the hook shim's identity and orch transport root. A driving session is
 *  identified by its harness session id, which orch recorded at registration.
 *  `not-orch` means no launch credential or registered driving session: nothing to report. */
export function presenceSession(sessionId: string | null = null): PresenceSession {
  // Task 6-02 moves this env read into src/services.ts.
  const root = envOrchDir();
  const key = launchCredential();
  const sessionKey = key === null && sessionId !== null ? agentIdBySessionToken(root, sessionId) : null;
  const resolvedKey = key ?? sessionKey;
  if (resolvedKey === null) return { kind: "not-orch" };
  const timeoutMs = Number(process.env.ORCH_REPORT_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return { kind: "not-orch" };
  return { kind: "ok", key: resolvedKey, orchDir: root, timeoutMs };
}
