import type { CallerCredential, OrchDir, Entity } from "../types/core.ts";
import { checkWall } from "../policy/space.ts";
import { selfIdentityOf } from "../identity/self.ts";
import { callerKindOf } from "../policy/caller.ts";
import { callerCredential } from "../identity/credential.ts";
import { holdsLease } from "../store/lease-rows.ts";
import { ambiguousTargetRefusal, die } from "../refusal.ts";
import { errorMessage } from "../util.ts";
import type { OrchSettings } from "../types/settings.ts";
import { parseTarget, type TargetRef } from "./target.ts";
import { buildEntities } from "./inventory.ts";
import { scopeEntitiesToSpaceFor } from "./space.ts";

function dedupeEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => !seen.has(entity.key) && !!seen.add(entity.key));
}

function ambiguous(target: string, entities: Entity[]): never {
  // U3: one wording, built in one place (src/refusal.ts). This site is the one
  // an ambiguous `orch dispatch` hits, and it used to print a bare list.
  throw ambiguousTargetRefusal(target, entities.map((entity) => ({
    key: entity.key,
    detail: [entity.tabLabel, entity.agent].filter(Boolean).join(" ") || null,
  })));
}

/** An agent orch has not recorded an ending for and whose process has not gone. */
function stillRunning(entity: Entity): boolean {
  return !entity.ended && entity.presence?.alive !== false;
}

/** A session or spawned agent may resolve only an agent it currently holds.
 *  Ownership is the open lease, never the immutable spawner or a display label. */
export function callerMayResolveFor(root: OrchDir, credential: CallerCredential, entity: Pick<Entity, "key">): boolean {
  if (callerKindOf(root, credential) === "operator") return true;
  const caller = selfIdentityOf(root, credential)?.id;
  if (caller === undefined) return false;
  try {
    return holdsLease(root, entity.key, caller);
  } catch {
    return false;
  }
}

export function callerMayResolve(root: OrchDir, entity: Pick<Entity, "key">): boolean {
  return callerMayResolveFor(root, callerCredential(), entity);
}

export function refuseForeignTarget(target: string): never {
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

/**
 * The agents answering to the NAME `localTarget`: the running ones alone when any
 * is running, else the ones that have stopped.
 *
 * A name is a slot the next holder of the slice takes over. A dead fleet keeping
 * its names made every dispatch to the panes that replaced it an ambiguity
 * refusal; falling back keeps `orch result <name>` answering for a closed agent
 * nothing has replaced.
 */
function nameHolders(entities: Entity[], localTarget: string): Entity[] {
  const named = entities.filter((entity) => entity.name === localTarget);
  const running = named.filter(stillRunning);
  return running.length > 0 ? running : named;
}

function matchInPool(entities: Entity[], localTarget: string, target: string, host?: string | null): Entity | null {
  const withHost = (entity: Entity): Entity => (host ? { ...entity, host } : entity);

  const addressed = entities.filter((entity) => entity.key === localTarget || entity.paneId === localTarget);
  const exact = dedupeEntities([...addressed, ...nameHolders(entities, localTarget)]);
  if (exact.length === 1) return withHost(exact[0]!);
  if (exact.length > 1) ambiguous(target, exact);

  const suffix = dedupeEntities(entities.filter((entity) => [entity.key, entity.paneId].filter(Boolean).some((id) => {
    const value = id!;
    const short = value.slice(value.lastIndexOf(":") + 1);
    return value === localTarget || value.endsWith(":" + localTarget) || short.startsWith(localTarget) || value.endsWith(localTarget);
  })));
  if (suffix.length === 1) return withHost(suffix[0]!);
  if (suffix.length > 1) ambiguous(target, suffix);

  const byAgent = dedupeEntities(entities.filter((entity) => entity.agent === localTarget));
  if (byAgent.length === 1) return withHost(byAgent[0]!);
  if (byAgent.length > 1) ambiguous(target, byAgent);
  return null;
}

// Every control/read target resolves within the caller's own space by
// default — crossing the wall is never an accident of typing a foreign key.
// A host-prefixed (<host>/<target>) or --all target opts out; headless runs
// (no current space) are unscoped.
export function resolveTargetFor(
  root: OrchDir,
  settings: OrchSettings,
  credential: CallerCredential,
  target: string,
  opts?: { all?: boolean; crossSpace?: boolean },
): Entity {
  let ref: TargetRef;
  try {
    ref = parseTarget(target, settings.hosts);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const localTarget = ref.target;
  const everything = buildEntities(root, settings);
  const crossSpace = opts?.crossSpace === true;
  const crossWall = opts?.all === true || crossSpace || ref.host !== null;
  const pool = scopeEntitiesToSpaceFor(root, credential, everything, { all: crossWall });

  const match = matchInPool(pool, localTarget, target, ref.host);
  if (match) {
    if (callerMayResolveFor(root, credential, match)) return match;
    refuseForeignTarget(target);
  }

  if (!crossWall) {
    if (callerKindOf(root, credential) !== "operator") refuseForeignTarget(target);
    const foreign = matchInPool(everything, localTarget, target);
    if (foreign) {
      // The wall decision lives in policy/space.ts alone; this only relays it.
      const decision = checkWall(root, selfIdentityOf(root, credential)?.id ?? null, foreign.key, { crossSpace: false });
      if (!decision.allowed) die(decision.reason ?? "space-wall denied the write");
    }
  }
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

export function resolveTarget(root: OrchDir, settings: OrchSettings, target: string, opts?: { all?: boolean; crossSpace?: boolean }): Entity {
  return resolveTargetFor(root, settings, callerCredential(), target, opts);
}

export function resolvePane(root: OrchDir, settings: OrchSettings, target: string, opts?: { all?: boolean; crossSpace?: boolean }): { ent: Entity; pane: string } {
  const ent = resolveTarget(root, settings, target, opts);
  if (!ent.paneId) die(`Target "${target}" has no pane.`);
  return { ent, pane: ent.paneId };
}
