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

export function isBridgeDelivery(value: unknown): value is BridgeDelivery {
  return isRecord(value) && typeof value.id === "string" && isBridgeMessage(value.message);
}
