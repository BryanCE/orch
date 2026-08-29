import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { orchDir } from "../presence/store.ts";
import { isLogLevel, isLogRecord, type LogLevel, type LogRecord } from "../log.ts";
import { die } from "./target.ts";

interface LogOptions { since?: number; level?: LogLevel; agent?: string; dispatch?: string; json: boolean; }

function parseOptions(args: string[]): LogOptions {
  const out: LogOptions = { json: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--json") out.json = true;
    else if (arg === "--since" || arg === "--level" || arg === "--agent" || arg === "--dispatch") {
      const value = args[++i];
      if (!value) die("usage: orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]");
      if (arg === "--since") {
        const parsed = Number(value);
        const when = Number.isFinite(parsed) ? parsed : Date.parse(value);
        if (!Number.isFinite(when)) die("invalid --since value");
        out.since = when;
      } else if (arg === "--level") {
        if (!isLogLevel(value)) die("invalid --level value");
        out.level = value;
      } else if (arg === "--agent") out.agent = value;
      else out.dispatch = value;
    } else if (arg.startsWith("--since=")) {
      const value = arg.slice(8); const parsed = Number(value); const when = Number.isFinite(parsed) ? parsed : Date.parse(value);
      if (!Number.isFinite(when)) die("invalid --since value"); out.since = when;
    } else if (arg.startsWith("--level=")) { const value = arg.slice(8); if (!isLogLevel(value)) die("invalid --level value"); out.level = value; }
    else if (arg.startsWith("--agent=")) out.agent = arg.slice(8);
    else if (arg.startsWith("--dispatch=")) out.dispatch = arg.slice(11);
    else die("usage: orch logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]");
  }
  return out;
}

function records(directory: string): LogRecord[] {
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
  const context = record.correlationId ? ` [${record.correlationId}]` : "";
  const fields = record.fields ? ` ${JSON.stringify(record.fields)}` : "";
  return `${new Date(record.at).toISOString()} ${record.level} ${record.event}${context}${fields}`;
}

export function cmdLogs(args: string[]): void {
  const options = parseOptions(args);
  const selected = records(orchDir()).filter((record) => matches(record, options));
  if (options.json) for (const record of selected) process.stdout.write(`${JSON.stringify(record)}\n`);
  else for (const record of selected) process.stdout.write(`${render(record)}\n`);
}
