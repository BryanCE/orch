import type { SpawnRegistration } from "../types/store.ts";
import type { Backend, BackendSpawnOpts } from "../types/backend.ts";
import type { HostedProcess } from "../types/process.ts";

/** What one launch started: its handle as recorded, and its process on this host. */
export interface LaunchedAgent {
  readonly handle: string;
  readonly process: HostedProcess;
}

/** The record of an agent no plexer places, launched on this host. `backend` is the
 *  environment that runs it. */
export function unplacedRegistration(backend: Backend, harnessId: string, key: string, opts: BackendSpawnOpts, launched: LaunchedAgent): SpawnRegistration {
  return {
    form: opts.form,
    key,
    harnessId,
    backendId: backend.id,
    // Placed nowhere, yet still addressable: the handle is a concrete address for the
    // process just started, and stating it here is what lets `list`/`close`/`handleFor`
    // reach an agent with no screen without a SECOND write behind the registration.
    placed: false,
    handle: launched.handle,
    cwd: opts.cwd ?? process.cwd(),
    name: opts.name ?? key,
    model: opts.model ?? "",
    thinking: opts.thinking,
    spawner: opts.spawner ?? null,
    origin: opts.origin,
    worktree: opts.worktree,
    process: launched.process,
    now: Date.now(),
  };
}
