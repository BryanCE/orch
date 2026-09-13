import { isAgentId } from "../backends/identity.ts";
import { collapse, resolveTarget, spaceOf } from "../entities.ts";
import { loadPresence } from "../presence/store.ts";
import { selfId } from "../identity/self.ts";
import { callerKind } from "../policy/caller.ts";
import { holdsLease } from "../store/lease-rows.ts";
import { isRecord, truncate } from "../util.ts";
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
import type { OrchSettings } from "../types/settings.ts";
import type { PendingQuestionView } from "../types/daemon.ts";

function resultLogger(logger: Logger, key?: string) {
  return key !== undefined && isAgentId(key) ? logger.forAgent(key) : logger;
}

interface QuestionRow { key: string; name: string | null; age: string; question: string; id?: string; ts?: string; space?: string; host?: string; warning?: string }

function writeHistoricalResult(logger: Logger, run: { result?: unknown }, json: boolean, key?: string): boolean {
  if (run.result === undefined) return false;
  resultLogger(logger, key).info("result.history-fallback");
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

function writeRemoteResult(orchDir: OrchDir, settings: OrchSettings, target: string, options: ResultOptions): boolean {
  const remote = targetHost(settings.hosts, target);
  if (!remote) return false;
  forbidNonOperatorOverride(orchDir, "remote targets");
  const host = settings.hosts[remote.host];
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

function writeAdapterJson(ent: Entity, adapter: AgentAdapter, text: string): void {
  const view = adapterSessionView(ent, adapter);
  process.stdout.write(JSON.stringify({
    text, task: sessionViewValue(view, "task"), model: sessionViewValue(view, "model"),
    thinking: sessionViewValue(view, "thinking"), tokens: sessionViewValue(view, "tokens"),
    cost: sessionViewValue(view, "cost"), turns: sessionViewValue(view, "turns"),
    sessionPath: ent.sessionPath,
  }, null, 2) + "\n");
}

function writeAdapterResult(orchDir: OrchDir, logger: Logger, ent: Entity, views: ReadonlyMap<string, AgentView>, json: boolean): boolean {
  const adapter = entityAdapter(ent, views);
  if (!adapter) return false;
  const text = adapterResultText(orchDir, ent, adapter);
  if (!text) return false;
  resultLogger(logger, ent.key).info("result.adapter-fallback");
  // Same rule: where the text came from is diagnosis, not the result.
  process.stdout.write("(no results.jsonl - falling back to adapter-extracted session text)\n");
  if (json) writeAdapterJson(ent, adapter, text);
  else process.stdout.write(text + "\n");
  return true;
}

/** The result of the dispatch the agent is on NOW, or a refusal naming its state.
 *  `results.jsonl` is append-only and survives a reset, so its newest line is the
 *  previous task's answer until the current one settles. The run row is bound to
 *  the dispatch id, so it can never hand back the wrong task. */
function writeCurrentDispatchResult(services: Pick<Services, "orchDir" | "logger">, dispatchId: string, key: string, json: boolean): void {
  const run = selectRun(services.orchDir, dispatchId);
  if (run?.result === undefined) {
    die(`Dispatch ${dispatchId} has not settled (${run?.state ?? "unrecorded"}). Watch it with \`orch events\`, or read the task history with \`orch runs ${key}\`.`);
  }
  resultLogger(services.logger, key).info("result.current-dispatch", { dispatchId });
  if (json) process.stdout.write(JSON.stringify(run.result, null, 2) + "\n");
  else process.stdout.write((typeof run.result === "string" ? run.result : resultText(run.result) ?? JSON.stringify(run.result)) + "\n");
}

function tryHistoricalTarget(orchDir: OrchDir, logger: Logger, target: string, json: boolean): boolean {
  if (loadPresence(orchDir).has(target)) return false;
  const historical = latestRunForKey(orchDir, target);
  return historical ? writeHistoricalResult(logger, historical, json, target) : false;
}

export function cmdResult(services: Services, args: string[]) {
  const options = parseResultArgs(args);
  const settings = services.settings.current();
  const target = options.target;
  if (!target) die("usage: orch result <target> [--force] [--json]");
  if (writeRemoteResult(services.orchDir, settings, target, options)) return;
  let ent: Entity;
  try {
    ent = resolveTarget(services.orchDir, settings, target);
  } catch (error: unknown) {
    // A reaped presence directory leaves no entity for resolveTarget. Only the
    // operator may use its exact canonical key to address durable run history;
    // a session must not learn whether a foreign key ever existed.
    if (callerKind(services.orchDir) === "operator" && tryHistoricalTarget(services.orchDir, services.logger, target, options.json)) return;
    throw error;
  }
  // Names are a flat namespace across every orchestrator, so an unscoped read
  // hands one session's work product to another as if it were its own.
  assertAgentOwned(services.orchDir, target, ent, options.force);
  const dispatchId = ent.presence?.status?.dispatchId;
  if (dispatchId) return writeCurrentDispatchResult(services, dispatchId, ent.key, options.json);
  if (writePresenceResult(ent.presence?.result, options.json)) return;
  const historical = latestRunForKey(services.orchDir, ent.key);
  if (historical && writeHistoricalResult(services.logger, historical, options.json, ent.key)) return;
  if (writeAdapterResult(services.orchDir, services.logger, ent, agentViewIndex(services.orchDir), options.json)) return;  die(`No result available for "${target}" (no results.jsonl and no adapter-extractable session text).`);
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

function isPendingQuestionView(value: unknown): value is PendingQuestionView {
  if (!isRecord(value)) return false;
  return typeof value.questionId === "string"
    && typeof value.agentId === "string"
    && typeof value.key === "string"
    && (typeof value.name === "string" || value.name === null)
    && typeof value.question === "string"
    && typeof value.askedAt === "number";
}

/** Read pending questions from orchd; the daemon owns their answerable state. */
async function collectPendingQuestions(orchDir: OrchDir, args: string[]): Promise<{ pending: PendingQuestion[] }> {
  const { enabled } = splitOptionFlags(args, ["--all", "--json", "--local"]);
  const answer = await rpcCall(orchDir, "questions", { all: enabled.has("--all") });
  if (!isRecord(answer) || !Array.isArray(answer.questions)) {
    throw new Error("Daemon returned an invalid questions payload.");
  }
  return {
    pending: answer.questions.filter(isPendingQuestionView)
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

