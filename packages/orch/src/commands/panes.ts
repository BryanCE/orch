import type { Services } from "../types/services.ts";
import { renderTable } from "../table.ts";
import { ARROW, errorMessage } from "../util.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import { readCount } from "../cli/count.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import { displaySpace } from "./status/options.ts";
import { writeRpc } from "./daemon.ts";
import type { BackendSplit, BackendZoomMode } from "../types/backend.ts";
import type { PaneAction, PaneOutcome, ResultOf, TabAction } from "../daemon/client/protocol.ts";
import { readFleet } from "./fleet.ts";
import { resolveLifecycle, refuseForeignHolder, targetName } from "./resolve.ts";
import { refuseNonOperatorOverride, whoAmI, type CallerSelf } from "./self.ts";
import { sameSpace, spaceName } from "../shared/space.ts";
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

/** One tab verb, done by orchd on the caller's plexer. An answer is printed here and comes back null. */
async function tabVerb(services: Services, action: TabAction, steal: boolean, json: boolean): Promise<Exclude<ResultOf<"tab">, { kind: "answer" }> | null> {
  const outcome = await writeRpc(services, "tab", { action }, steal ? { steal } : {});
  if (outcome.kind !== "answer") return outcome;
  renderPaneAnswer(outcome, json);
  return null;
}

/** `orch tab list`. */
async function listTabs(services: Services, flags: ParsedFlags): Promise<void> {
  const all = flags.has("--all");
  const json = flags.has("--json");
  const listed = await tabVerb(services, { kind: "list", all }, false, json);
  if (listed?.kind !== "list") return;
  const tabs = listed.tabs;
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

async function cmdTabNew(services: Services, flags: ParsedFlags, json: boolean): Promise<void> {
  const created = await tabVerb(services, { kind: "new", label: flags.value("--label") ?? null, cwd: flags.value("--dir") ?? process.cwd(), space: flags.value("--space") ?? null }, false, json);
  if (created?.kind !== "created") return;
  if (json) process.stdout.write(JSON.stringify({ group: created.group, rootHandle: created.rootHandle }) + "\n");
  else process.stdout.write(`Created group "${created.group.label}".\n`);
}

/** Rename, close or focus a tab. A foreign-owned agent in it refuses without --steal. */
async function cmdTabAct(services: Services, action: Extract<TabAction, { kind: "rename" | "close" | "focus" }>, steal: boolean, json: boolean): Promise<void> {
  const done = await tabVerb(services, action, steal, json);
  if (done?.kind !== "done") return;
  const { tab } = done;
  switch (action.kind) {
    case "rename":
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, label: action.label, renamed: true }) + "\n");
      else process.stdout.write(`Renamed group "${tab.label}" ${ARROW} "${action.label}".\n`);
      return;
    case "close":
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, closed: true }) + "\n");
      else process.stdout.write(`Closed group "${tab.label}".\n`);
      return;
    case "focus":
      if (json) process.stdout.write(JSON.stringify({ tab: tab.id, focused: true }) + "\n");
      else process.stdout.write(`Focused group "${tab.label}".\n`);
      return;
    default: {
      const exhaustive: never = action;
      throw new Error(`unknown tab verb ${String(exhaustive)}`);
    }
  }
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
  switch (command.name) {
    case "list": await listTabs(services, flags); return;
    case "new": await cmdTabNew(services, flags, json); return;
    case "rename": await cmdTabAct(services, { kind: "rename", target: requiredWord(invocation, 0), label: requiredWord(invocation, 1) }, steal, json); return;
    case "close": await cmdTabAct(services, { kind: "close", target: requiredWord(invocation, 0) }, steal, json); return;
    case "focus": await cmdTabAct(services, { kind: "focus", target: requiredWord(invocation, 0) }, steal, json); return;
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
