// The running agent's orchd socket client: inbox acks and control outcomes.
//
// At-least-once delivery: the daemon retries an unacked outbox row by
// re-appending the SAME message id, so track acked ids to apply each message
// once and ack once (never re-deliver, never double-append the marker).
//
// The daemon socket is the primary ack transport. The presence marker
// (ack.jsonl, written by presence.ts) remains the transport-neutral fallback
// consumed by a socket-less daemon.
import * as fs from "node:fs";
import { daemonRuntimeFiles } from "../daemon/runtime-files.ts";
import { readPortFile, requestJsonLine } from "../presence/socket-client.ts";
import { isRecord } from "../util.ts";
import type { ControlOutcomeReport, DaemonClient } from "../types/agent.ts";

export function createDaemonClient(orchDir: string): DaemonClient {
  const ackedMessageIds = new Set<string>();
  let nextRequestId = 1;

  function messageIdOf(parsed: unknown): string | undefined {
    if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id) return undefined;
    return parsed.id;
  }

  async function postTo(endpoint: string | number, method: string, params: Record<string, unknown>): Promise<boolean> {
    const requestId = `bridge-${method}-${process.pid}-${nextRequestId++}`;
    const line = await requestJsonLine(endpoint, { id: requestId, method, params }, 500);
    if (line === undefined) return false;
    try {
      const response: unknown = JSON.parse(line);
      return isRecord(response) && response.id === requestId && !("error" in response);
    } catch {
      return false;
    }
  }

  async function post(method: string, params: Record<string, unknown>): Promise<boolean> {
    try {
      const socketPath = daemonRuntimeFiles(orchDir).socket;
      if (fs.existsSync(socketPath) && await postTo(socketPath, method, params)) return true;
      const port = readPortFile(orchDir);
      return port === undefined ? false : await postTo(port, method, params);
    } catch {
      return false;
    }
  }

  return {
    messageIdOf,
    isAcked: (id: string): boolean => ackedMessageIds.has(id),
    markAcked: (id: string): void => {
      ackedMessageIds.add(id);
    },
    postAck: (id: string): Promise<boolean> => post("ack", { id }),
    postControlOutcome: (report: ControlOutcomeReport): Promise<boolean> => post("control-outcome", { ...report }),
  };
}
