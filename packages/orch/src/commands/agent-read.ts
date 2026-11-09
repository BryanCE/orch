// The CLI's one door to reading an agent: this machine's orchd reads it where it runs.
import { readRpc } from "./daemon.ts";
import { callerCredential } from "../identity/credential.ts";
import type { AgentRead, AgentReading } from "../types/agent-read.ts";
import type { DaemonClient } from "../types/services.ts";

function readingOf<K extends AgentRead["kind"]>(reading: AgentReading, kind: K): reading is Extract<AgentReading, { kind: K }> {
  return reading.kind === kind;
}

/** Ask this host's orchd to read an agent, wherever it runs: the reading, and the linked host
 *  it came from, null when the agent runs here. */
export async function readAgentThroughOrchd<K extends AgentRead["kind"]>(services: DaemonClient, key: string, read: Extract<AgentRead, { kind: K }>): Promise<{ readonly host: string | null; readonly reading: Extract<AgentReading, { kind: K }> }> {
  const answer = await readRpc(services, "agent-read", { caller: callerCredential(), key, read });
  const reading = answer.reading;
  if (!readingOf(reading, read.kind)) throw new Error(`orchd answered a ${read.kind} read of ${key} with a ${reading.kind}`);
  return { host: answer.host, reading };
}

/** The line that opens output read from an agent on another host. */
export function hostLine(host: string | null): string {
  return host === null ? "" : `from ${host}:\n`;
}

