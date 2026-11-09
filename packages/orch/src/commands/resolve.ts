// One target, resolved by orchd for this caller. The CLI never opens the store to find an agent.
import { readRpc } from "./daemon.ts";
import { callerCredential } from "../identity/credential.ts";
import { die } from "../refusal.ts";
import { refuseNonOperatorOverride, type CallerSelf } from "./self.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { DaemonClient } from "../types/services.ts";
import { describeHandle } from "../shared/plexer.ts";

export type ResolvedTarget = ResultOf<"resolve-target">;
export type ResolvedLifecycle = ResultOf<"resolve-lifecycle">;

export function displayName(name: string | null | undefined, key: string): string {
  return name ?? key;
}

/** A resolved target's name: its agent row's, else the entity's, else its key. */
export function targetName(resolved: { readonly view?: { readonly name: string | null } | null; readonly entity: { readonly name?: string | null; readonly key: string } }): string {
  return displayName(resolved.view?.name ?? resolved.entity.name, resolved.entity.key);
}

/** The lifecycle resolver, answered by orchd: the agent, who holds it, and where it runs. It
 *  hands out no backend. A verb that acts on the agent asks orchd, which acts where it runs. */
export function resolveLifecycle(services: DaemonClient, target: string): Promise<ResolvedLifecycle> {
  return readRpc(services, "resolve-lifecycle", { caller: callerCredential(), target });
}

/** How a resolved agent is addressed in output: its pane handle here, else its key. */
export function placeLabel(resolved: Pick<ResolvedLifecycle, "place" | "key">): string {
  return resolved.place.kind === "here" ? describeHandle(resolved.place.handle) : resolved.key;
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
): void {
  if (override) {
    refuseNonOperatorOverride(self, "--steal");
    return;
  }
  if (resolved.holder !== null && !resolved.callerOwns) die(`Target "${target}" is owned by ${resolved.holder}. Use --steal to override.`);
}

export function resolveEntity(services: DaemonClient, target: string, options: ResolveOptions = {}): Promise<ResolvedTarget> {
  return readRpc(services, "resolve-target", {
    caller: callerCredential(),
    target,
    ...(options.all === true ? { all: true } : {}),
    ...(options.crossSpace === true ? { crossSpace: true } : {}),
  });
}

/** Resolve, then refuse a target a live foreign holder owns unless the caller passed --steal.
 *  A steal or a space crossing is operator-only, refused before resolution so the message names the flag. */
export async function resolveOwnedTarget(
  services: DaemonClient,
  self: CallerSelf,
  target: string,
  options: ResolveOptions & { readonly override?: boolean } = {},
): Promise<ResolvedTarget> {
  if (options.crossSpace === true) refuseNonOperatorOverride(self, "--space");
  if (options.override === true) refuseNonOperatorOverride(self, "--steal");
  const resolved = await resolveEntity(services, target, options);
  if (options.override !== true) refuseForeignHolder(self, target, resolved);
  return resolved;
}
