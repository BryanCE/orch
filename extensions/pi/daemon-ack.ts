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
import { createConnection } from "node:net";
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

  function daemonAckEndpoint(): string | number | undefined {
    const portFile = path.join(orchDir, "orchd.port");
    try {
      const text = fs.readFileSync(portFile, "utf8").trim();
      try {
        const parsed: unknown = JSON.parse(text);
        const port = typeof parsed === "number" ? parsed
          : isRecord(parsed) ? parsed.port : undefined;
        if (typeof port === "number" && Number.isInteger(port) && port > 0 && port < 65536) return port;
      } catch {
        const port = Number(text);
        if (Number.isInteger(port) && port > 0 && port < 65536) return port;
      }
    } catch {
      // The unix socket is the normal endpoint.
    }
    return undefined;
  }

  function postDaemonAckTo(endpoint: string | number, id: string): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = `bridge-ack-${process.pid}-${nextAckRequestId++}`;
      const socket = typeof endpoint === "string"
        ? createConnection(endpoint)
        : createConnection({ host: "127.0.0.1", port: endpoint });
      let settled = false;
      let buffer = "";
      const finish = (success: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve(success);
      };
      const timeout = setTimeout(() => finish(false), 500);
      timeout.unref?.();
      socket.setEncoding("utf8");
      socket.on("error", () => finish(false));
      socket.on("connect", () => {
        socket.write(`${JSON.stringify({ id: requestId, method: "ack", params: { id } })}\n`);
      });
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        try {
          const response: unknown = JSON.parse(buffer.slice(0, newline));
          if (isRecord(response) && response.id === requestId) {
            finish(!("error" in response));
          }
        } catch {
          finish(false);
        }
      });
    });
  }

  async function postDaemonAck(id: string): Promise<boolean> {
    try {
      const socketPath = path.join(orchDir, "orchd.sock");
      if (fs.existsSync(socketPath) && await postDaemonAckTo(socketPath, id)) return true;
      const port = daemonAckEndpoint();
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
