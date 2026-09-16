import { buildEntities, sortEntities } from "../entities/inventory.ts";
import { entitySpace, scopeEntitiesToSpace } from "../entities/space.ts";
import { resolveTarget } from "../entities/resolve.ts";
import type { Services, SettingsService } from "../types/services.ts";
import { resolveBackend } from "../backends/registry.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { agentAddress, assertAgentOwned, die, backendTarget, ownsAgent, presenceById } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { ParsedFlags } from "../cli/spec.ts";
import { isAgentId } from "../backends/identity.ts";
import { viewForKey } from "../entities/lookup.ts";
import { openingPlacement, planTilePlacement, readGroupLayout } from "../backends/tiling.ts";
import { displaySpace } from "./status/options.ts";
import { spaceName } from "../policy/space.ts";
import { writeRpc } from "./daemon.ts";
import { ambiguousTargetRefusal } from "../refusal.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
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
export function cmdPanes(services: Services, args: string[]) {
  const { flags } = parseCommand("panes", args);
  const all = flags.has("--all");
  const json = flags.has("--json");
  const settings = services.settings.current();
  const entities = scopeEntitiesToSpace(services.orchDir, sortEntities(buildEntities(services.orchDir, settings)), { all });
  const spaces = settings.spaces;
  if (json) {
    process.stdout.write(JSON.stringify(entities.map((e) => ({ key: e.key, paneId: e.paneId, name: e.name,
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.backendStatus ?? e.presence?.status?.state ?? null,
      backendStatus: e.backendStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
      space: entitySpace(services.orchDir, e), spaceName: spaceName(entitySpace(services.orchDir, e), spaces) })), null, 2) + "\n");
    return;
  }
  const showSpace = all && new Set(entities.map((e) => entitySpace(services.orchDir, e) ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showSpace ? `${displaySpace(entitySpace(services.orchDir, e), spaces)} / ${e.name ?? "-"}` : (e.name ?? "-"),
      e.tabLabel ?? "-",
      e.agent ?? "-",
      e.backendStatus ?? (e.presence?.status?.state ?? "-"),
      e.sessionPath ?? "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

function requirePaneTarget(services: Pick<Services, "orchDir" | "settings">, target: string, command: string): { backend: Backend; handle: string; key: string } {
  return backendTarget(services.orchDir, services.settings.current(), target, command);
}

/** Resolve a pane a command is about to mutate: a foreign-owned agent refuses without --force. */
function requireOwnedPaneTarget(services: Pick<Services, "orchDir" | "settings">, target: string, command: string, force: boolean): { backend: Backend; handle: string; key: string } {
  const resolved = backendTarget(services.orchDir, services.settings.current(), target, command);
  assertAgentOwned(services.orchDir, target, { key: resolved.key }, force);
  return resolved;
}

export function cmdKeys(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("keys", args);
  const json = flags.has("--json");
  const force = flags.has("--force");
  const target = positional[0];
  const keys = positional.slice(1);
  if (!target || !keys.length) die("usage: orch keys <target> <key> [key...] [--force]");
  const { backend, handle } = requireOwnedPaneTarget(services, target, "keys", force);
  const entity = resolveTarget(services.orchDir, services.settings.current(), target);
  const plan = paneBoundary(target, "keys", backend.agentInput, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.sendKeys(handle, keys);
  if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
  else process.stdout.write(`Sent keys to ${handle}: ${keys.join(" ")}\n`);
}

export function cmdPeek(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("peek", args);
  const n = parseInt(flags.value("-n") ?? "", 10) || 25;
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) die("usage: orch peek <target> [-n N] [--json]");
  const { backend, handle } = requirePaneTarget(services, target, "peek");
  const entity = resolveTarget(services.orchDir, services.settings.current(), target);
  const plan = paneBoundary(target, "peek", backend.screen, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  const screen = plan.role.read(handle, n);
  if (json) {
    process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
  process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
}

function selectedGroups(services: SettingsService): { backend: Backend; groups: BackendGroup[] } {
  const backend = resolveBackend({ configured: services.settings.current().defaults.backend ?? null });
  return { backend, groups: [...(backend.groupHome?.list() ?? [])] };
}

export function resolveTab(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string): BackendGroup {
  const { backend, groups } = selectedGroups(services);
  if (!groups.length) die("No groups available.");
  const exact = groups.filter((group) => group.id === target || group.label === target);
  const insensitive = groups.filter((group) => (group.label ?? "").toLowerCase() === target.toLowerCase());
  const candidates = exact.length ? exact : insensitive;
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    services.logger.error("tabs.ambiguous", { target, candidates: candidates.map((group) => group.id).join(",") });
    // ONE wording for "that matched more than one thing" (U3), and a refusal is
    // thrown, never exited: `process.exit` from the middle of a resolver leaves
    // the caller nothing to recover from and truncates what it already wrote.
    throw ambiguousTargetRefusal(target, candidates.map((group) => ({ key: group.id, detail: group.label ?? null })));
  }
  const ent = resolveTarget(services.orchDir, services.settings.current(), target);
  // Which plexer an agent is in is an ENVIRONMENT axis composed onto it, not a
  // segment of its identity: an agent that moves keeps the id it was minted with.
  const plexer = viewForKey(spawnedRecords(services.orchDir), ent.key)?.environment.plexer ?? ent.backend;
  if (plexer !== null && plexer !== backend.id) die(`Target "${target}" belongs to backend ${plexer}.`);
  // The identity id names the agent and carries no pane; the resolved entity's
  // paneId is the only backend handle for it.
  const pane = backend.placementInventory?.list().find((item) => String(item.handle) === ent.paneId);
  const found = groups.find((group) => group.id === (pane?.group ?? null));
  if (!found) die(`No group found for target "${target}".`);
  return found;
}

export function cmdTabs(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("tabs", args);
  if (positional.length) die(`orch tabs lists tabs and has no "${positional[0]}" subcommand. Create tabs through the backend (e.g. herdr tab create) or orch spawn/tile.`);
  const all = flags.has("--all");
  const json = flags.has("--json");
  const { backend, groups } = selectedGroups(services);
  // A tab is the PLEXER's grouping, so the grouping to filter by is the plexer's
  // own answer for the calling pane — never read off an identity, which carries
  // no environment (A1). Outside a pane there is no grouping, and `null` is that
  // answer: every tab is listed rather than an invented one being matched.
  const workspace = backend.placementInventory?.current()?.workspace ?? null;
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
    String(t.placementCount ?? "-"),
    t.status ?? "-",
    ...(showWorkspace ? [t.workspace ?? "-"] : []),
  ]);
  process.stdout.write(renderTable(headers, rows, showWorkspace ? [12, 20, 4, 5, 10, 12] : [12, 20, 4, 5, 10]) + "\n");
}

/** Refuse a group-wide mutation while any pane in the group belongs to another orchestrator. */
function assertGroupAgentsOwned(services: Pick<Services, "orchDir">, backend: Backend, group: string, force: boolean): void {
  if (force) return;
  const handles = new Set((backend.placementInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
  const presence = presenceById(loadPresence(services.orchDir));
  for (const view of spawnedRecords(services.orchDir).values()) {
    // Ownership is the open lease; the pane handle is environment. A group is a
    // set of PLACES, so it is matched on the handle and refused on the lease.
    const holder = view.heldBy?.orchId;
    const handle = view.environment.handle;
    if (holder === undefined || handle === null || !handles.has(handle)) continue;
    if (!ownsAgent(services.orchDir, view)) {
      die(`Group ${group} holds agent ${agentAddress(view, presence)} owned by ${holder}. Use --force to override.`);
    }
  }
}

function cmdTabNew(flags: ParsedFlags, json: boolean, backend: Backend): void {
  const label = flags.value("--label") ?? null;
  const cwd = flags.value("--dir") ?? process.cwd();
  const workspace = flags.value("--workspace") ?? backend.placementInventory?.current()?.workspace ?? null;
  if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
  const created = backend.groupHome!.create({ workspace, cwd, label });
  if (json) process.stdout.write(JSON.stringify(created) + "\n");
  else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
  if (backend.placement) backend.placement.close(created.rootHandle);
}

function cmdTabRename(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string | undefined, label: string | undefined, json: boolean, backend: Backend): void {
  if (!target || !label) die("usage: orch tab rename <tab_id|label> <new-label>");
  const tab = resolveTab(services, target);
  backend.groupHome!.rename(tab.id, label);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label, renamed: true }) + "\n");
  else process.stdout.write(`${tab.id}: "${tab.label}" -> "${label}"\n`);
}

function cmdTabClose(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string | undefined, force: boolean, json: boolean, backend: Backend): void {
  if (!target) die("usage: orch tab close <tab_id|label> [--force]");
  const tab = resolveTab(services, target);
  assertGroupAgentsOwned(services, backend, tab.id, force);
  backend.groupHome!.close(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
  else process.stdout.write(`Closed group ${tab.id} "${tab.label}".\n`);
}

function cmdTabFocus(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string | undefined, json: boolean, backend: Backend): void {
  if (!target) die("usage: orch tab focus <tab_id|label>");
  const tab = resolveTab(services, target);
  backend.groupHome!.focus(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
  else process.stdout.write(`Focused group ${tab.id} "${tab.label}".\n`);
}

export function cmdTab(services: Services, args: string[]) {
  const { command, flags, positional } = parseCommand("tab", args);
  const json = flags.has("--json");
  const { backend } = selectedGroups(services);
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide groups" }, json); return; }
  switch (command.name) {
    case "new": return cmdTabNew(flags, json, backend);
    case "rename": return cmdTabRename(services, positional[0], positional[1], json, backend);
    case "close": return cmdTabClose(services, positional[0], flags.has("--force"), json, backend);
    case "focus": return cmdTabFocus(services, positional[0], json, backend);
    default: die("usage: orch tab new|rename|close|focus ...  (orch tabs to list)");
  }
}

export function cmdFocus(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("focus", args);
  const json = flags.has("--json");
  const force = flags.has("--force");
  const target = positional[0];
  if (!target) die("usage: orch focus <target> [--force] [--json]");
  const { backend, handle } = requireOwnedPaneTarget(services, target, "focus", force);
  const entity = resolveTarget(services.orchDir, services.settings.current(), target);
  const plan = paneBoundary(target, "focus", backend.agentInput, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.focus(handle);
  if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
  else process.stdout.write(`Focused ${handle}.\n`);
}

export function cmdZoom(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("zoom", args);
  const json = flags.has("--json");
  const force = flags.has("--force");
  const target = positional[0];
  if (!target) die("usage: orch zoom <target> [--on|--off] [--force]  (default: toggle)");
  const { backend, handle } = requireOwnedPaneTarget(services, target, "zoom", force);
  const entity = resolveTarget(services.orchDir, services.settings.current(), target);
  const plan = paneBoundary(target, "zoom", backend.zooming, !!entity.paneId);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  const zoomMode = flags.has("--on") ? "on" : flags.has("--off") ? "off" : "toggle";
  plan.role.setZoom(handle, zoomMode);
  if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
  else process.stdout.write(`Zoom ${zoomMode} on ${handle}.\n`);
}

/** Where a pane should land in a group, ignoring the pane itself — a pane
 *  already in that group must never be planned as its own split target. */
function tilePlacementBesides(services: Pick<Services, "settings">, backend: Backend, group: string, mover: string): TilePlacement {
  const firstSplit = services.settings.current().tiling.first_split;
  const role = backend.groupLayout;
  if (!role) return openingPlacement(firstSplit);
  const layout = readGroupLayout(role, group);
  return planTilePlacement({ ...layout, placements: layout.placements.filter((place) => String(place.handle) !== mover) }, firstSplit);
}

function isBackendSplit(value: string): value is BackendSplit {
  return value === "down" || value === "right";
}

export async function cmdMove(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("move", args);
  const json = flags.has("--json");
  const force = flags.has("--force");
  const tab = flags.value("--tab");
  const newTab = flags.has("--new-tab");
  const label = flags.value("--label") ?? null;
  let split = flags.value("--split") ?? "right";
  const target = positional[0];
  if (!target || (tab === undefined && !newTab))
    die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X] [--force]");
  const { backend, handle, key } = requireOwnedPaneTarget(services, target, "move", force);
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide group move" }, json); return; }
  try {
    // Default: land on the destination tab's biggest pane so it stays balanced
    // instead of stacking off one edge. An explicit --split still wins.
    const groupId = newTab || tab === undefined ? null : resolveTab(services, tab).id;
    let against: BackendHandle | undefined;
    if (!flags.has("--split") && groupId !== null) {
      const placement = tilePlacementBesides(services, backend, groupId, handle);
      split = placement.split;
      against = placement.targetHandle;
    }
    if (!isBackendSplit(split)) die("usage: orch move <target> --tab <tab_id|label> [--split right|down] | --new-tab [--label X] [--force]");
    role.move({ handle, group: groupId, split, against, label });
    // The pane moved; the agent did not become a different agent. A14: the
    // handle is an interval on its own axis, so the old one closes and a new
    // one opens — identity is untouched.
    if (isAgentId(key)) await writeRpc(services, "set-handle", { target: key, handle: String(handle) });
    if (json) process.stdout.write(JSON.stringify({ target: handle, moved: true, newTab, tab: groupId }) + "\n");
    else process.stdout.write(`Moved ${String(handle)} ${newTab ? "to a new group" : `to group ${groupId}`}.\n`);
  } catch (e: unknown) {
    die(`move failed: ${errorMessage(e)}`);
  }
}

