import type { Services, SettingsService } from "../types/services.ts";
import { resolveBackend } from "../backends/registry.ts";
import { renderTable } from "../table.ts";
import { ARROW, errorMessage } from "../util.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import { readCount } from "../cli/count.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import { displaySpace } from "./status/options.ts";
import { askDaemon, writeRpc } from "./daemon.ts";
import { ambiguousTargetRefusal } from "../refusal.ts";
import type { Backend, BackendGroup, BackendSplit, BackendZoomMode } from "../types/backend.ts";
import type { PaneAction, PaneOutcome } from "../daemon/client/protocol.ts";
import { readFleet } from "./fleet.ts";
import { resolveLifecycle, refuseForeignHolder, targetName } from "./resolve.ts";
import { refuseNonOperatorOverride, whoAmI, type CallerSelf } from "./self.ts";
import { sameSpace, spaceName } from "../policy/space.ts";
import { groupsNamed } from "../groups.ts";
import { hostLine, readAgentThroughOrchd } from "./agent-read.ts";

/** Why a pane verb does not apply, as the verb prints it. */
interface PaneAnswer {
  readonly reason: "no-pane" | "no-environment-role";
  readonly text: string;
}

function renderPaneAnswer(answer: PaneAnswer, json: boolean): void {
  if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason: answer.reason, text: answer.text }) + "\n");
  else process.stdout.write(answer.text + "\n");
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

/** A pane verb done to an agent's pane where it runs, after the lease gate: the agent's name,
 *  and orchd's outcome. An answer is printed here and comes back null. */
async function actOnPane(services: Services, self: CallerSelf, target: string, steal: boolean, json: boolean, action: PaneAction): Promise<{ readonly name: string; readonly done: Extract<PaneOutcome, { kind: "done" }> } | null> {
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, steal);
  const outcome = await writeRpc(services, "agent-pane", { target: resolved.key, action }, { steal });
  if (outcome.kind === "answer") {
    renderPaneAnswer(outcome, json);
    return null;
  }
  return { name: targetName(resolved), done: outcome };
}

export async function cmdKeys(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("keys", args);
  const { json, steal, target } = readPaneOptions(invocation);
  const keys = invocation.positional.slice(1);
  if (!keys.length) throw usageError(invocation);
  const self = await whoAmI(services);
  const acted = await actOnPane(services, self, target, steal, json, { kind: "keys", keys });
  if (acted === null) return;
  if (json) process.stdout.write(JSON.stringify({ target: acted.done.handle, keys, sent: true }) + "\n");
  else process.stdout.write(`Sent keys to ${acted.name}: ${keys.join(" ")}\n`);
}

export async function cmdPeek(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("peek", args);
  const { json, target } = readPaneOptions(invocation);
  const n = readCount(invocation) ?? services.settings.current().counts.peek;
  const resolved = await resolveLifecycle(services, target);
  const { host, reading } = await readAgentThroughOrchd(services, resolved.key, { kind: "screen", lines: n });
  const lookup = reading.lookup;
  if (lookup.kind === "answer") {
    renderPaneAnswer(lookup, json);
    return;
  }
  const screen = lookup.text;
  if (json) {
    process.stdout.write(JSON.stringify({ target, host, pane: lookup.handle, screen, lines: n }) + "\n");
    return;
  }
  process.stdout.write(hostLine(host));
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
  const candidates = groupsNamed(groups, target);
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    services.logger.error("tabs.ambiguous", { target, candidates: candidates.map((group) => group.id).join(",") });
    // ONE wording for "that matched more than one thing" (U3), and a refusal is
    // thrown, never exited: `process.exit` from the middle of a resolver leaves
    // the caller nothing to recover from and truncates what it already wrote.
    throw ambiguousTargetRefusal(target, candidates.map((group) => ({ key: group.id, name: group.label ?? group.id, detail: null })));
  }
  // An agent's name stands for the group its pane is in, which orchd reads from its plexer.
  const resolved = await resolveLifecycle(services, target);
  const plexer = resolved.view?.environment.plexer ?? resolved.entity.backend;
  if (plexer !== null && plexer !== backend.id) die(`Target "${target}" belongs to backend ${plexer}.`);
  const outcome = await writeRpc(services, "agent-pane", { target: resolved.key, action: { kind: "group" } });
  const found = outcome.kind === "done" ? groups.find((group) => group.id === outcome.group) : undefined;
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
  for (const view of fleet.views) {
    if (view.endedAt !== null) continue;
    // Ownership is the open lease; the pane handle is environment. A group is a
    // set of PLACES, so it is matched on the handle and refused on the lease.
    const holder = view.heldBy?.orchId;
    const handle = view.environment.handle;
    if (holder === null || holder === undefined || handle === null || !handles.has(handle)) continue;
    const owns = holder === self.id || (self.kind === "operator" && sameSpace(view.environment.space, self.space));
    if (!owns) {
      die(`Group ${group} holds agent ${view.id} owned by ${holder}. Use --steal to override.`);
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
  else process.stdout.write(`Created group "${created.group.label}".\n`);
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
  else process.stdout.write(`Renamed group "${tab.label}" ${ARROW} "${label}".\n`);
}

async function cmdTabClose(services: Services, target: string, steal: boolean, json: boolean, backend: Backend): Promise<void> {
  const tab = await resolveOwnedTab(services, target, steal, backend);
  backend.groupHome!.close(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
  else process.stdout.write(`Closed group "${tab.label}".\n`);
}

async function cmdTabFocus(services: Services, target: string, steal: boolean, json: boolean, backend: Backend): Promise<void> {
  const tab = await resolveOwnedTab(services, target, steal, backend);
  backend.groupHome!.focus(tab.id);
  if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
  else process.stdout.write(`Focused group "${tab.label}".\n`);
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
  if (!role) { renderPaneAnswer({ reason: "no-environment-role", text: "this environment does not provide groups" }, json); return; }
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
  const acted = await actOnPane(services, self, target, steal, json, { kind: "focus" });
  if (acted === null) return;
  if (json) process.stdout.write(JSON.stringify({ target: acted.done.handle, focused: true }) + "\n");
  else process.stdout.write(`Focused ${acted.name}.\n`);
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
  const acted = await actOnPane(services, self, target, steal, json, { kind: "zoom", mode: zoomMode });
  if (acted === null) return;
  if (json) process.stdout.write(JSON.stringify({ target: acted.done.handle, mode: zoomMode, zoomed: true }) + "\n");
  else process.stdout.write(`Set zoom ${zoomMode} on ${acted.name}.\n`);
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
  const split = readSplit(invocation) ?? null;
  if (tab === undefined && !newTab) throw usageError(invocation);
  const self = await whoAmI(services);
  let acted: Awaited<ReturnType<typeof actOnPane>>;
  try {
    acted = await actOnPane(services, self, target, steal, json, { kind: "move", tab: newTab ? null : tab ?? null, split, label });
  } catch (e: unknown) {
    die(`move failed: ${errorMessage(e)}`);
  }
  if (acted === null) return;
  const groupId = acted.done.group;
  if (json) process.stdout.write(JSON.stringify({ target: acted.done.handle, moved: true, newTab, tab: groupId }) + "\n");
  else process.stdout.write(`Moved ${acted.name}${newTab ? "to a new group" : `to group ${groupId}`}.\n`);
}
