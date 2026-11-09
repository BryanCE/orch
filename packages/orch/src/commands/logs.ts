import { isLogLevel, readLogRecords } from "../log.ts";
import { hostLine, readAgentThroughOrchd } from "./agent-read.ts";
import { parseCommand } from "./registry.ts";
import { resolveEntity } from "./resolve.ts";
import { durationInstant } from "../cli/duration.ts";
import { usageError } from "../cli/usage.ts";
import type { CommandAt } from "../cli/usage.ts";
import type { LogOptions } from "../types/command.ts";
import type { LogLevel, LogRecord } from "../types/core.ts";
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

function render(record: LogRecord): string {
  const correlation = record.correlationId ? ` [${record.correlationId}]` : "";
  const agent = record.agentId ? ` [agent=${record.agentId}]` : "";
  const fields = record.fields ? ` ${JSON.stringify(record.fields)}` : "";
  return `${new Date(record.at).toISOString()} ${record.level} ${record.event}${correlation}${agent}${fields}`;
}

/** The records asked for. About one agent, they are read by the orchd where that agent runs,
 *  which names its host when that is not this one; else they are this machine's own. */
async function selectedRecords(services: Services, options: LogOptions): Promise<{ readonly host: string | null; readonly records: readonly LogRecord[] }> {
  const { agent, since, level, dispatch } = options;
  const filter = { ...(since === undefined ? {} : { since }), ...(level === undefined ? {} : { level }), ...(dispatch === undefined ? {} : { dispatch }) };
  if (agent === undefined) return { host: null, records: readLogRecords(services.orchDir, filter) };
  const { entity } = await resolveEntity(services, agent);
  const { host, reading } = await readAgentThroughOrchd(services, entity.key, { kind: "log", ...filter });
  return { host, records: reading.records };
}

export async function cmdLogs(services: Services, args: string[]): Promise<void> {
  const options = parseLogOptions(args);
  const { host, records } = await selectedRecords(services, options);
  if (options.json) for (const record of records) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    process.stdout.write(hostLine(host));
    for (const record of records) process.stdout.write(`${render(record)}\n`);
  }
}
