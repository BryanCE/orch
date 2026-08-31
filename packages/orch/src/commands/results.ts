import * as path from "node:path";
import { loadConfig } from "../config.ts";
import { buildEntities, collapse, resolveTarget, scopeEntitiesToSpace, spaceOf } from "../entities.ts";
import { loadPresence, orchDir, readJSON } from "../presence/store.ts";
import { QUESTION_FILE } from "../presence/schema.ts";
import { isRecord, truncate } from "../util.ts";
import { renderTable } from "../table.ts";
import { runRemoteAsync, runSSH } from "../remote.ts";
import { assertAgentOwned, die, remoteCommandArgs, resultText, splitOptionFlags, targetHost } from "./target.ts";
import { entityAdapter } from "./status.ts";
import { latestRunForKey } from "./runs.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { commandLogger } from "./logging.ts";
import type { AgentAdapter, SessionView, SessionViewEntry } from "../types/adapter.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { Entity } from "../types/core.ts";

function resultLogger(key?: string) {
  const agentId = key ? tryParseIdentity(key)?.id : undefined;
  return agentId ? commandLogger().forAgent(agentId) : commandLogger();
}

interface QuestionRow { key: string; name: string | null; age: string; question: string; space?: string; host?: string; warning?: string }

interface QuestionPayload { ts?: unknown; question: string }

function writeHistoricalResult(run: { result?: unknown }, json: boolean, key?: string): boolean {
  if (run.result === undefined) return false;
  resultLogger(key).info("result.history-fallback");
  // Stdout carries what the human asked for — here, the result
  // text itself. A provenance notice on stdout corrupts `orch result … | …`.
  process.stdout.write("(result from run history)\n");
  if (json) {
    process.stdout.write(JSON.stringify(run.result, null, 2) + "\n");
    return true;
  }
  const text = typeof run.result === "string" ? run.result : resultText(run.result) ?? JSON.stringify(run.result);
  process.stdout.write((text ?? "") + "\n");
  return true;
}

interface ResultOptions { json: boolean; force: boolean; target?: string }

function parseResultArgs(args: string[]): ResultOptions {
  const { enabled, positional } = splitOptionFlags(args, ["--json", "--force"]);
  return { json: enabled.has("--json"), force: enabled.has("--force"), target: positional[0] };
}

function writeRemoteResult(target: string, options: ResultOptions): boolean {
  const remote = targetHost(target);
  if (!remote) return false;
  const host = loadConfig(orchDir()).hosts[remote.host];
  const destination = host?.dest;
  if (!host || !destination) die(`Host "${remote.host}" has no SSH destination.`);
  const result = runSSH(destination, remoteCommandArgs(host, "result", [remote.target, ...(options.force ? ["--force"] : []), ...(options.json ? ["--json"] : [])]), { timeoutMs: host.timeout_ms });
  if (!result.ok) die(`Host "${remote.host}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
  process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
  return true;
}

function writePresenceResult(result: unknown, json: boolean): boolean {
  if (!result) return false;
  if (json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write((resultText(result) ?? "") + "\n");
  return true;
}

function adapterResultText(ent: Entity, adapter: AgentAdapter): string | undefined {
  return adapter.extractResult({ sessionPath: ent.sessionPath ?? undefined });
}

function adapterSessionView(ent: Entity, adapter: AgentAdapter): SessionView | undefined {
  if (!adapter.sessionView) return undefined;
  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath ?? undefined });
}

function sessionViewValue(view: SessionView | undefined, key: keyof SessionView): unknown {
  return view?.[key] ?? null;
}

function writeAdapterJson(ent: Entity, adapter: AgentAdapter, text: string): void {
  const view = adapterSessionView(ent, adapter);
  process.stdout.write(JSON.stringify({
    text, task: sessionViewValue(view, "task"), model: sessionViewValue(view, "model"),
    thinking: sessionViewValue(view, "thinking"), tokens: sessionViewValue(view, "tokens"),
    cost: sessionViewValue(view, "cost"), turns: sessionViewValue(view, "turns"),
    sessionPath: ent.sessionPath,
  }, null, 2) + "\n");
}

function writeAdapterResult(ent: Entity, json: boolean): boolean {
  const adapter = entityAdapter(ent);
  if (!adapter) return false;
  const text = adapterResultText(ent, adapter);
  if (!text) return false;
  resultLogger(ent.key).info("result.adapter-fallback");
  // Same rule: where the text came from is diagnosis, not the result.
  process.stdout.write("(no result.json - falling back to adapter-extracted session text)\n");
  if (json) writeAdapterJson(ent, adapter, text);
  else process.stdout.write(text + "\n");
  return true;
}

function tryHistoricalTarget(target: string, json: boolean): boolean {
  if (loadPresence().has(target)) return false;
  const historical = latestRunForKey(target);
  return historical ? writeHistoricalResult(historical, json, target) : false;
}

export function cmdResult(args: string[]) {
  const options = parseResultArgs(args);
  const target = options.target;
  if (!target) die("usage: orch result <target> [--force] [--json]");
  if (writeRemoteResult(target, options)) return;
  // A reaped presence directory leaves no entity for resolveTarget. An exact
  // canonical key still addresses its durable run history, so use that only
  // when the live presence path is absent.
  if (tryHistoricalTarget(target, options.json)) return;
  const ent = resolveTarget(target);
  // Names are a flat namespace across every orchestrator, so an unscoped read
  // hands one session's work product to another as if it were its own.
  assertAgentOwned(target, ent, options.force);
  if (writePresenceResult(ent.presence?.result, options.json)) return;
  const historical = latestRunForKey(ent.key);
  if (historical && writeHistoricalResult(historical, options.json, ent.key)) return;
  if (writeAdapterResult(ent, options.json)) return;
  die(`No result available for "${target}" (no result.json and no adapter-extractable session text).`);
}

export async function cmdQuestions(args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const json = enabled.has("--json");
  const localOnly = enabled.has("--local");
  const hosts = loadConfig(orchDir()).hosts;
  if (localOnly || Object.keys(hosts).length === 0) {
    cmdQuestionsLocal(args);
    return;
  }
  const rows: QuestionRow[] = [...localQuestionRows(args)];
  const remoteResults = await Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["questions"], { timeoutMs: host.timeout_ms }),
  })));
  for (const { name, result } of remoteResults) {
    if (!result.ok) {
      rows.push(warningQuestionRow(name, result.failure.message));
      continue;
    }
    if (!Array.isArray(result.value)) {
      rows.push(warningQuestionRow(name, `Host "${name}" returned an invalid questions payload.`));
      continue;
    }
    for (const value of result.value) if (value && typeof value === "object") rows.push({ ...(value as QuestionRow), host: name });
  }
  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  if (!rows.length) {
    process.stdout.write("No pending questions.\n");
    return;
  }
  const tableRows = rows.map((row) => [row.host ?? "-", row.key, row.name ?? "-", row.age, row.question]);
  process.stdout.write(renderTable(["HOST", "PANE", "NAME", "AGE", "QUESTION"], tableRows, [10, 24, 20, 8, 100]) + "\n");
}

interface PendingQuestion { pres: PresenceEntry; question: QuestionPayload }

/**
 * The pending local questions (a scoped presence dir holding a valid
 * `question.json`) sorted by presence key, with the display-name map for the
 * scoped entities. The one collector behind both the `orch questions` local
 * table and the merged-with-remote row builder.
 */
function collectPendingQuestions(args: string[]): { pending: PendingQuestion[]; names: Map<string, string> } {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const all = enabled.has("--all");
  const scopedEntities = scopeEntitiesToSpace(buildEntities(), { all });
  const names = new Map<string, string>();
  const scopedKeys = new Set<string>();
  for (const ent of scopedEntities) {
    scopedKeys.add(ent.key);
    if (ent.presence) scopedKeys.add(ent.presence.key);
    if (ent.name) {
      names.set(ent.key, ent.name);
      if (ent.paneId) names.set(ent.paneId, ent.name);
      if (ent.presence) names.set(ent.presence.key, ent.name);
    }
  }
  // A dead agent's question can never be answered — its presence dir outlives the
  // process, so an unfiltered listing accumulates questions from panes closed
  // hours ago and a scripted answer loop steers targets that no longer exist.
  const pending = [...loadPresence().values()]
    .filter((pres) => pres.alive && (scopedKeys.has(pres.key) || all))
    .map((pres) => ({ pres, question: readJSON<unknown>(path.join(pres.dir, QUESTION_FILE)) }))
    .filter((entry): entry is PendingQuestion => isQuestionPayload(entry.question))
    .sort((a, b) => a.pres.key.localeCompare(b.pres.key));
  return { pending, names };
}

function cmdQuestionsLocal(args: string[]) {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const all = enabled.has("--all");
  const { pending, names } = collectPendingQuestions(args);
  if (!pending.length) {
    if (enabled.has("--json")) process.stdout.write("[]\n");
    else process.stdout.write("No pending questions.\n");
    return;
  }
  if (enabled.has("--json")) {
    process.stdout.write(JSON.stringify(pending.map(({ pres, question }) => ({
      key: pres.key,
      name: names.get(pres.key) ?? null,
      age: formatAge(question.ts),
      question: questionText(question),
      space: spaceOf(orchDir(), pres.key) ?? "-",
    })), null, 2) + "\n");
    return;
  }
  const spaces = pending.map(({ pres }) => spaceOf(orchDir(), pres.key) ?? "-");
  const showSpace = all && new Set(spaces).size > 1;
  process.stdout.write(
    pending
      .map(({ pres, question }) => {
        const label = names.get(pres.key) ?? "-";
        const spaceLabel = spaceOf(orchDir(), pres.key) ?? "-";
        const name = showSpace ? `${spaceLabel} / ${label}` : label;
        return `${pres.key}  ${name}  ${formatAge(question.ts)}\n${question.question}`;
      })
      .join("\n\n") + "\n"
  );
}

export function formatAge(ts: unknown): string {
  const when = new Date(typeof ts === "string" ? ts : JSON.stringify(ts) ?? "").getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function isQuestionPayload(value: unknown): value is QuestionPayload {
  return isRecord(value) && typeof value.question === "string";
}

export function questionText(value: unknown): string {
  return isRecord(value) && typeof value.question === "string" ? value.question : "";
}

function localQuestionRows(args: string[]): QuestionRow[] {
  const { pending, names } = collectPendingQuestions(args);
  return pending.map(({ pres, question }) => ({
    key: pres.key, name: names.get(pres.key) ?? null, age: formatAge(question.ts),
    question: questionText(question), space: spaceOf(orchDir(), pres.key) ?? "-",
  }));
}

function warningQuestionRow(host: string, warning: string): QuestionRow {
  return { key: `warning:${host}`, name: "WARNING", age: "-", question: warning, host, warning };
}

/** Resolve the target's adapter and require a declared session-tail capability, or die. */
function resolveSessionTailAdapter(target: string, ent: Entity): AgentAdapter {
  const adapter = entityAdapter(ent);
  if (!adapter?.sessionView) {
    die(`Target "${target}" (${adapter?.id ?? "unknown adapter"}) exposes no session tail; a session is read only through an adapter that declares one.`);
  }
  return adapter;
}

/** The model line for a session view: `provider/model:thinking`, or `fallback` when unknown. */
function formatViewModel(view: SessionView, fallback: string): string {
  if (!view.model) return fallback;
  return `${view.provider ? view.provider + "/" : ""}${view.model}${view.thinking ? ":" + view.thinking : ""}`;
}

/** Token totals line from a session view's opaque token record. */
function formatViewTokens(tokens: unknown): string {
  const count = (value: unknown): number => (typeof value === "number" ? value : 0);
  if (!isRecord(tokens)) return "in 0 / out 0 / cacheR 0 / cacheW 0";
  return `in ${count(tokens.input)} / out ${count(tokens.output)} / cacheR ${count(tokens.cacheRead)} / cacheW ${count(tokens.cacheWrite)}`;
}

/** The last assistant text of a session view, tailed to its final `lines` lines. */
function tailLastText(view: SessionView, lines: number): string {
  const text = view.lastText;
  if (!text) return "(no session text)";
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

/** The HH:MM:SS prefix for a turn timestamp, or blank padding when absent or invalid. */
function hms(timestamp: string | undefined): string {
  const when = timestamp ? new Date(timestamp) : null;
  if (!when || isNaN(when.getTime())) return "        ";
  return when.toTimeString().slice(0, 8);
}

/** Lay out one normalized session-view turn as a tail row, or undefined to skip a pure-thinking turn. */
function renderViewEntry(entry: SessionViewEntry): string | undefined {
  const time = hms(entry.timestamp);
  if (entry.role === "user") {
    const text = collapse(entry.text ?? "");
    return text ? `${time} user      | ${truncate(text, 200)}` : undefined;
  }
  if (entry.role === "assistant") {
    const text = collapse(entry.text ?? "");
    if (text) return `${time} assistant | ${truncate(text, 200)}`;
    if (entry.toolCalls?.length) {
      const calls = entry.toolCalls.map((call) => `${call.name}(${collapse(truncate(call.arg, 60))})`).join(", ");
      return `${time} assistant | [tools] ${calls}`;
    }
    return undefined;
  }
  const mark = entry.isError ? " [err]" : "";
  return `${time} tool      | ${entry.tool ?? "tool"}${mark} -> ${truncate(collapse(entry.text ?? ""), 120)}`;
}

/** The last-N rendered per-turn rows of a session view, or the "(no entries)" marker. */
function tailEntries(entries: readonly SessionViewEntry[], count: number): string {
  const rows = entries.map(renderViewEntry).filter((row): row is string => row !== undefined).slice(-count);
  return rows.length ? rows.join("\n") : "(no entries)";
}

interface TailOptions { target?: string; lines: number; json: boolean }

function parseTailArgs(args: string[]): TailOptions {
  let lines = 20;
  let json = false;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "-n") {
      const value = args[++i];
      lines = parseInt(value ?? "", 10) || 20;
    } else if (arg === "--json") json = true;
    else rest.push(arg);
  }
  return { target: rest[0], lines, json };
}

function viewEntriesTail(view: SessionView, lines: number): SessionViewEntry[] | null {
  return view.entries ? view.entries.slice(-lines) : null;
}

function writeTailJson(target: string, ent: Entity, view: SessionView, lines: number): void {
  process.stdout.write(JSON.stringify({
    target, sessionPath: ent.sessionPath, model: sessionViewValue(view, "model"),
    provider: sessionViewValue(view, "provider"), thinking: sessionViewValue(view, "thinking"),
    cost: sessionViewValue(view, "cost"), tokens: sessionViewValue(view, "tokens"),
    turns: sessionViewValue(view, "turns"), task: sessionViewValue(view, "task"),
    lastText: sessionViewValue(view, "lastText"), entries: viewEntriesTail(view, lines),
  }, null, 2) + "\n");
}

function writeTailText(ent: Entity, view: SessionView, lines: number): void {
  process.stdout.write(`session: ${ent.sessionPath}\nmodel: ${formatViewModel(view, "-")}   cost: $${(view.cost ?? 0).toFixed(4)}   turns: ${view.turns ?? 0}\n\n`);
  process.stdout.write((view.entries ? tailEntries(view.entries, lines) : tailLastText(view, lines)) + "\n");
}

export function cmdTail(args: string[]) {
  const options = parseTailArgs(args);
  const target = options.target;
  if (!target) die("usage: orch tail <target> [-n N] [--json]");
  const ent = resolveTarget(target);
  const adapter = resolveSessionTailAdapter(target, ent);
  const view = adapter.sessionView?.readSessionView({ sessionPath: ent.sessionPath ?? undefined });
  if (!view) die(`No session data for "${target}" (${ent.sessionPath ?? "unknown path"}).`);
  if (options.json) writeTailJson(target, ent, view, options.lines);
  else writeTailText(ent, view, options.lines);
}

interface SessionOptions { target?: string; json: boolean }

function parseSessionArgs(args: string[]): SessionOptions {
  return { json: args.includes("--json"), target: args.find((arg) => arg !== "--json") };
}

function writeSessionJson(ent: Entity, view: SessionView | undefined): void {
  const entries = view?.entries?.length ?? 0;
  process.stdout.write(JSON.stringify({
    path: ent.sessionPath, exists: view !== undefined, entries,
    turns: view?.turns ?? 0, cost: view?.cost ?? 0,
    tokens: sessionViewValue(view, "tokens"), model: sessionViewValue(view, "model"),
    provider: sessionViewValue(view, "provider"), thinking: sessionViewValue(view, "thinking"),
  }, null, 2) + "\n");
}

function writeSessionText(ent: Entity, view: SessionView | undefined): void {
  const entries = view?.entries?.length ?? 0;
  const lines = [
    `path:    ${ent.sessionPath}`, `exists:  ${view !== undefined}`, `entries: ${entries}`,
    `turns:   ${view?.turns ?? 0}`,
    `cost:    $${(view?.cost ?? 0).toFixed(4)}`,
    `tokens:  ${formatViewTokens(view?.tokens)}`,
    `model:   ${view ? formatViewModel(view, "(none)") : "(none)"}`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

export function cmdSession(args: string[]) {
  const options = parseSessionArgs(args);
  const target = options.target;
  if (!target) die("usage: orch session <target> [--json]");
  const ent = resolveTarget(target);
  if (!ent.sessionPath) die(`No session path known for "${target}".`);
  const adapter = resolveSessionTailAdapter(target, ent);
  const view = adapter.sessionView?.readSessionView({ sessionPath: ent.sessionPath });
  if (options.json) writeSessionJson(ent, view);
  else writeSessionText(ent, view);
}

