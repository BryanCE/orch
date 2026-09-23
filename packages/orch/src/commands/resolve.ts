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
export type HeldLifecycleTarget = LifecycleTarget & Pick<ResolvedLifecycle, "holder" | "callerOwns">;

/** The lifecycle resolver, answered by orchd, with the Backend object attached. */
export async function resolveLifecycle(services: DaemonClient, target: string): Promise<HeldLifecycleTarget> {
  const resolution = await readRpc(services, "resolve-lifecycle", { caller: callerCredential(), target });
  return { ...resolution, backend: lifecycleBackend(resolution, target) };
}

export interface ResolveOptions {
  readonly all?: boolean;
  readonly crossSpace?: boolean;
}

export function refuseForeignHolder(
  self: CallerSelf,
  target: string,
  resolved: Pick<ResolvedTarget, "holder" | "callerOwns">,
  override = false,
  overrideFlag = "--force",
): void {
  if (override) {
    refuseNonOperatorOverride(self, overrideFlag);
    return;
  }
  if (resolved.holder !== null && !resolved.callerOwns) die(`Target "${target}" is owned by ${resolved.holder}. Use --force to override.`);
}

export function resolveEntity(services: DaemonClient, target: string, options: ResolveOptions = {}): Promise<ResolvedTarget> {
  return readRpc(services, "resolve-target", {
    caller: callerCredential(),
    target,
    ...(options.all === true ? { all: true } : {}),
    ...(options.crossSpace === true ? { crossSpace: true } : {}),
  });
}

/** Resolve, then refuse a target a live foreign holder owns unless the caller overrides.
 *  An override or a space crossing is operator-only, refused before resolution so the message names the flag. */
export async function resolveOwnedTarget(
  services: DaemonClient,
  self: CallerSelf,
  target: string,
  options: ResolveOptions & { readonly override?: boolean; readonly overrideFlag?: string } = {},
): Promise<ResolvedTarget> {
  if (options.crossSpace === true) refuseNonOperatorOverride(self, "--cross-space");
  if (options.override === true) refuseNonOperatorOverride(self, options.overrideFlag ?? "--force");
  const resolved = await resolveEntity(services, target, options);
  if (options.override !== true) refuseForeignHolder(self, target, resolved);
  return resolved;
}
