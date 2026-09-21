import { existsSync, readFileSync } from "node:fs";
import { isLogLevel, isLogRecord, logFile } from "../log.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { LogOptions } from "../types/command.ts";
import type { LogLevel, LogRecord, OrchDir } from "../types/core.ts";
import type { Services } from "../types/services.ts";

const SINCE_FORMS = "epoch milliseconds, a date/time, or an age like 30s, 10m, 2h, 1d";
type AgeUnit = "s" | "m" | "h" | "d";
const AGE_UNIT_MS: Record<AgeUnit, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

function isAgeUnit(value: string): value is AgeUnit {
  return value === "s" || value === "m" || value === "h" || value === "d";
}

/** The instant an age like `10m` names, counted back from now; null when the value is no age. */
function ageInstant(value: string, now: number): number | null {
  const age = /^(?<count>\d+)(?<unit>[smhd])$/.exec(value)?.groups;
  if (age?.count === undefined || age.unit === undefined || !isAgeUnit(age.unit)) return null;
  return now - Number(age.count) * AGE_UNIT_MS[age.unit];
}

/** Epoch milliseconds as typed, an age counted back from now, else a parsed date/time. */
function sinceInstant(value: string, now: number): number {
  const millis = Number(value);
  const when = Number.isFinite(millis) ? millis : ageInstant(value, now) ?? Date.parse(value);
  if (!Number.isFinite(when)) die(`invalid --since value "${value}": expected ${SINCE_FORMS}`);
  return when;
}

function logLevel(value: string): LogLevel {
  if (!isLogLevel(value)) die("invalid --level value");
  return value;
}

export function parseLogOptions(args: string[], now = Date.now()): LogOptions {
  const { flags, positional } = parseCommand("logs", args);
  if (positional.length > 0) die("usage: orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]");
  const since = flags.value("--since");
  const level = flags.value("--level");
  const out: LogOptions = { json: flags.has("--json") };
  if (since !== undefined) out.since = sinceInstant(since, now);
  if (level !== undefined) out.level = logLevel(level);
  const agent = flags.value("--agent");
  if (agent !== undefined) out.agent = agent;
  const dispatch = flags.value("--dispatch");
  if (dispatch !== undefined) out.dispatch = dispatch;
  return out;
}

function records(directory: OrchDir): LogRecord[] {
  const result: LogRecord[] = [];
  for (const file of [logFile(directory)]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const value: unknown = JSON.parse(line); if (isLogRecord(value)) result.push(value); } catch { /* malformed lines are skipped */ }
    }
  }
  return result.sort((a, b) => a.at - b.at);
}

function matches(record: LogRecord, options: LogOptions): boolean {
  if (options.since !== undefined && record.at < options.since) return false;
  if (options.level !== undefined && record.level !== options.level) return false;
  if (options.agent !== undefined && record.agentId !== options.agent) return false;
  if (options.dispatch !== undefined && record.correlationId !== options.dispatch) return false;
  return true;
}

function render(record: LogRecord): string {
  const correlation = record.correlationId ? ` [${record.correlationId}]` : "";
  const agent = record.agentId ? ` [agent=${record.agentId}]` : "";
  const fields = record.fields ? ` ${JSON.stringify(record.fields)}` : "";
  return `${new Date(record.at).toISOString()} ${record.level} ${record.event}${correlation}${agent}${fields}`;
}

export function cmdLogs(services: Services, args: string[]): void {
  const options = parseLogOptions(args);
  const selected = records(services.orchDir).filter((record) => matches(record, options));
  if (options.json) for (const record of selected) process.stdout.write(`${JSON.stringify(record)}\n`);
  else for (const record of selected) process.stdout.write(`${render(record)}\n`);
}
