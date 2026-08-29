import { callerSession, selfIdentity } from "../identity/self.ts";
import { orchDir } from "../presence/store.ts";
import { agentById } from "../store/agent-rows.ts";
import type { SpawnerIdentity } from "../types/policy.ts";

/**
 * The launching session's identity: the id orch issued it, plus a label to show.
 *
 * There is ONE source (TASKS/08): orch mints in `hello` and this reads the record.
 * The four-branch env ladder that used to live here asked the plexer, then two
 * harness env vars, then fell back to the literal id `"operator"` — four answers
 * that could not agree, so a spawner's address never matched its own lease.
 */
export function spawnerIdentity(): SpawnerIdentity {
  const id = selfIdentity()?.id ?? null;
  const session = callerSession();
  const name = id === null ? null : agentById(orchDir(), id)?.name ?? null;
  const label = name
    ?? (session ? `${session.harnessId} session` : "operator");
  return { key: id, label };
}

/**
 * Identity env for one spawned agent: its own display name plus who launched
 * it. Every backend forwards this verbatim; every bridge stamps it into
 * status.json, which is what lets peer tools show names instead of keys and
 * lets a worker reply to the exact session that spawned it.
 */
export function agentIdentityEnv(name: string, spawner: SpawnerIdentity): Record<string, string> {
  const env: Record<string, string> = { ORCH_AGENT_NAME: name, ORCH_SPAWNER_LABEL: spawner.label };
  // ORCH_SPAWNER is a REPLY ADDRESS, and `ownerToken` is not one — it is the
  // write-governance actor proving who may steer this agent. Falling back to it
  // stamped workers with an address that names no presence dir; the worker obeyed
  // the header, called orch_send, and got refused. No inbox, no address.
  if (spawner.key) env.ORCH_SPAWNER = spawner.key;
  return env;
}

/** Env telling an agent it runs in its own git worktree, so its bridge can say
 *  so in status; empty for an agent sharing the fleet's working tree. */
export function worktreeEnv(path: string | undefined, branch: string | undefined): Record<string, string> {
  if (!path) return {};
  return { ORCH_AGENT_WORKTREE: path, ...(branch ? { ORCH_AGENT_BRANCH: branch } : {}) };
}
