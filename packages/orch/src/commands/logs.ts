import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isLogLevel, isLogRecord } from "../log.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { LogOptions } from "../types/command.ts";
import type { LogLevel, LogRecord, OrchDir } from "../types/core.ts";
import type { Services } from "../types/services.ts";

/** Epoch milliseconds as typed, else a parsed date/time. */
function sinceInstant(value: string): number {
  const millis = Number(value);
  const when = Number.isFinite(millis) ? millis : Date.parse(value);
  if (!Number.isFinite(when)) die("invalid --since value");
  return when;
}

function logLevel(value: string): LogLevel {
  if (!isLogLevel(value)) die("invalid --level value");
  return value;
}

export function parseLogOptions(args: string[]): LogOptions {
  const { flags, positional } = parseCommand("logs", args);
  if (positional.length > 0) die("usage: orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]");
  const since = flags.value("--since");
  const level = flags.value("--level");
  const out: LogOptions = { json: flags.has("--json") };
  if (since !== undefined) out.since = sinceInstant(since);
  if (level !== undefined) out.level = logLevel(level);
  const agent = flags.value("--agent");
  if (agent !== undefined) out.agent = agent;
  const dispatch = flags.value("--dispatch");
  if (dispatch !== undefined) out.dispatch = dispatch;
  return out;
}

function records(directory: OrchDir): LogRecord[] {
  const result: LogRecord[] = [];
  for (const name of ["orch.log", "orchd.log"]) {
    const file = join(directory, name);
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
