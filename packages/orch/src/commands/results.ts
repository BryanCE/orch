import { isAgentId } from "../backends/identity.ts";
import { resolveTarget } from "../entities/resolve.ts";
import { spaceOf } from "../policy/space.ts";
import { loadPresence } from "../presence/store.ts";
import { selfId } from "../identity/self.ts";
import { callerKind } from "../policy/caller.ts";
import { holdsLease } from "../store/lease-rows.ts";
import { collapse, isRecord, truncate } from "../util.ts";
import { renderTable } from "../table.ts";
import { runRemoteAsync, runSSH } from "../remote.ts";
import { rpcCall } from "../daemon/rpc/client.ts";
import { agentViewIndex, assertAgentOwned, die, forbidNonOperatorOverride, remoteCommandArgs, resultText, splitOptionFlags, targetHost } from "./target.ts";
import { entityAdapter } from "./status.ts";
import { latestRunForKey } from "./runs.ts";
import { selectRun } from "../store/run-rows.ts";
import type { AgentAdapter, SessionView, SessionViewEntry } from "../types/adapter.ts";
import type { AgentView } from "../types/store.ts";
import type { Entity, Logger, OrchDir } from "../types/core.ts";
import type { Services } from "../types/services.ts";
import type { PendingQuestionView } from "../types/daemon.ts";
import { CommandRefusal } from "../refusal.ts";

function resultLogger(logger: Logger, key?: string) {
  return key !== undefined && isAgentId(key) ? logger.forAgent(key) : logger;
}

interface QuestionRow { key: string; name: string | null; age: string; question: string; id?: string; ts?: string; space?: string; host?: string; warning?: string }

type ResultSource = "presence" | "dispatch" | "history" | "session";
type ResultLookup =
  | { readonly kind: "found"; readonly source: ResultSource; readonly payload: unknown }
  | { readonly kind: "missing"; readonly reason: string };

interface ResultOptions { json: boolean; force: boolean; targets: string[] }

function parseResultArgs(args: string[]): ResultOptions {
  const { enabled, positional } = splitOptionFlags(args, ["--json", "--force"]);
  return { json: enabled.has("--json"), force: enabled.has("--force"), targets: positional };
}

function adapterResultText(orchDir: OrchDir, ent: Entity, adapter: AgentAdapter): string | undefined {
  return adapter.extractResult({ sessionPath: ent.sessionPath ?? undefined }, orchDir);
}

function adapterSessionView(ent: Entity, adapter: AgentAdapter): SessionView | undefined {
  if (!adapter.sessionView) return undefined;
  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath ?? undefined });
}

function sessionViewValue(view: SessionView | undefined, key: keyof SessionView): unknown {
  return view?.[key] ?? null;
}

function adapterResultDocument(ent: Entity, adapter: AgentAdapter, text: string): unknown {
  const view = adapterSessionView(ent, adapter);
  return {
    text, task: sessionViewValue(view, "task"), model: sessionViewValue(view, "model"),
    thinking: sessionViewValue(view, "thinking"), tokens: sessionViewValue(view, "tokens"),
    cost: sessionViewValue(view, "cost"), turns: sessionViewValue(view, "turns"),
    sessionPath: ent.sessionPath,
  };
}

/** Resolve one target without writing output. Refusals become data for multi-target callers. */
function lookupResult(services: Services, target: string, force: boolean): ResultLookup {
  try {
    const settings = services.settings.current();
    const remote = targetHost(settings.hosts, target);
    if (remote) {
      forbidNonOperatorOverride(services.orchDir, "remote targets");
      const host = settings.hosts[remote.host];
      const destination = host?.dest;
      if (!host || !destination) die(`Host "${remote.host}" has no SSH destination.`);
      const result = runSSH(destination, remoteCommandArgs(host, "result", [remote.target, ...(force ? ["--force"] : []), "--json"]), { timeoutMs: host.timeout_ms });
      if (!result.ok) die(`Host "${remote.host}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
      let payload: unknown;
      try { payload = JSON.parse(result.stdout); } catch { payload = result.stdout.trimEnd(); }
      return { kind: "found", source: "presence", payload };
    }
    let ent: Entity;
    try {
      ent = resolveTarget(services.orchDir, settings, target);
    } catch (error: unknown) {
      if (!(error instanceof CommandRefusal)) throw error;
      if (callerKind(services.orchDir) === "operator" && !loadPresence(services.orchDir).has(target)) {
        const historical = latestRunForKey(services.orchDir, target);
        if (historical?.result !== undefined) {
          resultLogger(services.logger, target).info("result.history-fallback");
          return { kind: "found", source: "history", payload: historical.result };
        }
      }
      return { kind: "missing", reason: error.message };
    }
    assertAgentOwned(services.orchDir, target, ent, force);
    const dispatchId = ent.presence?.status?.dispatchId;
    if (dispatchId) {
      const run = selectRun(services.orchDir, dispatchId);
      if (run?.result === undefined) {
        die(`Dispatch ${dispatchId} has not settled (${run?.state ?? "unrecorded"}). Watch it with \`orch events\`, or read the task history with \`orch runs ${ent.key}\`.`);
      }
      resultLogger(services.logger, ent.key).info("result.current-dispatch", { dispatchId });
      return { kind: "found", source: "dispatch", payload: run.result };
    }
    if (ent.presence?.result) return { kind: "found", source: "presence", payload: ent.presence.result };
    const historical = latestRunForKey(services.orchDir, ent.key);
    if (historical?.result !== undefined) {
      resultLogger(services.logger, ent.key).info("result.history-fallback");
      return { kind: "found", source: "history", payload: historical.result };
    }
    const adapter = entityAdapter(ent, agentViewIndex(services.orchDir));
    const text = adapter ? adapterResultText(services.orchDir, ent, adapter) : undefined;
    if (adapter && text) {
      resultLogger(services.logger, ent.key).info("result.adapter-fallback");
      return { kind: "found", source: "session", payload: adapterResultDocument(ent, adapter, text) };
    }
    return { kind: "missing", reason: `No result available for "${target}" (no results.jsonl and no adapter-extractable session text).` };
  } catch (error: unknown) {
    if (error instanceof CommandRefusal) return { kind: "missing", reason: error.message };
    throw error;
  }
}

function humanResult(payload: unknown): string {
  return typeof payload === "string" ? payload : resultText(payload) ?? JSON.stringify(payload);
}

function printHumanBody(entry: { target: string; lookup: ResultLookup }): void {
  if (entry.lookup.kind === "missing") {
    process.stdout.write(`error: ${entry.lookup.reason}\n`);
    return;
  }
  if (entry.lookup.source === "history") process.stdout.write("(result from run history)\n");
  if (entry.lookup.source === "session") process.stdout.write("(no results.jsonl - falling back to adapter-extracted session text)\n");
  process.stdout.write(humanResult(entry.lookup.payload) + "\n");
}

function printResults(entries: readonly { target: string; lookup: ResultLookup }[], json: boolean): void {
  const missing = entries.some((entry) => entry.lookup.kind === "missing");
  if (json) {
    if (entries.length === 1 && entries[0]?.lookup.kind === "missing") throw new CommandRefusal(entries[0].lookup.reason);
    const output = entries.length === 1
      ? entries[0]?.lookup.kind === "found" ? entries[0].lookup.payload : undefined
      : entries.map((entry) => entry.lookup.kind === "found"
        ? { target: entry.target, source: entry.lookup.source, result: entry.lookup.payload }
        : { target: entry.target, error: entry.lookup.reason });
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  } else {
    if (entries.length === 1 && entries[0]?.lookup.kind === "missing") throw new CommandRefusal(entries[0].lookup.reason);
    for (const entry of entries) {
      if (entries.length > 1) process.stdout.write(`== ${entry.target}\n`);
      printHumanBody(entry);
    }
  }
  if (entries.length > 1 && missing) process.exitCode = 1;
}

export function cmdResult(services: Services, args: string[]): void {
  const options = parseResultArgs(args);
  if (options.targets.length === 0) die("usage: orch result <target>... [--force] [--json]");
  const entries = options.targets.map((target) => ({ target, lookup: lookupResult(services, target, options.force) }));
  printResults(entries, options.json);
}

export async function cmdQuestions(services: Services, args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  if (enabled.has("--all")) forbidNonOperatorOverride(services.orchDir, "--all");
  const json = enabled.has("--json");
  const localOnly = enabled.has("--local");
  const hosts = services.settings.current().hosts;
  if (localOnly || callerKind(services.orchDir) !== "operator" || Object.keys(hosts).length === 0) {
    await cmdQuestionsLocal(services.orchDir, args);
    return;
  }
  const rows: QuestionRow[] = [...await localQuestionRows(services.orchDir, args)];
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
    for (const value of result.value) if (isQuestionRow(value)) rows.push({ ...value, host: name });
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
  process.stdout.write(renderTable(["HOST", "ID", "NAME", "AGE", "QUESTION"], tableRows, [10, 24, 20, 8, 100]) + "\n");
}

interface PendingQuestion { view: PendingQuestionView }

function callerMaySeeQuestion(orchDir: OrchDir, agentId: string): boolean {
  if (callerKind(orchDir) === "operator") return true;
  const caller = selfId(orchDir);
  if (caller === undefined) return false;
  try {
    return holdsLease(orchDir, agentId, caller);
  } catch {
    return false;
  }
}

/** Read pending questions from orchd; the daemon owns their answerable state. */
async function collectPendingQuestions(orchDir: OrchDir, args: string[]): Promise<{ pending: PendingQuestion[] }> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const answer = await rpcCall(orchDir, "questions", { all: enabled.has("--all") });
  return {
    pending: answer.questions
      .filter((view) => callerMaySeeQuestion(orchDir, view.agentId))
      .map((view) => ({ view })),
  };
}

async function cmdQuestionsLocal(orchDir: OrchDir, args: string[]): Promise<void> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const all = enabled.has("--all");
  const { pending } = await collectPendingQuestions(orchDir, args);
  if (!pending.length) {
    if (enabled.has("--json")) process.stdout.write("[]\n");
    else process.stdout.write("No pending questions.\n");
    return;
  }
  if (enabled.has("--json")) {
    process.stdout.write(JSON.stringify(pending.map(({ view }) => ({
      key: view.key,
      name: view.name,
      age: formatAge(view.askedAt),
      id: view.questionId,
      question: view.question,
      ts: new Date(view.askedAt).toISOString(),
      space: spaceOf(orchDir, view.key) ?? "-",
    })), null, 2) + "\n");
    return;
  }
  const spaces = pending.map(({ view }) => spaceOf(orchDir, view.key) ?? "-");
  const showSpace = all && new Set(spaces).size > 1;
  process.stdout.write(
    pending
      .map(({ view }) => {
        const label = view.name ?? "-";
        const spaceLabel = spaceOf(orchDir, view.key) ?? "-";
        const name = showSpace ? `${spaceLabel} / ${label}` : label;
        return `${view.key}  ${name}  ${formatAge(view.askedAt)}\n${view.question}`;
      })
      .join("\n\n") + "\n"
  );
}

export function formatAge(ts: unknown): string {
  const when = typeof ts === "number"
    ? ts
    : new Date(typeof ts === "string" ? ts : JSON.stringify(ts) ?? "").getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

async function localQuestionRows(orchDir: OrchDir, args: string[]): Promise<QuestionRow[]> {
  const { pending } = await collectPendingQuestions(orchDir, args);
  return pending.map(({ view }) => ({
    key: view.key, name: view.name, age: formatAge(view.askedAt),
    question: view.question, id: view.questionId, ts: new Date(view.askedAt).toISOString(),
    space: spaceOf(orchDir, view.key) ?? "-",
  }));
}

function warningQuestionRow(host: string, warning: string): QuestionRow {
  return { key: `warning:${host}`, name: "WARNING", age: "-", question: warning, host, warning };
}

function isQuestionRow(value: unknown): value is QuestionRow {
  if (!isRecord(value)) return false;
  return typeof value.key === "string"
    && (value.name === null || typeof value.name === "string")
    && typeof value.age === "string"
    && typeof value.question === "string";
}

/** Resolve the target's adapter and require a declared session-tail capability, or die. */
function resolveSessionTailAdapter(views: ReadonlyMap<string, AgentView>, target: string, ent: Entity): AgentAdapter {
  const adapter = entityAdapter(ent, views);
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

export function cmdTail(services: Services, args: string[]) {
  const options = parseTailArgs(args);
  const target = options.target;
  if (!target) die("usage: orch tail <target> [-n N] [--json]");
  const ent = resolveTarget(services.orchDir, services.settings.current(), target);
  const adapter = resolveSessionTailAdapter(agentViewIndex(services.orchDir), target, ent);
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

export function cmdSession(services: Services, args: string[]) {
  const options = parseSessionArgs(args);
  const target = options.target;
  if (!target) die("usage: orch session <target> [--json]");
  const ent = resolveTarget(services.orchDir, services.settings.current(), target);
  if (!ent.sessionPath) die(`No session path known for "${target}".`);
  const adapter = resolveSessionTailAdapter(agentViewIndex(services.orchDir), target, ent);
  const view = adapter.sessionView?.readSessionView({ sessionPath: ent.sessionPath });
  if (options.json) writeSessionJson(ent, view);
  else writeSessionText(ent, view);
}

