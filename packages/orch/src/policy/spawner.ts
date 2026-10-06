import { LAUNCH_ENV } from "../identity/launch.ts";
import { ENVIRONMENT_ENV } from "../agent/environment.ts";
import { projectRoot } from "../util.ts";
import type { BackendSpawnOpts } from "../types/backend.ts";
import { workerRules } from "../worker-prompt.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { WorkerHeaderContext } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

type CallerSelf = ResultOf<"self">;

/** Every ORCH_* variable carried through a spawn; tests import this vocabulary
 * so isolation cannot drift from the launch boundary. */
export const ORCH_ENV_VARS = [
  LAUNCH_ENV, ENVIRONMENT_ENV, "ORCH_DIR", "ORCH_PROJECT", "ORCH_SPACE", "ORCH_HARNESS",
] as const;

/** Whether a child launched by this caller may itself spawn under the depth limit. */
export function maySpawnBelow(self: CallerSelf, maxDepth: number): boolean {
  return self.depth + 1 < maxDepth;
}

/** The header context for a worker this caller dispatches to. */
export function workerHeaderContextOf(self: CallerSelf, settings: OrchSettings, cwd: string | undefined): WorkerHeaderContext {
  return { maySpawn: maySpawnBelow(self, settings.fleet.max_depth), ...(cwd === undefined ? {} : { cwd }), spawnerRepliable: self.id !== null, ...workerRules(settings) };
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

