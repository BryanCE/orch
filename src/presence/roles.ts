import { randomUUID } from "node:crypto";
import { loadPresence, type PresenceEntry } from "./store.ts";
import { appendInbox } from "./inbox.ts";
import { orchDir } from "./writer.ts";
import type {
  AgentChannelRole,
  AgentMessage,
  CaptureRequest,
  CaptureRole,
  CapturedOutput,
  DeliveryReceipt,
} from "../backends/backend.ts";

type RootSource = string | (() => string);

function resolveRoot(root: RootSource): string {
  return typeof root === "function" ? root() : root;
}

function requireLivePresence(root: RootSource, agentId: string): PresenceEntry {
  const entry = loadPresence(resolveRoot(root)).get(agentId);
  if (!entry?.status) throw new Error(`cannot deliver to ${agentId}: no presence record`);
  if (!entry.alive) throw new Error(`cannot deliver to ${agentId}: agent bridge is disconnected`);
  return entry;
}

/** Append one orch message to the bridge inbox. The bridge owns draining and acking. */
export function createAgentChannelRole(root: RootSource = (() => orchDir())): AgentChannelRole {
  return {
    deliver(agentId: string, message: AgentMessage): DeliveryReceipt {
      const entry = requireLivePresence(root, agentId);
      const id = message.id ?? randomUUID();
      appendInbox(entry.dir, { ...message, id, ts: new Date().toISOString() });
      return { id, accepted: true };
    },
  };
}

/** Read only orch-owned captured status/result files; no plexer screen is consulted. */
export function createCaptureRole(root: RootSource = (() => orchDir())): CaptureRole {
  return {
    read(agentId: string, request: CaptureRequest): CapturedOutput {
      const entry = loadPresence(resolveRoot(root)).get(agentId);
      if (!entry) throw new Error(`cannot capture ${agentId}: no presence record`);
      const source = request.source ?? "all";
      return {
        status: source === "result" ? null : entry.status,
        result: source === "status" ? null : entry.result,
      };
    },
  };
}

/** Shared roles for providers whose environment uses orch's local presence files. */
export const agentChannel: AgentChannelRole = createAgentChannelRole();
export const capture: CaptureRole = createCaptureRole();

