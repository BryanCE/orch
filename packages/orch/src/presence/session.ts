import { launchCredential } from "../identity/launch.ts";
import { envOrchDir } from "../services.ts";
import { ensurePresenceAgentDir } from "./writer.ts";
import type { PresenceRecord } from "../types/presence.ts";
import type { OrchDir } from "../types/core.ts";

export type PresenceSession =
  | { readonly kind: "not-orch" }
  | { readonly kind: "ok"; readonly key: string; readonly orchDir: OrchDir; readonly directory: string };

/** The hook shim's whole root: who am I, where is orch, where do I write. `not-orch`
 *  means a plain harness session with no orch launch credential: nothing to record. */
export function presenceSession(): PresenceSession {
  // Task 6-02 moves this env read into src/services.ts.
  const root = envOrchDir();
  const key = launchCredential(root);
  if (key === null) return { kind: "not-orch" };
  const directory = ensurePresenceAgentDir(key, root);
  if (directory === undefined) return { kind: "not-orch" };
  return { kind: "ok", key, orchDir: root, directory };
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
