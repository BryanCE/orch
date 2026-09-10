// The running agent's orchd socket client: the only channel by which a bundled
// harness asks orchd anything or reports anything. It knows no plexer and no store.
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

  async function answerFrom(endpoint: string | number, method: string, params: Record<string, unknown>): Promise<unknown> {
    const requestId = `bridge-${method}-${process.pid}-${nextRequestId++}`;
    const line = await requestJsonLine(endpoint, { id: requestId, method, params }, 500);
    if (line === undefined) return undefined;
    try {
      const response: unknown = JSON.parse(line);
      if (!isRecord(response) || response.id !== requestId || "error" in response) return undefined;
      return response.result;
    } catch {
      return undefined;
    }
  }

  async function ask(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    try {
      const socketPath = daemonRuntimeFiles(orchDir).socket;
      if (fs.existsSync(socketPath)) {
        const overSocket = await answerFrom(socketPath, method, params);
        if (overSocket !== undefined) return overSocket;
      }
      const port = readPortFile(orchDir);
      return port === undefined ? undefined : await answerFrom(port, method, params);
    } catch {
      return undefined;
    }
  }

  const post = async (method: string, params: Record<string, unknown>): Promise<boolean> =>
    await ask(method, params) !== undefined;

  return {
    messageIdOf,
    isAcked: (id: string): boolean => ackedMessageIds.has(id),
    markAcked: (id: string): void => {
      ackedMessageIds.add(id);
    },
    ask,
    postAck: (id: string): Promise<boolean> => post("ack", { id }),
    postControlOutcome: (report: ControlOutcomeReport): Promise<boolean> => post("control-outcome", { ...report }),
  };
}
