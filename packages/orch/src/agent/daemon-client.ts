import type { OrchDir } from "../types/core.ts";
// The running agent's orchd socket client: the only channel by which a bundled
// harness asks orchd anything or reports anything. It knows no plexer and no store.
//
// At-least-once delivery: a lost ack costs one redelivery, not a lost message.
// The in-memory dedupe set applies each message id once.
import * as fs from "node:fs";
import { daemonRuntimeFiles } from "../daemon/client/runtime-files.ts";
import { type AgentNotice, type BridgeDelivery } from "../control/bridge-message.ts";
import {
  openJsonLineLink,
  readPortFile,
  requestJsonLine,
  type JsonLineLink,
} from "../presence/socket-client.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import type { ControlOutcomeReport, DaemonClient } from "../types/agent.ts";
import type { ResultReport, StatusPatch } from "../types/presence.ts";
import { daemonResult, type ParamsOf, type ResultOf, type RpcMethod } from "../daemon/client/protocol.ts";
import { parseRpcLine } from "../daemon/client/wire.ts";
import type { SettingsManager } from "../types/services.ts";

export function createDaemonClient(orchDir: OrchDir, settings: SettingsManager): DaemonClient {
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

  async function answerFrom<M extends RpcMethod>(endpoint: string | number, method: M, params: ParamsOf<M>): Promise<ResultOf<M> | undefined> {
    const requestId = nextRequestId++;
    const line = await requestJsonLine(endpoint, { id: requestId, method, params }, settings.current().daemon.report_timeout_ms);
    if (line === undefined) return undefined;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      return undefined;
    }
    const response = parseRpcLine(value);
    if (response?.kind !== "reply" || response.id !== requestId) return undefined;
    return daemonResult(method, response.result);
  }

  async function ask<M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<ResultOf<M> | undefined> {
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
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      return;
    }
    const parsed = parseRpcLine(value);
    if (parsed === null) return;
    switch (parsed.kind) {
      case "reply":
        resolvePending(parsed.id, parsed.result);
        return;
      case "error":
        resolvePending(parsed.id, undefined);
        return;
      case "delivery":
        onDelivery(parsed.delivery);
        return;
      case "event":
      case "gap":
        return;
    }
  }

  function sendLinkRequest<M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<ResultOf<M> | undefined> | undefined {
    if (link === undefined) return undefined;
    const requestId = nextRequestId++;
    return new Promise((resolve) => {
      pending.set(requestId, resolve);
      if (!link?.send({ id: requestId, method, params })) {
        pending.delete(requestId);
        resolve(undefined);
      }
    }).then((result) => result === undefined ? undefined : daemonResult(method, result));
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === undefined) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  function scheduleReconnect(onDelivery: (delivery: BridgeDelivery) => void): void {
    if (!attachWanted || reconnectTimer !== undefined) return;
    try {
      reconnectMs = settings.currentOrNull()?.daemon.bridge_reconnect_ms ?? SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    } catch {
      reconnectMs = SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    }
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
      if (link !== connected || result === undefined) return;
      linkAttached = true;
    });
  }

  function attach(key: string, onDelivery: (delivery: BridgeDelivery) => void): void {
    detach();
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

  const post = async <M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<boolean> =>
    await ask(method, params) !== undefined;

  const postOnLinkOrAsk = async <M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<boolean> => {
    if (link?.send({ id: nextRequestId++, method, params }) === true) return true;
    return post(method, params);
  };

  return {
    isAcked: (id: string): boolean => ackedMessageIds.has(id),
    markAcked: (id: string): void => {
      ackedMessageIds.add(id);
    },
    ask,
    attach,
    detach,
    attached: (): boolean => linkAttached,
    postAck: async (id: string): Promise<boolean> => postOnLinkOrAsk("ack", { id }),
    postQuestion: async (notice: AgentNotice): Promise<void> => {
      if (link?.send({ id: nextRequestId++, method: "question", params: notice }) === true) return;
      await post("question", notice);
    },
    postControlOutcome: (report: ControlOutcomeReport): Promise<boolean> => post("control-outcome", report),
    reportStatus: (key: string, patch: StatusPatch): Promise<boolean> =>
      postOnLinkOrAsk("report-status", {
        key,
        status: {
          ...patch,
          filesTouched: patch.filesTouched === null || patch.filesTouched === undefined
            ? patch.filesTouched
            : [...patch.filesTouched],
        },
      }),
    reportResult: (key: string, result: ResultReport): Promise<boolean> =>
      postOnLinkOrAsk("report-result", { key, result }),
  };
}
