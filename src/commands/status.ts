import { loadConfigOrNull, type OrchConfig } from "../config.ts";
import { isBridgeExtensionStale } from "../doctor/extensions.ts";
import { getAdapter } from "../adapters/registry.ts";
import type { AgentAdapter, SessionView } from "../adapters/adapter.ts";
import { collapse, buildEntities, entityWorkspace, scopeEntitiesToWorkspace, sortEntities, type Entity } from "../entities.ts";
import { runRemoteAsync } from "../remote.ts";
import { orchDir, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/sqlite.ts";
import { renderTable } from "../table.ts";
import { workspaceName } from "../policy/workspace.ts";
import { ensureDaemon } from "./daemon.ts";
import {
  firstNonEmptyText,
  resultText,
  splitOptionFlags,
} from "./target.ts";
import { truncate } from "../util.ts";

const isTTY = process.stdout.isTTY;
const dim = (text: string) => (isTTY ? `\x1b[2m${text}\x1b[0m` : text);

export function formatWorkspace(id: string | null | undefined, name: string | null | undefined): string {
  if (!id) return "-";
  return name && name !== id ? `${name} (${id})` : name ?? id;
}

export function displayWorkspace(id: string | null | undefined, resolver: OrchConfig["workspaces"]): string {
  return formatWorkspace(id, workspaceName(id, resolver));
}

interface View {
  entity: Entity;
  paneLabel: string;
  name: string;
  tab: string;
  agent: string;
  model: string; // display, provider stripped
  modelFull: string;
  state: string;
  stateFallback: boolean; // true → append †
  staleExtension: boolean; // true → append (stale)
  cost: number;
  ctxPercent: number | null;
  task: string;
  last: string;
  exited: boolean;
  sview: SessionView | null;
}

/** Resolve the adapter recorded for one entity (spawn registry, then presence, then backend report). */
export function entityAdapter(ent: Entity, spawned = spawnedRecords()): AgentAdapter | undefined {
  return getAdapter(spawned.get(ent.key)?.adapter ?? ent.presence?.status?.agent ?? ent.agent ?? "");
}

/** Build the "provider/model:thinking" display string from presence, session, then adapter default. */
function deriveModelString(pres: PresenceEntry | null, sview: SessionView | null, adapter: AgentAdapter | undefined): string {
  if (pres?.status?.model && pres.status.model.id) {
    const m = pres.status.model;
    const think = pres.status.thinking ?? "";
    return `${m.provider ?? ""}/${m.id}${think ? ":" + think : ""}`;
  }
  if (sview?.model) {
    const prov = sview.provider ?? "";
    const think = sview.thinking ?? "";
    return `${prov}/${sview.model}${think ? ":" + think : ""}`;
  }
  const adapterDefault = adapter?.defaultModelString?.();
  return adapterDefault ? `${adapterDefault} (default)` : "-";
}

/** Pick the state label plus its fallback/exited flags: live bridge wins, else backend/session fallback. */
function deriveState(pres: PresenceEntry | null, ent: Entity, sview: SessionView | null): { state: string; stateFallback: boolean; exited: boolean } {
  if (!pres?.status) {
    // no live bridge → backend status or session fallback
    return { state: ent.backendStatus ?? sview?.state ?? (sview ? "idle" : "unknown"), stateFallback: true, exited: false };
  }
  // presence = live bridge → no fallback marker
  if (!pres.alive) return { state: "exited", stateFallback: false, exited: true };
  return { state: pres.status.asking ? "asking" : pres.status.state ?? "unknown", stateFallback: false, exited: false };
}

/** Pick the reported cost: presence first, then session view, else zero. */
function deriveCost(pres: PresenceEntry | null, sview: SessionView | null): number {
  if (pres?.status && typeof pres.status.cost === "number") return pres.status.cost;
  if (typeof sview?.cost === "number") return sview.cost;
  return 0;
}

/** Read the context-window percent from presence, or null when unreported. */
function deriveContextPercent(pres: PresenceEntry | null): number | null {
  if (pres?.status?.context && typeof pres.status.context.percent === "number") return pres.status.context.percent;
  return null;
}

export function deriveView(ent: Entity, spawned: Map<string, SpawnedRecord>): View {
  const pres = ent.presence;
  const adapter = entityAdapter(ent, spawned);
  const sview = (adapter?.caps.sessionTail && ent.sessionPath ? adapter.readSessionView?.({ sessionPath: ent.sessionPath }) : undefined) ?? null;

  const modelFull = deriveModelString(pres, sview, adapter);
  const model = modelFull.replace(/^openai-codex\//, "");
  const { state, stateFallback, exited } = deriveState(pres, ent, sview);

  const task = firstNonEmptyText(
    pres?.status?.asking?.question ? `Q: ${pres.status.asking.question}` : undefined,
    pres?.status?.task,
    sview?.task,
  );
  const last = firstNonEmptyText(
    pres?.status?.lastText,
    resultText(pres?.result),
    sview?.lastText,
  );

  const paneLabel = (ent.paneId ?? ent.key) + (ent.focused ? "*" : "");
  return {
    entity: ent,
    paneLabel,
    name: ent.name ?? "",
    tab: ent.tabLabel ?? "-",
    agent: pres?.status?.agent ?? (spawned.get(ent.key)?.adapter) ?? ent.agent ?? "-",
    model,
    modelFull,
    state,
    stateFallback,
    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash),
    cost: deriveCost(pres, sview),
    ctxPercent: deriveContextPercent(pres),
    task: collapse(task),
    last: collapse(last),
    exited,
    sview,
  };
}

function cmdStatusLocal(args: string[], workspaces: OrchConfig["workspaces"]) {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local"]);
  const json = enabled.has("--json");
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const spawned = spawnedRecords();
  const views = entities.map((entity) => deriveView(entity, spawned));

  // Hide exited presence entries with no matching live pane, unless --all
  const visible = views.filter((v) => {
    if (all) return true;
    if (v.exited && v.entity.presenceOnly) return false;
    // presence-only with dead pid
    if (v.entity.presenceOnly && v.entity.presence && !v.entity.presence.alive) return false;
    return true;
  });

  if (json) {
    // full merged objects, untruncated
    const out = visible.map((v) => statusRowFromView(v, workspaces));
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const headers = ["PANE", "NAME", "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"];
  const caps = [12, 14, 10, 6, 30, 12, 8, 5, 40, 50];
  const rows: string[][] = [];
  const rawExited: boolean[] = [];
  const showWorkspace = all && new Set(visible.map((v) => entityWorkspace(v.entity) ?? "-")).size > 1;
  for (const v of visible) {
    rows.push([
      v.paneLabel,
      showWorkspace ? `${displayWorkspace(entityWorkspace(v.entity), workspaces)} / ${v.name}` : v.name,
      v.tab,
      v.agent,
      v.model,
      v.state + (v.stateFallback ? "†" : "") + (v.staleExtension ? " (stale)" : ""),
      v.cost > 0 ? "$" + v.cost.toFixed(2) : "",
      v.ctxPercent != null ? `${Math.round(v.ctxPercent)}%` : "",
      truncate(v.task, 40),
      truncate(v.last, 50),
    ]);
    rawExited.push(v.exited);
  }
  if (rows.length === 0) {
    process.stdout.write("No panes found (backend down and no agent dirs).\n");
    return;
  }
  // render with dim for exited rows
  const table = renderTable(headers, rows, caps);
  const lines = table.split("\n");
  const out: string[] = [lines[0] ?? "", lines[1] ?? ""];
  for (let i = 0; i < rows.length; i++) {
    const line = lines[i + 2] ?? "";
    out.push(rawExited[i] ? dim(line) : line);
  }
  process.stdout.write(out.join("\n") + "\n");
}

interface StatusRow {
  key: string;
  paneId: string | null;
  name: string | null;
  tab: string | null;
  agent: string | null;
  focused: boolean;
  model: string;
  modelShort: string;
  state: string;
  stateFallback: boolean;
  staleExtension?: boolean;
  exited: boolean;
  cost: number;
  ctxPercent: number | null;
  task: string | null;
  lastText: string | null;
  backendStatus: string | null;
  sessionPath: string | null;
  presenceDir: string | null;
  presenceOnly: boolean;
  tokens: unknown;
  turns: unknown;
  workspace?: string | null;
  workspaceName?: string | null;
  host?: string;
  warning?: string;
}

/** Format the task cell: a pending question wins, else the presence/session task text, else null. */
function viewTask(v: View): string | null {
  const question = v.entity.presence?.status?.asking?.question;
  if (question) return `Q: ${question}`;
  return v.entity.presence?.status?.task ?? v.sview?.task ?? null;
}

/** Pick the last-message text: presence lastText, then result payload, then session tail. */
function viewLastText(v: View): string | null {
  return v.entity.presence?.status?.lastText ?? resultText(v.entity.presence?.result) ?? v.sview?.lastText ?? null;
}

/** The one status-row shape shared by the local json branch and the merged table rows. */
export function statusRowFromView(v: View, workspaces: OrchConfig["workspaces"]): StatusRow {
  return {
    key: v.entity.key,
    paneId: v.entity.paneId,
    name: v.entity.name,
    tab: v.entity.tabLabel,
    agent: v.entity.agent,
    focused: v.entity.focused,
    model: v.modelFull,
    modelShort: v.model,
    state: v.state,
    stateFallback: v.stateFallback,
    exited: v.exited,
    cost: v.cost,
    ctxPercent: v.ctxPercent,
    task: viewTask(v),
    lastText: viewLastText(v),
    backendStatus: v.entity.backendStatus,
    sessionPath: v.entity.sessionPath,
    presenceDir: v.entity.presence?.dir ?? null,
    presenceOnly: v.entity.presenceOnly,
    tokens: v.sview?.tokens ?? v.entity.presence?.status?.tokens ?? null,
    turns: v.entity.presence?.status?.turns ?? v.sview?.turns ?? null,
    workspace: entityWorkspace(v.entity),
    workspaceName: workspaceName(entityWorkspace(v.entity), workspaces),
    staleExtension: v.staleExtension,
  };
}

function localStatusRows(args: string[], workspaces: OrchConfig["workspaces"]): StatusRow[] {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local"]);
  const all = enabled.has("--all");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const spawned = spawnedRecords();
  const views = entities.map((entity) => deriveView(entity, spawned));
  return views.filter((v) => all || (!v.exited || !v.entity.presenceOnly) && !(v.entity.presenceOnly && v.entity.presence && !v.entity.presence.alive))
    .map((v) => ({ ...statusRowFromView(v, workspaces), host: "local" }));
}

export function warningStatusRow(host: string, warning: string): StatusRow {
  return {
    key: `warning:${host}`, paneId: null, name: "WARNING", tab: null, agent: null,
    focused: false, model: "", modelShort: "", state: "warning", stateFallback: false, staleExtension: false,
    exited: false, cost: 0, ctxPercent: null, task: warning, lastText: null,
    backendStatus: null, sessionPath: null, presenceDir: null, presenceOnly: false,
    tokens: null, turns: null, host, warning,
  };
}

export async function cmdStatus(args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--json", "--all", "--local", "--offline"]);
  const offline = enabled.has("--offline");
  if (!offline) await ensureDaemon(orchDir());
  const json = enabled.has("--json");
  const all = enabled.has("--all");
  const localOnly = enabled.has("--local");
  // status reads presence dirs, which exist independently of settings.json. An unconfigured
  // install simply has no remote hosts and no workspace labels, so it renders the local fleet
  // rather than refusing — status is exempt from the setup gate and must actually stay usable.
  const config = loadConfigOrNull(orchDir());
  const hosts = config?.hosts ?? {};
  const workspaces = config?.workspaces ?? {};
  if (localOnly || Object.keys(hosts).length === 0) {
    cmdStatusLocal(args, workspaces);
    return;
  }
  const local = localStatusRows(args, workspaces);
  const remoteResults = await Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
  const rows: StatusRow[] = [...local];
  for (const { name, result } of remoteResults) {
    if (!result.ok) {
      rows.push(warningStatusRow(name, result.failure.message));
      continue;
    }
    if (!Array.isArray(result.value)) {
      rows.push(warningStatusRow(name, `Host "${name}" returned an invalid status payload.`));
      continue;
    }
    for (const value of result.value) if (value && typeof value === "object") rows.push({ ...(value as StatusRow), host: name });
  }
  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(rows.map((row) => row.workspace ?? "-")).size > 1;
  const headers = ["HOST", "PANE", ...(showWorkspace ? ["WORKSPACE"] : []), "NAME", "TAB", "AGENT", "MODEL", "STATE", "COST", "CTX", "TASK", "LAST"];
  const tableRows = rows.map((row) => [
    row.host ?? "local", row.warning ? "-" : row.paneId ?? row.key,
    ...(showWorkspace ? [formatWorkspace(row.workspace, row.workspaceName)] : []),
    row.name ?? (row.warning ? "WARNING" : ""), row.tab ?? "-", row.agent ?? "-", row.modelShort || row.model || "-", row.state + (row.staleExtension ? " (stale)" : ""),
    row.cost > 0 ? "$" + row.cost.toFixed(2) : "", row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : "",
    truncate(row.task ?? "", 40), truncate(row.lastText ?? "", 50),
  ]);
  if (!tableRows.length) {
    process.stdout.write("No panes found (backend down and no agent dirs).\n");
    return;
  }
  process.stdout.write(renderTable(headers, tableRows,
    showWorkspace ? [10, 14, 20, 14, 10, 8, 30, 12, 8, 5, 40, 50] : [10, 14, 14, 10, 8, 30, 12, 8, 5, 40, 50]) + "\n");
}
