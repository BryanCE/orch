// orchd ack transport for consumed inbox messages.
//
// At-least-once delivery: the daemon retries an unacked outbox row by
// re-appending the SAME message id, so track acked ids to apply each message
// once and ack once (never re-deliver, never double-append the marker).
//
// The daemon socket is the primary ack transport. The presence marker
// (ack.jsonl, written by presence.ts) remains the transport-neutral fallback
// consumed by a socket-less daemon.
import * as fs from "node:fs";
import * as path from "node:path";
import { readPortFile, requestJsonLine } from "../../src/presence/socket-client.ts";
import { isRecord } from "../../src/util.ts";

/** Ack transport + dedupe set handed to the inbox drain. */
export interface DaemonAck {
  /** Message id carried by a parsed inbox line, when it has one. */
  messageIdOf(parsed: unknown): string | undefined;
  isAcked(id: string): boolean;
  markAcked(id: string): void;
  /** Posts the ack to orchd; false means the caller should fall back to ack.jsonl. */
  post(id: string): Promise<boolean>;
}

export function createDaemonAck(orchDir: string): DaemonAck {
  const ackedMessageIds = new Set<string>();
  let nextAckRequestId = 1;

  function messageIdOf(parsed: unknown): string | undefined {
    if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id) return undefined;
    return parsed.id;
  }

  async function postDaemonAckTo(endpoint: string | number, id: string): Promise<boolean> {
    const requestId = `bridge-ack-${process.pid}-${nextAckRequestId++}`;
    const line = await requestJsonLine(endpoint, { id: requestId, method: "ack", params: { id } }, 500);
    if (line === undefined) return false;
    try {
      const response: unknown = JSON.parse(line);
      return isRecord(response) && response.id === requestId && !("error" in response);
    } catch {
      return false;
    }
  }

  async function postDaemonAck(id: string): Promise<boolean> {
    try {
      const socketPath = path.join(orchDir, "orchd.sock");
      if (fs.existsSync(socketPath) && await postDaemonAckTo(socketPath, id)) return true;
      const port = readPortFile(orchDir);
      return port === undefined ? false : await postDaemonAckTo(port, id);
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
    post: postDaemonAck,
  };
}
