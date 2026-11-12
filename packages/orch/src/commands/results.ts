import { isRecord } from "../util.ts";
import { renderViewEntry } from "../shared/render-view-entry.ts";
import { die, resultText } from "./target.ts";
import { readRpc } from "./daemon.ts";
import { hostLine, readAgentThroughOrchd } from "./agent-read.ts";
import { callerCredential } from "../identity/credential.ts";
import { resolveEntity, resolveOwnedTarget, type ResolvedTarget } from "./resolve.ts";
import { refuseNonOperatorOverride, type CallerSelf, whoAmI } from "./self.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import type { Invocation } from "../cli/spec.ts";
import { sessionViewValue } from "../session-view.ts";
import type { SessionView, SessionViewEntry } from "../types/adapter.ts";
import type { ResultLookup } from "../types/agent-read.ts";
import type { Services } from "../types/services.ts";
import type { PendingQuestionView } from "../types/daemon.ts";
import { CommandRefusal } from "../refusal.ts";
import { writeEmptyOrJson } from "./panes.ts";
import { readCount } from "../cli/count.ts";
import { formatAge } from "../format.ts";

/** A result lookup, and the linked host it came from: null when the agent runs here. */
interface HostedResult {
  readonly host: string | null;
  readonly lookup: ResultLookup;
}

/** The agent's result, read by the orchd whose store holds it. */
async function readResult(services: Services, key: string): Promise<HostedResult> {
  const { host, reading } = await readAgentThroughOrchd(services, key, { kind: "result" });
  return { host, lookup: reading.lookup };
}

async function resolveResultTarget(services: Services, target: string): Promise<ResolvedTarget | HostedResult> {
  try {
    return await resolveEntity(services, target);
  } catch (error: unknown) {
    if (!(error instanceof CommandRefusal)) throw error;
    const { runs } = await readRpc(services, "runs", { caller: callerCredential(), target, limit: 1 }).catch(() => ({ runs: [] }));
    const historical = runs[0];
    if (historical?.result !== undefined) {
      services.logger.info("result.history-fallback", { target });
      return { host: null, lookup: { kind: "found", source: "history", payload: historical.result } };
    }
    return { host: null, lookup: { kind: "missing", reason: error.message } };
  }
}

async function lookupResultBody(services: Services, self: CallerSelf, target: string, steal: boolean): Promise<HostedResult> {
  const resolved = await resolveResultTarget(services, target);
  if ("lookup" in resolved) return resolved;
  await resolveOwnedTarget(services, self, target, { override: steal });
  return readResult(services, resolved.entity.key);
}

/** Resolve one target without writing output. Refusals become data for multi-target callers. */
async function lookupResult(services: Services, self: CallerSelf, target: string, steal: boolean): Promise<HostedResult> {
  try {
    return await lookupResultBody(services, self, target, steal);
  } catch (error: unknown) {
    if (error instanceof CommandRefusal) return { host: null, lookup: { kind: "missing", reason: error.message } };
    throw error;
  }
}

export function humanResult(payload: unknown): string {
  return typeof payload === "string" ? payload : resultText(payload) ?? JSON.stringify(payload);
}

interface ResultEntry extends HostedResult {
  readonly target: string;
}

function printHumanBody(entry: ResultEntry): void {
  const lookup = entry.lookup;
  if (lookup.kind === "missing") {
    process.stdout.write(`error: ${lookup.reason}\n`);
    return;
  }
  process.stdout.write(hostLine(entry.host));
  if (lookup.source === "history") process.stdout.write("(result from run history)\n");
  if (lookup.source === "session") process.stdout.write("(no reported result - read from the harness session)\n");
  process.stdout.write(humanResult(lookup.payload) + "\n");
}

function jsonEntry(entry: ResultEntry): unknown {
  return entry.lookup.kind === "found"
    ? { target: entry.target, host: entry.host, source: entry.lookup.source, result: entry.lookup.payload }
    : { target: entry.target, host: entry.host, error: entry.lookup.reason };
}

function printResults(entries: readonly ResultEntry[], json: boolean): void {
  const only = entries.length === 1 ? entries[0] : undefined;
  if (only?.lookup.kind === "missing") throw new CommandRefusal(only.lookup.reason);
  if (json) {
    process.stdout.write(JSON.stringify(entries.map(jsonEntry), null, 2) + "\n");
  } else {
    for (const entry of entries) {
      if (entries.length > 1) process.stdout.write(`== ${entry.target}\n`);
      printHumanBody(entry);
    }
  }
  if (entries.length > 1 && entries.some((entry) => entry.lookup.kind === "missing")) process.exitCode = 1;
}

export async function cmdResult(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("result", args);
  const { flags, positional } = invocation;
  if (positional.length === 0) throw usageError(invocation);
  const steal = flags.has("--steal");
  const self = await whoAmI(services);
  const entries = await Promise.all(positional.map(async (target): Promise<ResultEntry> => ({ target, ...await lookupResult(services, self, target, steal) })));
  printResults(entries, flags.has("--json"));
}

interface QuestionOptions { readonly all: boolean; readonly json: boolean }

export async function cmdQuestions(services: Services, args: string[]): Promise<void> {
  const { flags } = parseCommand("questions", args);
  const options: QuestionOptions = { all: flags.has("--all"), json: flags.has("--json") };
  const self = await whoAmI(services);
  if (options.all) refuseNonOperatorOverride(self, "--all");
  await writeQuestions(services, options);
}

interface PendingQuestion { view: PendingQuestionView }

/** Read pending questions from orchd; the daemon owns their answerable state. */
async function collectPendingQuestions(services: Services, all: boolean): Promise<{ pending: PendingQuestion[] }> {
  const answer = await readRpc(services, "questions", { caller: callerCredential(), all });
  return { pending: answer.questions.map((view) => ({ view })) };
}

async function writeQuestions(services: Services, { all, json }: QuestionOptions): Promise<void> {
  const { pending } = await collectPendingQuestions(services, all);
  const rows = pending.map(({ view }) => ({
    key: view.key,
    name: view.name,
    age: formatAge(view.askedAt),
    id: view.questionId,
    question: view.question,
    options: view.options,
    ts: new Date(view.askedAt).toISOString(),
    space: view.space ?? "-",
  }));
  if (writeEmptyOrJson(pending, json, "No pending questions.", rows)) return;
  const spaces = pending.map(({ view }) => view.space ?? "-");
  const showSpace = all && new Set(spaces).size > 1;
  process.stdout.write(
    pending
      .map(({ view }) => {
        const label = view.name ?? "-";
        const spaceLabel = view.space ?? "-";
        const name = showSpace ? `${spaceLabel} / ${label}` : label;
        return [`${name}  ${formatAge(view.askedAt)}\n${view.question}`, ...view.options.map((option, index) => `  ${index + 1}. ${option.label}`)].join("\n");
      })
      .join("\n\n") + "\n"
  );
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

/** The last-N rendered per-turn rows of a session view, or the "(no entries)" marker. */
function tailEntries(entries: readonly SessionViewEntry[], count: number): string {
  const rows = entries.map(renderViewEntry).filter((row): row is string => row !== undefined).slice(-count);
  return rows.length ? rows.join("\n") : "(no entries)";
}

/** The agent's session tail, read by the orchd whose store holds it. Refuses when there is none. */
async function readTail(services: Services, key: string, lines: number): Promise<{ readonly host: string | null; readonly sessionPath: string | null; readonly view: SessionView }> {
  const { host, reading } = await readAgentThroughOrchd(services, key, { kind: "tail", lines });
  const lookup = reading.lookup;
  if (lookup.kind === "missing") die(lookup.reason);
  return { host, sessionPath: lookup.sessionPath, view: lookup.view };
}

function writeTailJson(target: string, host: string | null, sessionPath: string | null, view: SessionView): void {
  process.stdout.write(JSON.stringify({
    target, host, sessionPath, model: sessionViewValue(view, "model"),
    provider: sessionViewValue(view, "provider"), thinking: sessionViewValue(view, "thinking"),
    cost: sessionViewValue(view, "cost"), tokens: sessionViewValue(view, "tokens"),
    turns: sessionViewValue(view, "turns"), task: sessionViewValue(view, "task"),
    lastText: sessionViewValue(view, "lastText"), entries: view.entries ?? null,
  }, null, 2) + "\n");
}

function writeTailText(host: string | null, sessionPath: string | null, view: SessionView, lines: number): void {
  process.stdout.write(`${hostLine(host)}session: ${sessionPath}\nmodel: ${formatViewModel(view, "-")}   cost: $${(view.cost ?? 0).toFixed(4)}   turns: ${view.turns ?? 0}\n\n`);
  process.stdout.write((view.entries ? tailEntries(view.entries, lines) : tailLastText(view, lines)) + "\n");
}

export async function cmdTail(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("tail", args);
  const { flags } = invocation;
  const target = requireSessionTarget(invocation);
  const lines = readCount(invocation) ?? services.settings.current().counts.tail;
  const resolved = await resolveEntity(services, target);
  const { host, sessionPath, view } = await readTail(services, resolved.entity.key, lines);
  if (flags.has("--json")) writeTailJson(target, host, sessionPath, view);
  else writeTailText(host, sessionPath, view, lines);
}

function requireSessionTarget(invocation: Invocation): string {
  const target = invocation.positional[0];
  if (!target) throw usageError(invocation);
  return target;
}

function writeSessionJson(host: string | null, sessionPath: string, view: SessionView | null): void {
  const entries = view?.entries?.length ?? 0;
  process.stdout.write(JSON.stringify({
    host, path: sessionPath, exists: view !== null, entries,
    turns: view?.turns ?? 0, cost: view?.cost ?? 0,
    tokens: sessionViewValue(view, "tokens"), model: sessionViewValue(view, "model"),
    provider: sessionViewValue(view, "provider"), thinking: sessionViewValue(view, "thinking"),
  }, null, 2) + "\n");
}

function writeSessionText(host: string | null, sessionPath: string, view: SessionView | null): void {
  const entries = view?.entries?.length ?? 0;
  const lines = [
    `path:    ${sessionPath}`, `exists:  ${view !== null}`, `entries: ${entries}`,
    `turns:   ${view?.turns ?? 0}`,
    `cost:    $${(view?.cost ?? 0).toFixed(4)}`,
    `tokens:  ${formatViewTokens(view?.tokens)}`,
    `model:   ${view ? formatViewModel(view, "(none)") : "(none)"}`,
  ];
  process.stdout.write(hostLine(host) + lines.join("\n") + "\n");
}

export async function cmdSession(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("session", args);
  const { flags } = invocation;
  const target = requireSessionTarget(invocation);
  const resolved = await resolveEntity(services, target);
  const { host, reading } = await readAgentThroughOrchd(services, resolved.entity.key, { kind: "session" });
  const lookup = reading.lookup;
  if (lookup.kind === "missing") die(lookup.reason);
  if (flags.has("--json")) writeSessionJson(host, lookup.sessionPath, lookup.view);
  else writeSessionText(host, lookup.sessionPath, lookup.view);
}
