// One target, resolved by orchd for this caller. The CLI never opens the store to find an agent.
import { readRpc } from "./daemon.ts";
import { lifecycleBackend } from "../entities/lifecycle.ts";
import { callerCredential } from "../identity/credential.ts";
import { die } from "../refusal.ts";
import { refuseNonOperatorOverride, type CallerSelf } from "./self.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { LifecycleTarget } from "../types/command.ts";
import type { DaemonClient } from "../types/services.ts";

export type ResolvedTarget = ResultOf<"resolve-target">;
export type ResolvedLifecycle = ResultOf<"resolve-lifecycle">;

/** The lifecycle resolver, answered by orchd, with the Backend object attached. */
export async function resolveLifecycle(services: DaemonClient, target: string): Promise<LifecycleTarget & Pick<ResolvedLifecycle, "holder" | "callerOwns">> {
  const resolution = await readRpc(services, "resolve-lifecycle", { caller: callerCredential(), target });
  return { ...resolution, backend: lifecycleBackend(resolution, target) };
}

export interface ResolveOptions {
  readonly all?: boolean;
  readonly crossSpace?: boolean;
}

export function resolveEntity(services: DaemonClient, target: string, options: ResolveOptions = {}): Promise<ResolvedTarget> {
  return readRpc(services, "resolve-target", {
    caller: callerCredential(),
    target,
    ...(options.all === true ? { all: true } : {}),
    ...(options.crossSpace === true ? { crossSpace: true } : {}),
  });
}

/** Resolve, then refuse a target a live foreign holder owns unless the caller overrides. The override itself is operator-only. */
export async function resolveOwnedTarget(
  services: DaemonClient,
  self: CallerSelf,
  target: string,
  options: ResolveOptions & { readonly override?: boolean; readonly overrideFlag?: string } = {},
): Promise<ResolvedTarget> {
  const resolved = await resolveEntity(services, target, options);
  if (options.override === true) {
    refuseNonOperatorOverride(self, options.overrideFlag ?? "--force");
    return resolved;
  }
  if (resolved.holder !== null && !resolved.callerOwns) die(`Target "${target}" is owned by ${resolved.holder}. Use --force to override.`);
  return resolved;
}
