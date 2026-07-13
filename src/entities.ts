import { loadPresence, type PresenceEntry } from "./store.ts";
import { herdrNames, herdrPanes, herdrTabs } from "./herdr.ts";

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
}

export function collapse(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function paneSessionPath(pane: any): string | null {
  const session = pane?.agent_session;
  return session && session.kind === "path" && typeof session.value === "string" ? session.value : null;
}

function naturalPaneOrder(id: string): [string, number] {
  const match = /^(.*?):p?(\d+)$/.exec(id);
  return match ? [match[1], parseInt(match[2], 10)] : [id, 0];
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
    let pres: PresenceEntry | null = presence.get(paneId) || null;
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
      name: names.get(paneId) || pane.name || null,
      tabLabel: tab ? tab.label : null,
      agent: pane.agent || null,
      focused: !!pane.focused,
      herdrStatus: pane.agent_status || null,
      presence: pres,
      sessionPath: paneSessionPath(pane) || pres?.status?.sessionPath || null,
      presenceOnly: false,
    });
  }

  for (const entry of presence.values()) {
    if (usedPresence.has(entry.key)) continue;
    entities.push({
      key: entry.key,
      paneId: entry.status?.paneId || null,
      name: (entry.status?.paneId && names.get(entry.status.paneId)) || null,
      tabLabel: null,
      agent: "pi",
      focused: false,
      herdrStatus: null,
      presence: entry,
      sessionPath: entry.status?.sessionPath || null,
      presenceOnly: true,
    });
  }
  return entities;
}

export function sortEntities(entities: Entity[]): Entity[] {
  const herdr = entities.filter((entity) => !entity.presenceOnly);
  const only = entities.filter((entity) => entity.presenceOnly);
  herdr.sort((left, right) => {
    const [leftWorkspace, leftNumber] = naturalPaneOrder(left.paneId || left.key);
    const [rightWorkspace, rightNumber] = naturalPaneOrder(right.paneId || right.key);
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

export function resolveTarget(target: string): Entity {
  const entities = buildEntities();
  const exact = dedupeEntities(entities.filter((entity) => entity.key === target || entity.paneId === target || entity.name === target));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) ambiguous(target, exact);

  const suffix = dedupeEntities(entities.filter((entity) => [entity.key, entity.paneId].filter(Boolean).some((id) => {
    const value = id as string;
    const short = value.slice(value.lastIndexOf(":") + 1);
    return value === target || value.endsWith(":" + target) || short.startsWith(target) || value.endsWith(target);
  })));
  if (suffix.length === 1) return suffix[0];
  if (suffix.length > 1) ambiguous(target, suffix);

  const byAgent = dedupeEntities(entities.filter((entity) => entity.agent === target));
  if (byAgent.length === 1) return byAgent[0];
  if (byAgent.length > 1) ambiguous(target, byAgent);
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

export function resolvePane(target: string): { ent: Entity; pane: string } {
  const ent = resolveTarget(target);
  if (!ent.paneId) die(`Target "${target}" has no herdr pane.`);
  return { ent, pane: ent.paneId };
}
