import { abstractAgentLabel } from "./notify/format.ts";
import { optionalString } from "./util.ts";
import type { Recipient } from "./types/core.ts";

/** The one human-facing spelling of an agent: `pi/herdr: snapshot-recon-1`. */
export function recipientLabel(recipient: Recipient): string {
  const routing = [recipient.harness, recipient.multiplexer].filter(Boolean).join("/");
  return routing ? `${routing}: ${recipient.name}` : recipient.name;
}

/** The recipient an agent's own presence record describes — everything a caller
 *  inside a harness can see without reading orch's spawn registry. */
export function recipientFromStatus(key: string, space: string, status: Record<string, unknown>): Recipient {
  // The harness id is routing, never a name: "pi" as a display name collapses
  // every nameless agent into one label. A nameless agent gets its logical name.
  const name = optionalString(status.label);
  return {
    name: name ?? abstractAgentLabel(space, key),
    harness: optionalString(status.agent) ?? null,
    multiplexer: null,
    transportId: key,
  };
}
