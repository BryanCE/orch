import { loadConfig, type HostConfig } from "./config.ts";
import { herdrNames, herdrPanes, herdrTabs, type HerdrPane } from "./herdr.ts";
import { loadPresence, orchDir, type PresenceEntry } from "./store.ts";
import { checkWall, scopeToWorkspace, workspaceOf } from "./policy/workspace.ts";
import { errorMessage } from "./util.ts";

export { workspaceOf } from "./policy/workspace.ts";

export interface Entity {
  key: string;
  paneId: string | null;
  name: string | null;
  tabLabel: string | null;
  agent: string | null;
  focused: boolean;
  herdrStatus: string | null;
  presence: PresenceEntry | null;
  sessionPath: string | null;
  presenceOnly: boolean;
  /** Set when this entity was addressed with a configured host prefix. */
  host?: string;
}

export interface TargetRef {
  host: string | null;
  target: string;
}

/** Split `<host>/<target>` without changing the meaning of targets without `/`. */
export function parseTarget(target: string, hosts?: Record<string, HostConfig>): TargetRef {
  const slash = target.indexOf("/");
  if (slash < 0) return { host: null, target };
  const host = target.slice(0, slash);
  const remainder = target.slice(slash + 1);
  const configured = hosts ?? loadConfig(orchDir()).hosts;
  if (!host || !remainder) throw new Error(`Invalid target "${target}". Expected <host>/<target>.`);
  if (!Object.prototype.hasOwnProperty.call(configured, host)) {
    const names = Object.keys(configured).sort();
    throw new Error(`Unknown host "${host}". Configured hosts: ${names.length ? names.join(", ") : "none"}`);
  }
  return { host, target: remainder };
}

export function formatTarget(ref: TargetRef): string {
  return ref.host ? `${ref.host}/${ref.target}` : ref.target;
}

export function collapse(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function paneSessionPath(pane: Pick<HerdrPane, "agent_session">): string | null {
  const session = pane.agent_session;
  return session?.kind === "path" && typeof session.value === "string" ? session.value : null;
}

function naturalPaneOrder(id: string): [string, number] {
  const match = /^(.*?):p?(\d+)$/.exec(id);
  return match ? [match[1]!, parseInt(match[2]!, 10)] : [id, 0];
}

export function entityWorkspace(e: Entity): string | null {
  return workspaceOf(e.paneId ?? e.key);
}

export function currentWorkspace(): string | null {
  const paneId = process.env.HERDR_PANE_ID;
  if (!paneId) return null;
  return herdrPanes().find((pane) => pane.pane_id === paneId)?.workspace_id ?? null;
}

export function scopeEntitiesToWorkspace(entities: Entity[], opts?: { all?: boolean }): Entity[] {
  return scopeToWorkspace(entities, (entity) => entity.paneId ?? entity.key, currentWorkspace(), { all: opts?.all === true });
}

export function buildEntities(): Entity[] {
  const panes = herdrPanes();
  const tabs = herdrTabs();
  const names = herdrNames();
  const presence = loadPresence();
  const usedPresence = new Set<string>();
  const entities: Entity[] = [];

  for (const pane of panes) {
    const paneId: string = pane.pane_id;
    let pres: PresenceEntry | null = presence.get(paneId) ?? null;
    if (!pres) {
      for (const entry of presence.values()) {
        if (entry.status?.paneId === paneId) {
          pres = entry;
          break;
        }
      }
    }
    if (pres) usedPresence.add(pres.key);
    const tab = pane.tab_id ? tabs.get(pane.tab_id) : null;
    entities.push({
      key: paneId,
      paneId,
      name: names.get(paneId) ?? pane.name ?? null,
      tabLabel: tab?.label ?? null,
      agent: pane.agent ?? null,
      focused: !!pane.focused,
      herdrStatus: pane.agent_status ?? null,
      presence: pres,
      sessionPath: paneSessionPath(pane) ?? pres?.status?.sessionPath ?? null,
      presenceOnly: false,
    });
  }

  for (const entry of presence.values()) {
    if (usedPresence.has(entry.key)) continue;
    entities.push({
      key: entry.key,
      paneId: entry.status?.paneId ?? null,
      name: (entry.status?.paneId && names.get(entry.status.paneId)) ?? null,
      tabLabel: null,
      agent: "pi",
      focused: false,
      herdrStatus: null,
      presence: entry,
      sessionPath: entry.status?.sessionPath ?? null,
      presenceOnly: true,
    });
  }
  return entities;
}

export function sortEntities(entities: Entity[]): Entity[] {
  const herdr = entities.filter((entity) => !entity.presenceOnly);
  const only = entities.filter((entity) => entity.presenceOnly);
  herdr.sort((left, right) => {
    const [leftWorkspace, leftNumber] = naturalPaneOrder(left.paneId ?? left.key);
    const [rightWorkspace, rightNumber] = naturalPaneOrder(right.paneId ?? right.key);
    return leftWorkspace === rightWorkspace ? leftNumber - rightNumber : leftWorkspace < rightWorkspace ? -1 : 1;
  });
  only.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  return [...herdr, ...only];
}

function die(message: string): never {
  process.stderr.write(message + "\n");
  process.exit(1);
}

function dedupeEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => !seen.has(entity.key) && !!seen.add(entity.key));
}

function ambiguous(target: string, entities: Entity[]): never {
  process.stderr.write(`Ambiguous target "${target}". Candidates:\n`);
  for (const entity of entities) process.stderr.write(`  ${entity.key}${entity.tabLabel ? `  (${entity.tabLabel})` : ""}${entity.agent ? `  ${entity.agent}` : ""}\n`);
  process.exit(1);
}

function matchInPool(entities: Entity[], localTarget: string, target: string, host?: string | null): Entity | null {
  const withHost = (entity: Entity): Entity => (host ? { ...entity, host } : entity);

  const exact = dedupeEntities(entities.filter((entity) => entity.key === localTarget || entity.paneId === localTarget || entity.name === localTarget));
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

// Every control/read target resolves within the caller's own workspace by
// default — crossing the wall is never an accident of typing a foreign key.
// A host-prefixed (<host>/<target>) or --all target opts out; headless runs
// (no current workspace) are unscoped.
export function resolveTarget(target: string, opts?: { all?: boolean }): Entity {
  let ref: TargetRef;
  try {
    ref = parseTarget(target);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const localTarget = ref.target;
  const everything = buildEntities();
  const crossWall = opts?.all === true || ref.host !== null;
  const pool = scopeEntitiesToWorkspace(everything, { all: crossWall });

  const match = matchInPool(pool, localTarget, target, ref.host);
  if (match) return match;

  if (!crossWall) {
    const foreign = matchInPool(everything, localTarget, target);
    if (foreign) {
      const ownKey = currentWorkspace() === null ? null : `${currentWorkspace()}:p0`;
      const decision = checkWall(ownKey, foreign.paneId ?? foreign.key, { crossWorkspace: false });
      if (!decision.allowed) die(decision.reason ?? `Target "${target}" is outside the current workspace.`);
    }
  }
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

export function resolvePane(target: string, opts?: { all?: boolean }): { ent: Entity; pane: string } {
  const ent = resolveTarget(target, opts);
  if (!ent.paneId) die(`Target "${target}" has no herdr pane.`);
  return { ent, pane: ent.paneId };
}
