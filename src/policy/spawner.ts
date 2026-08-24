import { serializeIdentity, tryParseIdentity } from "../backends/identity.ts";
import { allAdapters } from "../adapters/registry.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import { optionalString } from "../util.ts";

/**
 * Who launched a spawn, as every spawned agent should know it. Identity is
 * orch's own layer: it survives whichever harness or plexer either side runs
 * in, and both directions stay addressable — the spawner knows the worker by
 * name, and the worker knows exactly which session is orchestrating it.
 */
export interface SpawnerIdentity {
  /** Reply address when the spawner has a presence inbox; null when it has none. */
  key: string | null;
  /** Human description: "lead-1 (pi)", "pi session", "claude session", "operator". */
  label: string;
}

/** The caller is itself an orch-spawned agent: full identity by its own key. */
function spawnedCallerIdentity(): SpawnerIdentity | null {
  const identity = tryParseIdentity(process.env.ORCH_AGENT_KEY);
  if (!identity) return null;
  const key = serializeIdentity(identity);
  const status = loadPresence().get(key)?.status;
  const name = optionalString(status?.label) ?? spawnedRecords().get(key)?.name;
  const harness = optionalString(status?.agent) ?? spawnedRecords().get(key)?.adapter;
  return { key, label: name ? `${name}${harness ? ` (${harness})` : ""}` : key };
}

/** The caller is a human's harness session whose bridge exported its presence key. */
function harnessSessionIdentity(): SpawnerIdentity | null {
  const key = optionalString(process.env.ORCH_SESSION_KEY);
  if (!key) return null;
  const harness = optionalString(loadPresence().get(key)?.status?.agent);
  return { key, label: harness ? `${harness} session` : "session" };
}

/** The caller is a harness session with no presence, named by its env marker.
 *  A harness exporting a per-session id yields a key that tells two parallel
 *  sessions of the same harness apart; one that does not stays kind-only. */
function markedSessionIdentity(): SpawnerIdentity | null {
  const marked = allAdapters().find((adapter) =>
    adapter.sessionEnvMarker !== undefined && optionalString(process.env[adapter.sessionEnvMarker]) !== undefined);
  if (!marked) return null;
  const sessionId = marked.sessionIdEnv ? optionalString(process.env[marked.sessionIdEnv]) : undefined;
  return {
    key: sessionId ? `${marked.id}-session-${sessionId}` : null,
    label: `${marked.id} session`,
  };
}

/** The launching session's identity: an orch agent, a harness session with a
 *  presence inbox, a marked harness session without one, or a bare operator. */
export function spawnerIdentity(): SpawnerIdentity {
  return spawnedCallerIdentity() ?? harnessSessionIdentity() ?? markedSessionIdentity() ?? { key: null, label: "operator" };
}

/**
 * Identity env for one spawned agent: its own display name plus who launched
 * it. Every backend forwards this verbatim; every bridge stamps it into
 * status.json, which is what lets peer tools show names instead of keys and
 * lets a worker reply to the exact session that spawned it.
 */
export function agentIdentityEnv(name: string, spawner: SpawnerIdentity, ownerToken: string | undefined): Record<string, string> {
  const env: Record<string, string> = { ORCH_AGENT_NAME: name, ORCH_SPAWNER_LABEL: spawner.label };
  const address = spawner.key ?? ownerToken;
  if (address) env.ORCH_SPAWNER = address;
  return env;
}

/** Env telling an agent it runs in its own git worktree, so its bridge can say
 *  so in status; empty for an agent sharing the fleet's working tree. */
export function worktreeEnv(path: string | undefined, branch: string | undefined): Record<string, string> {
  if (!path) return {};
  return { ORCH_AGENT_WORKTREE: path, ...(branch ? { ORCH_AGENT_BRANCH: branch } : {}) };
}
