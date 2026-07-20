import { buildEntities, entityWorkspace, scopeEntitiesToWorkspace, sortEntities, resolveTarget } from "../entities.ts";
import { loadConfig } from "../config.ts";
import { orchDir } from "../presence/store.ts";
import type { Backend, BackendGroup } from "../backends/backend.ts";
import { parseIdentity } from "../backends/identity.ts";
import { resolveBackend } from "../backends/registry.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { splitOptionFlags, die, backendTarget } from "./target.ts";
import { displayWorkspace } from "./status.ts";
import { workspaceName } from "../policy/workspace.ts";
export function cmdPanes(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const entities = scopeEntitiesToWorkspace(sortEntities(buildEntities()), { all });
  const workspaces = loadConfig(orchDir()).workspaces;
  if (json) {
    process.stdout.write(JSON.stringify(entities.map((e) => ({ key: e.key, paneId: e.paneId, name: e.name,
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.backendStatus ?? e.presence?.status?.state ?? null,
      backendStatus: e.backendStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
      workspace: entityWorkspace(e), workspaceName: workspaceName(entityWorkspace(e), workspaces) })), null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(entities.map((e) => entityWorkspace(e) ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showWorkspace ? `${displayWorkspace(entityWorkspace(e), workspaces)} / ${e.name ?? "-"}` : (e.name ?? "-"),
      e.tabLabel ?? "-",
      e.agent ?? "-",
      e.backendStatus ?? (e.presence?.status?.state ?? "-"),
      e.sessionPath ?? "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

function requirePaneTarget(target: string, command: string): { backend: Backend; handle: string } {
  const resolved = backendTarget(target, command);
  if (!resolved.backend.panes) die(`orch ${command}: backend ${resolved.backend.id} lacks pane control.`);
  return resolved;
}

export function cmdKeys(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const target = cleanArgs[0];
  const keys = cleanArgs.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...]");
  const { backend, handle } = requirePaneTarget(target, "keys");
  if (!backend.canSendKeys) die(`backend ${backend.id} cannot send keys.`);
  if (backend.sendKeys(handle, keys)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
    else process.stdout.write(`Sent keys to ${handle}: ${keys.join(" ")}\n`);
  }
  else die(`Could not send keys to ${handle}.`);
}

export function cmdPeek(args: string[]) {
  let n = 25;
  let json = false;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") n = parseInt(args[++i]!, 10) || 25;
    else if (args[i] === "--json") json = true;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target) die("usage: orch peek <target> [-n N] [--json]");
  const { backend, handle } = requirePaneTarget(target, "peek");
  if (!backend.read) die(`backend ${backend.id} lacks screen reading.`);
  let screen: string;
  try {
    screen = backend.read(handle, n);
  } catch (e: unknown) {
    die(`Could not read ${handle}: ${errorMessage(e)}`);
  }
  if (json) {
    process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write("screen (eyeball only — status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

function selectedGroups(): { backend: Backend; groups: BackendGroup[] } {
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  return { backend, groups: backend.groups?.() ?? [] };
}

export function resolveTab(target: string): BackendGroup {
  const { backend, groups } = selectedGroups();
  if (!groups.length) die("No groups available.");
  const exact = groups.filter((group) => group.id === target || group.label === target);
  const insensitive = groups.filter((group) => (group.label ?? "").toLowerCase() === target.toLowerCase());
  const candidates = exact.length ? exact : insensitive;
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    process.stderr.write(`Ambiguous group "${target}". Candidates:\n`);
    for (const group of candidates) process.stderr.write(`  ${group.id}  ${group.label}\n`);
    process.exit(1);
  }
  const ent = resolveTarget(target);
  const id = parseIdentity(ent.key);
  if (id.backend !== backend.id) die(`Target "${target}" belongs to backend ${id.backend}.`);
  const found = groups.find((group) => group.id === (backend.inventory?.().find((item) => String(item.handle) === id.handle)?.group ?? null));
  if (!found) die(`No group found for target "${target}".`);
  return found;
}

export function cmdTabs(args: string[]) {
  const unknown = args.filter((arg) => !arg.startsWith("--"));
  if (unknown.length) die(`orch tabs lists tabs and has no "${unknown[0]}" subcommand. Create tabs through the backend (e.g. herdr tab create) or orch spawn/tile.`);
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const { backend, groups } = selectedGroups();
  const workspace = backend.currentIdentity?.()?.workspace ?? null;
  const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
  if (!tabs.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write("No groups available.\n");
    return;
  }
  if (json) {
    process.stdout.write(JSON.stringify(tabs, null, 2) + "\n");
    return;
  }
  const showWorkspace = all && new Set(tabs.map((t) => t.workspace ?? "-")).size > 1;
  const headers = showWorkspace ? ["TAB", "LABEL", "NUM", "PANES", "STATUS", "WS"] : ["TAB", "LABEL", "NUM", "PANES", "STATUS"];
  const rows = tabs.map((t) => [
    t.id + (t.focused ? "*" : ""),
    t.label ?? "-",
    String(t.number ?? "-"),
    String(t.paneCount ?? "-"),
    t.status ?? "-",
    ...(showWorkspace ? [t.workspace ?? "-"] : []),
  ]);
  process.stdout.write(renderTable(headers, rows, showWorkspace ? [12, 20, 4, 5, 10, 12] : [12, 20, 4, 5, 10]) + "\n");
}

export function cmdTab(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  const sub = cleanArgs[0];
  const rest = cleanArgs.slice(1);
  if (sub === "new") {
    let label: string | null = null;
    let workspace: string | null = null;
    let cwd = process.cwd();
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--label") label = rest[++i]!;
      else if (rest[i] === "--workspace") workspace = rest[++i]!;
      else if (rest[i] === "--cwd") cwd = rest[++i]!;
    }
    const { backend } = selectedGroups();
    workspace ??= backend.currentIdentity?.()?.workspace ?? null;
    if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
    if (!backend.createGroup) die(`backend ${backend.id} lacks group creation.`);
    try {
      const r = backend.createGroup({ workspace, cwd, label });
      if (json) process.stdout.write(JSON.stringify(r) + "\n");
      else process.stdout.write(`Created group ${r.group.id} "${r.group.label}" — root handle ${String(r.rootHandle)}\n`);
      backend.close(r.rootHandle);
    } catch (e: unknown) {
      die(`group new failed: ${errorMessage(e)}`);
    }
  } else if (sub === "rename") {
    const [t, label] = rest;
    if (!t || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.renameGroup?.(tab.id, label)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label, renamed: true }) + "\n");
      else process.stdout.write(`${tab.id}: "${tab.label}" → "${label}"\n`);
    } else die(`Could not rename group ${tab.id}.`);
  } else if (sub === "close") {
    const t = rest[0];
    if (!t) die("usage: orch tab close <tab_id|label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.closeGroup?.(tab.id)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
      else process.stdout.write(`Closed group ${tab.id} "${tab.label}".\n`);
    } else die(`Could not close group ${tab.id}.`);
  } else if (sub === "focus") {
    const t = rest[0];
    if (!t) die("usage: orch tab focus <tab_id|label>");
    const tab = resolveTab(t);
    const { backend } = selectedGroups();
    if (backend.focusGroup?.(tab.id)) {
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
      else process.stdout.write(`Focused group ${tab.id} "${tab.label}".\n`);
    } else die(`Could not focus group ${tab.id}.`);
  } else {
    die("usage: orch tab new|rename|close|focus …  (orch tabs to list)");
  }
}

export function cmdFocus(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json");
  if (!target) die("usage: orch focus <target> [--json]");
  const { backend, handle } = requirePaneTarget(target, "focus");
  if (backend.focus(handle)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
    else process.stdout.write(`Focused ${handle}.\n`);
  } else die(`Could not focus ${handle}.`);
}

export function cmdZoom(args: string[]) {
  let mode = "--toggle";
  const json = args.includes("--json");
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--off") mode = "--off";
    else if (a === "--on") mode = "--on";
    else if (a === "--json") continue;
    else positional.push(a);
  }
  const target = positional[0];
  if (!target) die("usage: orch zoom <target> [--on|--off]  (default: toggle)");
  const { backend, handle } = requirePaneTarget(target, "zoom");
  if (!backend.zoom) die(`backend ${backend.id} lacks zoom.`);
  const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
  if (backend.zoom(handle, zoomMode)) {
    if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
    else process.stdout.write(`Zoom ${zoomMode} on ${handle}.\n`);
  } else die(`Could not zoom ${handle}.`);
}

export function cmdMove(args: string[]) {
  let tab: string | null = null;
  let split = "right";
  const json = args.includes("--json");
  let newTab = false;
  let label: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tab") tab = args[++i]!;
    else if (args[i] === "--split") split = args[++i]!;
    else if (args[i] === "--new-tab") newTab = true;
    else if (args[i] === "--label") label = args[++i]!;
    else if (args[i] === "--json") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target || (!tab && !newTab))
    die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X]");
  const { backend, handle } = requirePaneTarget(target, "move");
  try {
    const moved = newTab ? backend.moveToNewGroup?.(handle, label) : backend.moveToGroup?.(handle, resolveTab(tab!).id, split as "down" | "right");
    if (!moved) die(`move failed: backend ${backend.id} rejected the move.`);
    const group = newTab ? null : resolveTab(tab!).id;
    if (json) process.stdout.write(JSON.stringify({ target: handle, moved: true, newTab, tab: group }) + "\n");
    else process.stdout.write(`Moved ${handle} ${newTab ? "to a new group" : `to group ${group}`}.\n`);
  } catch (e: unknown) {
    die(`move failed: ${errorMessage(e)}`);
  }
}

export function cmdWs(args: string[]) {
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--json");
  const sub = positional[0];
  if (sub === "focus") {
    const id = positional[1];
    if (!id) die("usage: orch ws focus <workspace_id> [--json]");
    const { backend } = selectedGroups();
    if (!backend.focusWorkspace?.(id)) die(`Could not focus workspace ${id}.`);
    if (json) process.stdout.write(JSON.stringify({ workspace: id, focused: true }) + "\n");
    else process.stdout.write(`Focused workspace ${id}.\n`);
    return;
  }
  if (sub && sub !== "list") die("usage: orch ws [list|focus <workspace_id>] [--json]");
  const { backend } = selectedGroups();
  let wss;
  try {
    wss = backend.workspaces?.() ?? [];
  } catch (e: unknown) {
    die(`workspace list failed: ${errorMessage(e)}`);
  }
  if (!wss.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write("No workspaces.\n");
    return;
  }
  if (json) {
    process.stdout.write(JSON.stringify(wss, null, 2) + "\n");
    return;
  }
  const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
  const rows = wss.map((w) => [
    w.id + (w.focused ? "*" : ""),
    w.label ?? "-",
    String(w.number ?? "-"),
    String(w.tabCount ?? "-"),
    String(w.paneCount ?? "-"),
    w.status ?? "-",
  ]);
  process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
}

