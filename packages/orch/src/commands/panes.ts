import type { Entity } from "../types/core.ts";
import type { Services, SettingsService } from "../types/services.ts";
import { resolveBackend } from "../backends/registry.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { die } from "./target.ts";
import { addressOf, indexPresenceById } from "../entities/lookup.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import { readCount } from "../cli/count.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import { isAgentId } from "../backends/identity.ts";
import { openingPlacement, planTilePlacement, readGroupLayout } from "../backends/tiling.ts";
import { displaySpace } from "./status/options.ts";
import { askDaemon, writeRpc } from "./daemon.ts";
import { ambiguousTargetRefusal } from "../refusal.ts";
import type { Backend, BackendGroup, BackendHandle, BackendSplit, BackendZoomMode, TilePlacement } from "../types/backend.ts";
import { readFleet } from "./fleet.ts";
import { resolveLifecycle, refuseForeignHolder } from "./resolve.ts";
import { refuseNonOperatorOverride, whoAmI, type CallerSelf } from "./self.ts";
import { sameSpace, spaceName } from "../policy/space.ts";
import { describeHandle } from "../backends/backend.ts";

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

export function writeEmptyOrJson<T>(items: readonly T[], json: boolean, emptyText: string, jsonValue: unknown = items): boolean {
  if (!items.length) {
    if (json) process.stdout.write("[]\n");
    else process.stdout.write(emptyText + "\n");
    return true;
  }
  if (!json) return false;
  process.stdout.write(JSON.stringify(jsonValue, null, 2) + "\n");
  return true;
}

/** The flags every single-pane verb reads, and its one required target. */
function readPaneOptions(invocation: Invocation): { json: boolean; steal: boolean; target: string } {
  return { json: invocation.flags.has("--json"), steal: invocation.flags.has("--steal"), target: requiredWord(invocation, 0) };
}

/** `orch pane list`: the raw panes, for scripts. */
export async function cmdPane(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("pane", args);
  if (invocation.command.name !== "list" || invocation.positional.length) throw usageError(invocation);
  await listPanes(services, invocation.flags);
}

async function listPanes(services: Services, flags: ParsedFlags): Promise<void> {
  const all = flags.has("--all");
  const json = flags.has("--json");
  const self = await whoAmI(services);
  if (all) refuseNonOperatorOverride(self, "--all");
  const fleet = await readFleet(services, true);
  const entities = all || self.space === null
    ? fleet.entities
    : fleet.entities.filter((entity) => sameSpace(entity.space, self.space));
  const spaces = services.settings.current().spaces;
  if (json) {
    process.stdout.write(JSON.stringify(entities.map((e) => ({ key: e.key, paneId: e.paneId, name: e.name,
      tab: e.tabLabel, agent: e.agent, focused: e.focused, state: e.backendStatus ?? e.presence?.status?.state ?? null,
      backendStatus: e.backendStatus, sessionPath: e.sessionPath, presenceOnly: e.presenceOnly,
      space: e.space, spaceName: spaceName(e.space, spaces) })), null, 2) + "\n");
    return;
  }
  const showSpace = all && new Set(entities.map((e) => e.space ?? "-")).size > 1;
  for (const e of entities) {
    const parts = [
      e.paneId ?? e.key,
      showSpace ? `${displaySpace(e.space, spaces)} / ${e.name ?? "-"}` : (e.name ?? "-"),
      e.tabLabel ?? "-",
      e.agent ?? "-",
      e.backendStatus ?? (e.presence?.status?.state ?? "-"),
      e.sessionPath ?? "-",
    ];
    process.stdout.write(parts.join("\t") + "\n");
  }
}

async function requirePaneTarget(services: Services, target: string): Promise<{ backend: Backend; handle: BackendHandle; key: string; entity: Entity }> {
  const resolved = await resolveLifecycle(services, target);
  return {
    backend: resolved.backend,
    handle: resolved.handle,
    key: resolved.key,
    entity: resolved.entity,
  };
}

/** Resolve a pane a command is about to mutate: a foreign-owned agent refuses without --steal. */
async function requireOwnedPaneTarget(services: Services, self: CallerSelf, target: string, steal: boolean): Promise<{ backend: Backend; handle: BackendHandle; key: string; entity: Entity }> {
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, steal);
  return { backend: resolved.backend, handle: resolved.handle, key: resolved.key, entity: resolved.entity };
}

async function planOwnedPaneRole<T>(services: Services, self: CallerSelf, target: string, steal: boolean, command: string, selectRole: (backend: Backend) => T | null): Promise<{ handle: BackendHandle; plan: BoundaryPlan<T> }> {
  const { backend, handle, entity } = await requireOwnedPaneTarget(services, self, target, steal);
  return { handle, plan: paneBoundary(target, command, selectRole(backend), !!entity.paneId) };
}

export async function cmdKeys(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("keys", args);
  const { json, steal, target } = readPaneOptions(invocation);
  const keys = invocation.positional.slice(1);
  if (!keys.length) throw usageError(invocation);
  const self = await whoAmI(services);
  const { handle, plan } = await planOwnedPaneRole(services, self, target, steal, "keys", (backend) => backend.agentInput);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.sendKeys(handle, keys);
  if (json) process.stdout.write(JSON.stringify({ target: describeHandle(handle), keys, sent: true }) + "\n");
  else process.stdout.write(`Sent keys to ${describeHandle(handle)}: ${keys.join(" ")}\n`);
}

export async function cmdPeek(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("peek", args);
  const { json, target } = readPaneOptions(invocation);
  const n = readCount(invocation) ?? services.settings.current().counts.peek;
  const { backend, handle, entity } = await requirePaneTarget(services, target);
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

export async function resolveTab(services: Pick<Services, "orchDir" | "settings" | "logger">, target: string): Promise<BackendGroup> {
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
  const resolved = await resolveLifecycle(services, target);
  const plexer = resolved.view?.environment.plexer ?? resolved.entity.backend;
  if (plexer !== null && plexer !== backend.id) die(`Target "${target}" belongs to backend ${plexer}.`);
  // The identity id names the agent and carries no pane; the resolved entity's
  // paneId is the only backend handle for it.
  const pane = backend.placementInventory?.list().find((item) => String(item.handle) === resolved.entity.paneId);
  const found = groups.find((group) => group.id === (pane?.group ?? null));
  if (!found) die(`No group found for target "${target}".`);
  return found;
}

/** `orch tab list`. */
function listTabs(services: Services, flags: ParsedFlags): void {
  const all = flags.has("--all");
  const json = flags.has("--json");
  const { backend, groups } = selectedGroups(services);
  // The home to filter by is the plexer's answer for the calling pane, never an
  // identity's (A1). Outside a pane it is null, and every tab is listed.
  const home = backend.placementInventory?.current()?.workspace ?? null;
  const tabs = groups.filter((tab) => all || home === null || tab.workspace === home);
  if (writeEmptyOrJson(tabs, json, "No groups available.")) return;
  // The plexer coordinate each tab sits in: a space's home, in orch's words.
  const showHome = all && new Set(tabs.map((t) => t.workspace ?? "-")).size > 1;
  const headers = showHome ? ["TAB", "LABEL", "NUM", "PANES", "STATUS", "HOME"] : ["TAB", "LABEL", "NUM", "PANES", "STATUS"];
  const rows = tabs.map((t) => [
    t.id + (t.focused ? "*" : ""),
    t.label ?? "-",
    String(t.number ?? "-"),
    String(t.placementCount ?? "-"),
    t.status ?? "-",
    ...(showHome ? [t.workspace ?? "-"] : []),
  ]);
  process.stdout.write(renderTable(headers, rows, showHome ? [12, 20, 4, 5, 10, 12] : [12, 20, 4, 5, 10]) + "\n");
}

/** Refuse a group-wide mutation while any pane in the group belongs to another orchestrator. */
async function assertGroupAgentsOwned(services: Services, self: CallerSelf, backend: Backend, group: string, steal: boolean): Promise<void> {
  if (steal) {
    refuseNonOperatorOverride(self, "--steal");
    return;
  }
  const handles = new Set((backend.placementInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
  const fleet = await readFleet(services, true);
  const presence = indexPresenceById(fleet.presence);
  for (const view of fleet.views) {
    if (view.endedAt !== null) continue;
    // Ownership is the open lease; the pane handle is environment. A group is a
    // set of PLACES, so it is matched on the handle and refused on the lease.
    const holder = view.heldBy?.orchId;
    const handle = view.environment.handle;
    if (holder === null || holder === undefined || handle === null || !handles.has(handle)) continue;
    const owns = holder === self.id || (self.kind === "operator" && sameSpace(view.environment.space, self.space));
    if (!owns) {
      die(`Group ${group} holds agent ${addressOf(view, presence)} owned by ${holder}. Use --steal to override.`);
    }
  }
}

/** The plexer coordinate a new tab opens in: the named orch space's home, else the caller's own. */
async function tabCoordinate(services: Services, backend: Backend, space: string | undefined): Promise<string> {
  if (space === undefined) {
    const current = backend.placementInventory?.current()?.workspace ?? null;
    if (current === null) die("Not inside a plexer home, so the tab has nowhere to open. Pass --space <space>.");
    return current;
  }
  const listed = await askDaemon(services, "space", { target: space, plexerId: backend.id });
  if (listed.home === null) die(`${listed.name} has no home in this environment; tab new does not apply.`);
  return listed.home;
}

async function cmdTabNew(services: Services, flags: ParsedFlags, json: boolean, backend: Backend): Promise<void> {
  const label = flags.value("--label") ?? null;
  const cwd = flags.value("--dir") ?? process.cwd();
  const home = await tabCoordinate(services, backend, flags.value("--space"));
  const created = backend.groupHome!.create({ workspace: home, cwd, label });
  if (json) process.stdout.write(JSON.stringify(created) + "\n");
  else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
  if (backend.placement) backend.placement.close(created.rootHandle);
}

/** Resolve a tab a command is about to mutate: a foreign-owned agent in it refuses without --steal. */
async function resolveOwnedTab(services: Services, target: string, steal: boolean, backend: Backend): Promise<BackendGroup> {
  const self = await whoAmI(services);
  const tab = await resolveTab(services, target);
  await assertGroupAgentsOwned(services, self, backend, tab.id, steal);
  return tab;
}

async function cmdTabRename(services: Services, target: string, label: string, steal: boolean, json: boolean, backend: Backend): Promise<void> {
  const tab = await resolveOwnedTab(services, target, steal, backend);
  backend.groupHome!.rename(tab.id, label);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label, renamed: true }) + "\n");
  else process.stdout.write(`${tab.id}: "${tab.label}" -> "${label}"\n`);
}

async function cmdTabClose(services: Services, target: string, steal: boolean, json: boolean, backend: Backend): Promise<void> {
  const tab = await resolveOwnedTab(services, target, steal, backend);
  backend.groupHome!.close(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
  else process.stdout.write(`Closed group ${tab.id} "${tab.label}".\n`);
}

async function cmdTabFocus(services: Services, target: string, steal: boolean, json: boolean, backend: Backend): Promise<void> {
  const tab = await resolveOwnedTab(services, target, steal, backend);
  backend.groupHome!.focus(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
  else process.stdout.write(`Focused group ${tab.id} "${tab.label}".\n`);
}

/** The positional word at `index` the command's grammar requires, or the usage line. */
export function requiredWord(invocation: Invocation, index: number): string {
  const given = invocation.positional[index];
  if (!given) throw usageError(invocation);
  return given;
}

export async function cmdTab(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("tab", args);
  const { command, flags } = invocation;
  const json = flags.has("--json");
  const steal = flags.has("--steal");
  const { backend } = selectedGroups(services);
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide groups" }, json); return; }
  switch (command.name) {
    case "list": listTabs(services, flags); return;
    case "new": await cmdTabNew(services, flags, json, backend); return;
    case "rename": await cmdTabRename(services, requiredWord(invocation, 0), requiredWord(invocation, 1), steal, json, backend); return;
    case "close": await cmdTabClose(services, requiredWord(invocation, 0), steal, json, backend); return;
    case "focus": await cmdTabFocus(services, requiredWord(invocation, 0), steal, json, backend); return;
    default: throw usageError(invocation);
  }
}

export async function cmdFocus(services: Services, args: string[]): Promise<void> {
  const { json, steal, target } = readPaneOptions(parseCommand("focus", args));
  const self = await whoAmI(services);
  const { handle, plan } = await planOwnedPaneRole(services, self, target, steal, "focus", (backend) => backend.agentInput);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.focus(handle);
  if (json) process.stdout.write(JSON.stringify({ target: describeHandle(handle), focused: true }) + "\n");
  else process.stdout.write(`Focused ${describeHandle(handle)}.\n`);
}

/** `--zoom` zooms in, `--no-zoom` zooms out, neither flips. */
function readZoomMode(invocation: Invocation): BackendZoomMode {
  const on = invocation.flags.has("--zoom");
  const off = invocation.flags.has("--no-zoom");
  if (on && off) throw usageError(invocation, "--zoom and --no-zoom contradict each other");
  if (on) return "on";
  return off ? "off" : "toggle";
}

export async function cmdZoom(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("zoom", args);
  const { json, steal, target } = readPaneOptions(invocation);
  const zoomMode = readZoomMode(invocation);
  const self = await whoAmI(services);
  const { handle, plan } = await planOwnedPaneRole(services, self, target, steal, "zoom", (backend) => backend.zooming);
  if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
  plan.role.setZoom(handle, zoomMode);
  if (json) process.stdout.write(JSON.stringify({ target: describeHandle(handle), mode: zoomMode, zoomed: true }) + "\n");
  else process.stdout.write(`Zoom ${zoomMode} on ${describeHandle(handle)}.\n`);
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

/** `--split <right|down>`, or undefined when the planner picks. */
function readSplit(invocation: Invocation): BackendSplit | undefined {
  const given = invocation.flags.value("--split");
  if (given === undefined || isBackendSplit(given)) return given;
  throw usageError(invocation, `--split takes right or down, not "${given}"`);
}

export async function cmdMove(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("move", args);
  const { flags } = invocation;
  const { json, steal, target } = readPaneOptions(invocation);
  const tab = flags.value("--tab");
  const newTab = flags.has("--new-tab");
  const label = flags.value("--label") ?? null;
  const given = readSplit(invocation);
  if (tab === undefined && !newTab) throw usageError(invocation);
  let split: BackendSplit = given ?? "right";
  const self = await whoAmI(services);
  const { backend, handle, key } = await requireOwnedPaneTarget(services, self, target, steal);
  const role = backend.groupHome;
  if (!role) { renderBoundaryAnswer({ outcome: "answer", reason: "no-environment-role", text: "this environment does not provide group move" }, json); return; }
  try {
    // Default: land on the destination tab's biggest pane so it stays balanced
    // instead of stacking off one edge. An explicit --split still wins.
    const groupId = newTab || tab === undefined ? null : (await resolveTab(services, tab)).id;
    let against: BackendHandle | undefined;
    if (given === undefined && groupId !== null) {
      const placement = tilePlacementBesides(services, backend, groupId, String(handle));
      split = placement.split;
      against = placement.targetHandle;
    }
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

