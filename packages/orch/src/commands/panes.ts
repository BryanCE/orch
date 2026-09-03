import { buildEntities, entitySpace, scopeEntitiesToSpace, sortEntities, resolveTarget } from "../entities.ts";
import { loadSettings } from "../settings/read.ts";
import { orchDir } from "../presence/writer.ts";
import { resolveBackend } from "../backends/registry.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { agentAddress, agentIdOfKey, agentViewIndex, assertAgentOwned, splitOptionFlags, die, backendTarget, ownsAgent, presenceById, viewForKey } from "./target.ts";
import { openingPlacement, planTilePlacement, readGroupLayout } from "../backends/tiling.ts";
import { displaySpace } from "./status.ts";
import { spaceName } from "../policy/space.ts";
import { setHandle } from "../store/interval-rows.ts";
import { commandLogger } from "./logging.ts";
import { ambiguousTargetRefusal } from "../refusal.ts";
import type { Backend, BackendGroup, BackendHandle, BackendSplit, TilePlacement } from "../types/backend.ts";

type BoundaryPlan<T> =
  | { readonly outcome: "invoke"; readonly role: T }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "no-pane" | "no-environment-role" };

export function paneBoundary<T>(target: string, command: string, role: T | null, hasPane: boolean): BoundaryPlan<T> {
  if (!hasPane) return { outcome: "answer", reason: "no-pane", text: `${target} has no pane; ${command} does not apply.` };
  if (role === null || role === undefined) return { outcome: "answer", reason: "no-environment-role", text: `this pane environment does not provide ${command}` };
  return { outcome: "invoke", role };
}

function renderBoundaryAnswer<T>(plan: BoundaryPlan<T>, json: boolean): boolean {
  if (plan.outcome === "invoke") return true;
  if (json) process.stdout.write(JSON.stringify(plan) + "\n");
  else process.stdout.write(plan.text + "\n");
  return false;
}
export function cmdPanes(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json"]);
  const all = enabled.has("--all");
  const json = enabled.has("--json");
  const entities = scopeEntitiesToSpace(sortEntities(buildEntities()), { all });
  const spaces = loadSettings(orchDir()).spaces;
  if (json) {
    process.stdout.write(JSON.stringify(entities.map((e) => ({ key: e.key, paneId: e.paneId, name: e.name,
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.backendStatus ?? e.presence?.status?.state ?? null,
      backendStatus: e.backendStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
      space: entitySpace(e), spaceName: spaceName(entitySpace(e), spaces) })), null, 2) + "\n");
    return;
  }
  const showSpace = all && new Set(entities.map((e) => entitySpace(e) ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showSpace ? `${displaySpace(entitySpace(e), spaces)} / ${e.name ?? "-"}` : (e.name ?? "-"),
      e.tabLabel ?? "-",
      e.agent ?? "-",
      e.backendStatus ?? (e.presence?.status?.state ?? "-"),
      e.sessionPath ?? "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

function requirePaneTarget(target: string, command: string): { backend: Backend; handle: string; key: string } {
  return backendTarget(target, command);
}

/** Resolve a pane a command is about to mutate: a foreign-owned agent refuses without --force. */
function requireOwnedPaneTarget(target: string, command: string, force: boolean): { backend: Backend; handle: string; key: string } {
  const resolved = backendTarget(target, command);
  assertAgentOwned(target, { key: resolved.key }, force);
  return resolved;
}

export function cmdKeys(args: string[]) {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const cleanArgs = args.filter((arg) => arg !== "--json" && arg !== "--force");
  const target = cleanArgs[0];
  const keys = cleanArgs.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...] [--force]");
  const { backend, handle } = requireOwnedPaneTarget(target, "keys", force);
  const entity = resolveTarget(target);
  const plan = paneBoundary(target, "keys", backend.paneInput, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.sendKeys(handle, keys);
  if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
  else process.stdout.write(`Sent keys to ${handle}: ${keys.join(" ")}\n`);
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
  const entity = resolveTarget(target);
  const plan = paneBoundary(target, "peek", backend.paneScreen, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  const screen = plan.role.read(handle, n);
  if (json) {
    process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

function selectedGroups(): { backend: Backend; groups: BackendGroup[] } {
  const backend = resolveBackend({ configured: loadSettings(orchDir()).defaults.backend ?? null });
  return { backend, groups: [...(backend.groupHome?.list() ?? [])] };
}

export function resolveTab(target: string): BackendGroup {
  const { backend, groups } = selectedGroups();
  if (!groups.length) die("No groups available.");
  const exact = groups.filter((group) => group.id === target || group.label === target);
  const insensitive = groups.filter((group) => (group.label ?? "").toLowerCase() === target.toLowerCase());
  const candidates = exact.length ? exact : insensitive;
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    commandLogger().error("tabs.ambiguous", { target, candidates: candidates.map((group) => group.id).join(",") });
    // ONE wording for "that matched more than one thing" (U3), and a refusal is
    // thrown, never exited: `process.exit` from the middle of a resolver leaves
    // the caller nothing to recover from and truncates what it already wrote.
    throw ambiguousTargetRefusal(target, candidates.map((group) => ({ key: group.id, detail: group.label ?? null })));
  }
  const ent = resolveTarget(target);
  // Which plexer an agent is in is an ENVIRONMENT axis composed onto it, not a
  // segment of its identity: an agent that moves keeps the id it was minted with.
  const plexer = viewForKey(agentViewIndex(), ent.key)?.environment.plexer ?? ent.backend;
  if (plexer !== null && plexer !== backend.id) die(`Target "${target}" belongs to backend ${plexer}.`);
  // The identity id names the agent and carries no pane; the resolved entity's
  // paneId is the only backend handle for it.
  const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
  const found = groups.find((group) => group.id === (pane?.group ?? null));
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
  // A tab is the PLEXER's grouping, so the grouping to filter by is the plexer's
  // own answer for the calling pane — never read off an identity, which carries
  // no environment (A1). Outside a pane there is no grouping, and `null` is that
  // answer: every tab is listed rather than an invented one being matched.
  const workspace = backend.paneInventory?.current()?.workspace ?? null;
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
  // The plexer's own grouping, echoed verbatim: its word, never orch's.
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

/** Refuse a group-wide mutation while any pane in the group belongs to another orchestrator. */
function assertGroupAgentsOwned(backend: Backend, group: string, force: boolean): void {
  if (force) return;
  const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
  const presence = presenceById();
  for (const view of agentViewIndex().values()) {
    // Ownership is the open lease; the pane handle is environment. A group is a
    // set of PLACES, so it is matched on the handle and refused on the lease.
    const holder = view.heldBy?.orchId;
    const handle = view.environment.handle;
    if (holder === undefined || handle === null || !handles.has(handle)) continue;
    if (!ownsAgent(view)) {
      die(`Group ${group} holds agent ${agentAddress(view, presence)} owned by ${holder}. Use --force to override.`);
    }
  }
}

function parseTabNewArgs(args: string[]): { label: string | null; workspace: string | null; cwd: string } {
  let label: string | null = null;
  let workspace: string | null = null;
  let cwd = process.cwd();
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--label") label = args[++index] ?? null;
    else if (args[index] === "--workspace") workspace = args[++index] ?? null;
    else if (args[index] === "--cwd") cwd = args[++index] ?? cwd;
  }
  return { label, workspace, cwd };
}

function cmdTabNew(rest: string[], json: boolean, backend: Backend): void {
  const parsed = parseTabNewArgs(rest);
  const { label, cwd } = parsed;
  const workspace = parsed.workspace ?? backend.paneInventory?.current()?.workspace ?? null;
  if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
  const created = backend.groupHome!.create({ workspace, cwd, label });
  if (json) process.stdout.write(JSON.stringify(created) + "\n");
  else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
  if (backend.paneHost) backend.paneHost.close(created.rootHandle);
}

function cmdTabRename(target: string | undefined, label: string | undefined, json: boolean, backend: Backend): void {
  if (!target || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
  const tab = resolveTab(target);
  backend.groupHome!.rename(tab.id, label);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label, renamed: true }) + "\n");
  else process.stdout.write(`${tab.id}: "${tab.label}" -> "${label}"\n`);
}

function cmdTabClose(target: string | undefined, force: boolean, json: boolean, backend: Backend): void {
  if (!target) die("usage: orch tab close <tab_id|label> [--force]");
  const tab = resolveTab(target);
  assertGroupAgentsOwned(backend, tab.id, force);
  backend.groupHome!.close(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
  else process.stdout.write(`Closed group ${tab.id} "${tab.label}".\n`);
}

function cmdTabFocus(target: string | undefined, json: boolean, backend: Backend): void {
  if (!target) die("usage: orch tab focus <tab_id|label>");
  const tab = resolveTab(target);
  backend.groupHome!.focus(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
  else process.stdout.write(`Focused group ${tab.id} "${tab.label}".\n`);
}

export function cmdTab(args: string[]) {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const cleanArgs = args.filter((arg) => arg !== "--json" && arg !== "--force");
  const sub = cleanArgs[0];
  const rest = cleanArgs.slice(1);
  const { backend } = selectedGroups();
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide groups" }, json); return; }
  if (sub === "new") cmdTabNew(rest, json, backend);
  else if (sub === "rename") cmdTabRename(rest[0], rest[1], json, backend);
  else if (sub === "close") cmdTabClose(rest[0], force, json, backend);
  else if (sub === "focus") cmdTabFocus(rest[0], json, backend);
  else die("usage: orch tab new|rename|close|focus ...  (orch tabs to list)");
}

export function cmdFocus(args: string[]) {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const target = args.find((arg) => arg !== "--json" && arg !== "--force");
  if (!target) die("usage: orch focus <target> [--force] [--json]");
  const { backend, handle } = requireOwnedPaneTarget(target, "focus", force);
  const entity = resolveTarget(target);
  const plan = paneBoundary(target, "focus", backend.paneInput, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.focus(handle);
  if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
  else process.stdout.write(`Focused ${handle}.\n`);
}

export function cmdZoom(args: string[]) {
  let mode = "--toggle";
  const json = args.includes("--json");
  const force = args.includes("--force");
  const positional: string[] = [];
  for (const a of args) {
    if (a === "--off") mode = "--off";
    else if (a === "--on") mode = "--on";
    else if (a === "--json" || a === "--force") continue;
    else positional.push(a);
  }
  const target = positional[0];
  if (!target) die("usage: orch zoom <target> [--on|--off] [--force]  (default: toggle)");
  const { backend, handle } = requireOwnedPaneTarget(target, "zoom", force);
  const entity = resolveTarget(target);
  const plan = paneBoundary(target, "zoom", backend.paneZoom, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
  plan.role.setZoom(handle, zoomMode);
  if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
  else process.stdout.write(`Zoom ${zoomMode} on ${handle}.\n`);
}

/** Where a pane should land in a group, ignoring the pane itself — a pane
 *  already in that group must never be planned as its own split target. */
function tilePlacementBesides(backend: Backend, group: string, mover: string): TilePlacement {
  const firstSplit = loadSettings(orchDir()).tiling.first_split;
  const role = backend.groupLayout;
  if (!role) return openingPlacement(firstSplit);
  const layout = readGroupLayout(role, group);
  return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
}

function isBackendSplit(value: string): value is BackendSplit {
  return value === "down" || value === "right";
}

export function cmdMove(args: string[]) {
  let tab: string | null = null;
  let split = "right";
  let splitExplicit = false;
  const json = args.includes("--json");
  const force = args.includes("--force");
  let newTab = false;
  let label: string | null = null;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tab") tab = args[++i]!;
    else if (args[i] === "--split") { split = args[++i]!; splitExplicit = true; }
    else if (args[i] === "--new-tab") newTab = true;
    else if (args[i] === "--label") label = args[++i]!;
    else if (args[i] === "--json" || args[i] === "--force") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target || (!tab && !newTab))
    die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X] [--force]");
  const { backend, handle, key } = requireOwnedPaneTarget(target, "move", force);
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide group move" }, json); return; }
  try {
    // Default: land on the destination tab's biggest pane so it stays balanced
    // instead of stacking off one edge. An explicit --split still wins.
    const groupId = newTab ? null : resolveTab(tab!).id;
    let against: BackendHandle | undefined;
    if (!newTab && !splitExplicit && groupId !== null) {
      const placement = tilePlacementBesides(backend, groupId, handle);
      split = placement.split;
      against = placement.targetPane;
    }
    if (!isBackendSplit(split)) die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X] [--force]");
    role.move({ handle, group: newTab ? null : groupId!, split, against, label });
    // The pane moved; the agent did not become a different agent. A14: the
    // handle is an interval on its own axis, so the old one closes and a new
    // one opens — identity is untouched.
    const movedId = agentIdOfKey(key);
    if (movedId !== null) setHandle(orchDir(), movedId, Date.now(), String(handle));
    if (json) process.stdout.write(JSON.stringify({ target: handle, moved: true, newTab, tab: groupId }) + "\n");
    else process.stdout.write(`Moved ${String(handle)} ${newTab ? "to a new group" : `to group ${groupId}`}.\n`);
  } catch (e: unknown) {
    die(`move failed: ${errorMessage(e)}`);
  }
}

