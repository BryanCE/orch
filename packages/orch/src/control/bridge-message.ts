import { isRecord } from "../util.ts";

/**
 * The one shape every orch → agent message has on the wire and in the outbox row.
 *
 * A leaf module: the daemon pushes it down a bridge link and the bridge applies it,
 * so both sides import this and neither knows the other's wire format.
 */
export type BridgeMessage =
  | { readonly action: "dispatch"; readonly text: string }
  | { readonly action: "steer"; readonly text: string }
  | { readonly action: "answer"; readonly text: string; readonly questionId: string }
  | { readonly action: "model"; readonly model: string };

export type BridgeAction = BridgeMessage["action"];

/** Mail from one agent to another, queued as an outbox row. It never reaches a bridge as
 * itself: at delivery the daemon reads the `mail` setting for its direction (`from` against
 * the recipient) and either steers the recipient's prompt with the text or publishes it as
 * a `message` event on the recipient's stream. */
export interface MailMessage {
  readonly action: "mail";
  readonly from: string;
  readonly text: string;
}

/** Everything an outbox row may carry: a bridge message, or mail awaiting its route. */
export type OutboxPayload = BridgeMessage | MailMessage;

/** The one shape for an agent → daemon notice. The reverse of BridgeMessage: the agent
 * publishes over its live link instead of writing a file the daemon has to watch. */
export interface AgentNotice {
  readonly notice: "question";
  readonly agentId: string;
  readonly questionId: string;
  readonly question: string;
  readonly askedAt: number;
}

export function isAgentNotice(value: unknown): value is AgentNotice {
  return isRecord(value)
    && value.notice === "question"
    && typeof value.agentId === "string"
    && typeof value.questionId === "string"
    && typeof value.question === "string"
    && typeof value.askedAt === "number";
}

/** One outbox row on its way down a link: the row id is what the bridge acks. */
export interface BridgeDelivery {
  readonly id: string;
  readonly message: BridgeMessage;
}

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!isRecord(value)) return false;
  switch (value.action) {
    case "dispatch":
    case "steer":
      return typeof value.text === "string";
    case "answer":
      return typeof value.text === "string" && typeof value.questionId === "string";
    case "model":
      return typeof value.model === "string";
    default:
      return false;
  }
}

export function isMailMessage(value: unknown): value is MailMessage {
  return isRecord(value) && value.action === "mail" && typeof value.from === "string" && typeof value.text === "string";
}

export function isOutboxPayload(value: unknown): value is OutboxPayload {
  return isBridgeMessage(value) || isMailMessage(value);
}

export function isBridgeDelivery(value: unknown): value is BridgeDelivery {
  return isRecord(value) && typeof value.id === "string" && isBridgeMessage(value.message);
}
