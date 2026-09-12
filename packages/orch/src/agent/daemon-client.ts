// The running agent's orchd socket client: the only channel by which a bundled
// harness asks orchd anything or reports anything. It knows no plexer and no store.
//
// At-least-once delivery: a lost ack costs one redelivery, not a lost message.
// The in-memory dedupe set applies each message id once.
import * as fs from "node:fs";
import { daemonRuntimeFiles } from "../daemon/runtime-files.ts";
import { isBridgeDelivery, type AgentNotice, type BridgeDelivery } from "../control/bridge-message.ts";
import {
  openJsonLineLink,
  readPortFile,
  requestJsonLine,
  type JsonLineLink,
} from "../presence/socket-client.ts";
import { loadSettingsOrNull } from "../settings/read.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { isRecord } from "../util.ts";
import type { ControlOutcomeReport, DaemonClient } from "../types/agent.ts";

export function createDaemonClient(orchDir: string): DaemonClient {
  const ackedMessageIds = new Set<string>();
  const pending = new Map<number, (result: unknown) => void>();
  let nextRequestId = 1;
  let link: JsonLineLink | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attachWanted = false;
  let attachedKey: string | undefined;
  let linkAttached = false;
  let reconnectMs: number = SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;

  function daemonEndpoints(): (string | number)[] {
    const socketPath = daemonRuntimeFiles(orchDir).socket;
    const endpoints: (string | number)[] = fs.existsSync(socketPath) ? [socketPath] : [];
    const port = readPortFile(orchDir);
    if (port !== undefined) endpoints.push(port);
    return endpoints;
  }

  async function answerFrom(endpoint: string | number, method: string, params: Record<string, unknown>): Promise<unknown> {
    const requestId = nextRequestId++;
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
      for (const endpoint of daemonEndpoints()) {
        const result = await answerFrom(endpoint, method, params);
        if (result !== undefined) return result;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  function resolvePending(id: unknown, result: unknown): void {
    if (typeof id !== "number") return;
    const resolve = pending.get(id);
    if (resolve === undefined) return;
    pending.delete(id);
    resolve(result);
  }

  function handleLine(line: string, onDelivery: (delivery: BridgeDelivery) => void): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }
    if (!isRecord(parsed)) return;
    if ("id" in parsed) {
      resolvePending(parsed.id, "error" in parsed ? undefined : parsed.result);
      return;
    }
    if (!isRecord(parsed.event) || parsed.event.kind !== "delivery" || !isBridgeDelivery(parsed.event)) return;
    onDelivery({ id: parsed.event.id, message: parsed.event.message });
  }

  function sendLinkRequest(method: string, params: Record<string, unknown>): Promise<unknown> | undefined {
    if (link === undefined) return undefined;
    const requestId = nextRequestId++;
    return new Promise((resolve) => {
      pending.set(requestId, resolve);
      if (!link?.send({ id: requestId, method, params })) {
        pending.delete(requestId);
        resolve(undefined);
      }
    });
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === undefined) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  function scheduleReconnect(onDelivery: (delivery: BridgeDelivery) => void): void {
    if (!attachWanted || reconnectTimer !== undefined) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      void dial(onDelivery);
    }, reconnectMs);
    reconnectTimer.unref?.();
  }

  async function dial(onDelivery: (delivery: BridgeDelivery) => void): Promise<void> {
    if (!attachWanted || link !== undefined || attachedKey === undefined) return;
    let connected: JsonLineLink | undefined;
    const endpoints = daemonEndpoints();
    for (const endpoint of endpoints) {
      connected = await openJsonLineLink(endpoint, {
        onLine: (line) => handleLine(line, onDelivery),
        onClose: () => {
          if (link !== connected) return;
          link = undefined;
          linkAttached = false;
          for (const resolve of pending.values()) resolve(undefined);
          pending.clear();
          scheduleReconnect(onDelivery);
        },
      });
      if (connected !== undefined) break;
    }
    if (connected === undefined || !attachWanted || attachedKey === undefined) {
      scheduleReconnect(onDelivery);
      return;
    }
    link = connected;
    linkAttached = false;
    const attachReply = sendLinkRequest("attach", { key: attachedKey });
    void attachReply?.then((result) => {
      if (link !== connected || !isRecord(result) || result.attached !== true) return;
      linkAttached = true;
    });
  }

  function attach(key: string, onDelivery: (delivery: BridgeDelivery) => void): void {
    detach();
    try {
      reconnectMs = loadSettingsOrNull(orchDir)?.daemon.bridge_reconnect_ms ?? SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    } catch {
      reconnectMs = SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    }
    attachWanted = true;
    attachedKey = key;
    void dial(onDelivery);
  }

  function detach(): void {
    attachWanted = false;
    attachedKey = undefined;
    linkAttached = false;
    clearReconnectTimer();
    const activeLink = link;
    link = undefined;
    for (const resolve of pending.values()) resolve(undefined);
    pending.clear();
    activeLink?.close();
  }

  const post = async (method: string, params: Record<string, unknown>): Promise<boolean> =>
    await ask(method, params) !== undefined;

  return {
    isAcked: (id: string): boolean => ackedMessageIds.has(id),
    markAcked: (id: string): void => {
      ackedMessageIds.add(id);
    },
    ask,
    attach,
    detach,
    attached: (): boolean => linkAttached,
    postAck: async (id: string): Promise<boolean> => {
      if (link?.send({ id: nextRequestId++, method: "ack", params: { id } }) === true) return true;
      return post("ack", { id });
    },
    postQuestion: async (notice: AgentNotice): Promise<void> => {
      if (link?.send({ id: nextRequestId++, method: "question", params: { ...notice } }) === true) return;
      await post("question", { ...notice });
    },
    postControlOutcome: (report: ControlOutcomeReport): Promise<boolean> => post("control-outcome", { ...report }),
  };
}
