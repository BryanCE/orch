import { existsSync, readFileSync } from "node:fs";
import { isLogLevel, isLogRecord, logFile } from "../log.ts";
import { parseCommand } from "./registry.ts";
import { askDaemon } from "./daemon.ts";
import { durationInstant } from "../cli/duration.ts";
import { usageError } from "../cli/usage.ts";
import type { CommandAt } from "../cli/usage.ts";
import type { LogOptions } from "../types/command.ts";
import type { LogLevel, LogRecord, OrchDir } from "../types/core.ts";
import type { Services } from "../types/services.ts";

function logLevel(invocation: CommandAt, value: string): LogLevel {
  if (!isLogLevel(value)) throw usageError(invocation, `invalid --level value "${value}"`);
  return value;
}

/** The options as typed; `agent` is still the target the caller named, not a minted id. */
export function parseLogOptions(args: string[], now = Date.now()): LogOptions {
  const invocation = parseCommand("logs", args);
  const { flags, positional } = invocation;
  if (positional.length > 0) throw usageError(invocation);
  const since = flags.value("--since");
  const level = flags.value("--level");
  const out: LogOptions = { json: flags.has("--json") };
  if (since !== undefined) out.since = durationInstant(since, now);
  if (level !== undefined) out.level = logLevel(invocation, level);
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

/** `--agent` names a target; the records carry the minted id orchd resolves it to. */
async function resolveLogAgent(services: Services, options: LogOptions): Promise<LogOptions> {
  if (options.agent === undefined) return options;
  const { id } = await askDaemon(services, "resolve-agent", { target: options.agent });
  return { ...options, agent: id };
}

export async function cmdLogs(services: Services, args: string[]): Promise<void> {
  const options = await resolveLogAgent(services, parseLogOptions(args));
  const selected = records(services.orchDir).filter((record) => matches(record, options));
  if (options.json) for (const record of selected) process.stdout.write(`${JSON.stringify(record)}\n`);
  else for (const record of selected) process.stdout.write(`${render(record)}\n`);
}
