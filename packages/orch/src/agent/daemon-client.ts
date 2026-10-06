import type { OrchDir } from "../types/core.ts";
import { launchCredential } from "../identity/launch.ts";
import { nonEmpty, sessionClaim } from "../daemon/client/registration.ts";
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
import type { ControlOutcomeReport, DaemonLink } from "../types/agent.ts";
import type { ResultReport, StatusPatch } from "../types/presence.ts";
import { daemonResult, type ParamsOf, type ResultOf, type RpcErrorCode, type RpcMethod } from "../daemon/client/protocol.ts";
import { parseRpcLine } from "../daemon/client/wire.ts";
import type { SettingsManager } from "../types/services.ts";

/** What one request on the bridge link came back with: orchd's reply, or its refusal code (none when the link dropped). */
type LinkAnswer = { readonly result: unknown } | { readonly refused: RpcErrorCode | undefined };

const NO_ANSWER: LinkAnswer = { refused: undefined };

export function createDaemonLink(orchDir: OrchDir, settings: SettingsManager): DaemonLink {
  const ackedMessageIds = new Set<string>();

  const pending = new Map<number, (answer: LinkAnswer) => void>();
  let nextRequestId = 1;
  let link: JsonLineLink | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attachWanted = false;
  let attachedKey: string | undefined;
  let onUnknownKey: (() => void) | undefined;
  let launchClaim: ParamsOf<"claim-identity"> | undefined;
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

  async function identify(harness: string, sessionToken?: string): Promise<string | undefined> {
    const token = nonEmpty(sessionToken);
    try {
      const credential = launchCredential();
      // The bridge runs inside the harness, so this process IS the session's process.
      const session = { harness, sessionToken: token, pid: process.pid };
      if (credential === null) return (await ask("register-session", sessionClaim(orchDir, undefined, session)))?.id;
      // Spawn registers the row after the launch, so the claim waits for an attach to prove the row exists.
      if (token !== undefined) launchClaim = { ...sessionClaim(orchDir, undefined, session), id: credential, sessionToken: token };
      return credential;
    } catch {
      return undefined;
    }
  }

  function resolvePending(id: unknown, answer: LinkAnswer): void {
    if (typeof id !== "number") return;
    const resolve = pending.get(id);
    if (resolve === undefined) return;
    pending.delete(id);
    resolve(answer);
  }

  function abandonPending(): void {
    for (const resolve of pending.values()) resolve(NO_ANSWER);
    pending.clear();
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
        resolvePending(parsed.id, { result: parsed.result });
        return;
      case "error":
        resolvePending(parsed.id, { refused: parsed.error.code });
        return;
      case "delivery":
        onDelivery(parsed.delivery);
        return;
      case "event":
      case "gap":
        return;
    }
  }

  function requestOnLink<M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<LinkAnswer> {
    const requestId = nextRequestId++;
    return new Promise((resolve) => {
      pending.set(requestId, resolve);
      if (!link?.send({ id: requestId, method, params })) {
        pending.delete(requestId);
        resolve(NO_ANSWER);
      }
    });
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === undefined) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  function scheduleRetry(retry: () => void): void {
    if (!attachWanted || reconnectTimer !== undefined) return;
    try {
      reconnectMs = settings.currentOrNull()?.daemon.bridge_reconnect_ms ?? SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    } catch {
      reconnectMs = SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      retry();
    }, reconnectMs);
    reconnectTimer.unref?.();
  }

  function scheduleReconnect(onDelivery: (delivery: BridgeDelivery) => void): void {
    scheduleRetry(() => void dial(onDelivery));
  }

  // orchd refuses an attach for a key it does not know. A spawned harness can start
  // before spawn's register-agent lands, so it re-sends the attach on the same link.
  // A caller that passed `onUnknownKey` lost its row to a store reset: it identifies again.
  function sendAttach(connected: JsonLineLink): void {
    if (link !== connected || attachedKey === undefined) return;
    linkAttached = false;
    void requestOnLink("attach", { key: attachedKey }).then((answer) => {
      if (link !== connected) return;
      if ("result" in answer && daemonResult("attach", answer.result) !== undefined) {
        linkAttached = true;
        sendLaunchClaim(connected);
        return;
      }
      const forget = onUnknownKey;
      if ("refused" in answer && answer.refused === "UNKNOWN_AGENT" && forget !== undefined) {
        forget();
        return;
      }
      scheduleRetry(() => sendAttach(connected));
    });
  }

  /** Stamp this session on the spawned row. A refusal means another process holds the id, so this one lets go. */
  function sendLaunchClaim(connected: JsonLineLink): void {
    if (launchClaim === undefined) return;
    void requestOnLink("claim-identity", launchClaim).then((answer) => {
      if (link === connected && "refused" in answer && answer.refused !== undefined) detach();
    });
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
          abandonPending();
          // A pending attach retry belongs to the dead link; the reconnect replaces it.
          clearReconnectTimer();
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
    sendAttach(connected);
  }

  function attach(key: string, onDelivery: (delivery: BridgeDelivery) => void, unknownKey?: () => void): void {
    detach();
    attachWanted = true;
    attachedKey = key;
    onUnknownKey = unknownKey;
    void dial(onDelivery);
  }

  function detach(): void {
    attachWanted = false;
    attachedKey = undefined;
    onUnknownKey = undefined;
    linkAttached = false;
    clearReconnectTimer();
    const activeLink = link;
    link = undefined;
    abandonPending();
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
    identify,
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
