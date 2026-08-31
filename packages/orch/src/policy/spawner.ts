import { LAUNCH_ENV } from "../identity/launch.ts";
import { callerSession, selfIdentity } from "../identity/self.ts";
import { orchDir } from "../presence/store.ts";
import { agentById } from "../store/agent-rows.ts";
import { projectRoot } from "../util.ts";
import type { BackendSpawnOpts } from "../types/backend.ts";
import type { SpawnerIdentity } from "../types/policy.ts";

/** Every ORCH_* variable carried through a spawn; tests import this vocabulary
 * so isolation cannot drift from the launch boundary. */
export const ORCH_ENV_VARS = [
  LAUNCH_ENV, "ORCH_DIR", "ORCH_PROJECT", "ORCH_AGENT_NAME",
  "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL", "ORCH_AGENT_WORKTREE", "ORCH_AGENT_BRANCH",
  "ORCH_OWNER", "ORCH_SESSION_KEY", "ORCH_SPACE", "ORCH_HARNESS",
] as const;

/**
 * The launching session's identity: the id orch issued it, plus a label to show.
 *
 * There is ONE source: orch mints in `register-session` and this reads the record.
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

/**
 * The environment EVERY plexer launches an agent into.
 *
 * One builder, because three had already drifted: herdr set `ORCH_PROJECT`,
 * headless set it, and tmux set none — so a tmux worker in a worktree resolved
 * `projectRoot()` to its own cwd and `peers.ts` filtered it out of the fleet
 * that spawned it. Project scope is not a
 * per-plexer nicety; it is how a worker knows which fleet it belongs to.
 *
 * Only what the CALLER passed, plus the project: reading `process.env` for
 * `ORCH_DIR` here would make the launched environment depend on this process's
 * own ambient state. `extra` is for genuinely handle-specific vars (headless's
 * log path), and `opts.env` wins over everything — it is the caller's explicit
 * word.
 *
 * An empty value is an ABSENT one. Exporting `ORCH_DIR=` sets the variable to
 * the empty string, which every reader sees as configured, and that is worse
 * than leaving it unset.
 */
export function agentLaunchEnv(
  opts: Pick<BackendSpawnOpts, "key" | "orchDir" | "env">,
  extra: Readonly<Record<string, string | undefined>> = {},
): Record<string, string> {
  const values: Partial<Record<(typeof ORCH_ENV_VARS)[number], string | undefined>> = {
    [LAUNCH_ENV]: opts.key,
    ORCH_DIR: opts.orchDir,
    ORCH_PROJECT: projectRoot(),
  };
  const candidates: Record<string, string | undefined> = Object.fromEntries(
    ORCH_ENV_VARS.map((name) => [name, values[name]]),
  );
  Object.assign(candidates, extra, opts.env ?? {});
  return Object.fromEntries(
    Object.entries(candidates).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}
