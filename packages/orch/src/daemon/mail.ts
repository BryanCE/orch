import { randomUUID } from "node:crypto";
import { checkWall } from "../policy/space.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { insertOutboxMessage } from "../store/outbox-rows.ts";
import { decisionLogger } from "./decision-log.ts";
import type { OrchSettings } from "../types/settings.ts";

function requiredMailString(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

/** Queue one agent's message to another. Mail is governed by the space wall only, never by
 * the lease: it is not a driving verb (Rule 11). The row is picked up by the outbox drain
 * or by the caller's own delivery attempt. */
export function acceptMail(directory: string, settings: OrchSettings | null, from: string, target: string, text: string): { id: string } {
  const sender = requiredMailString(from, "from");
  const recipient = requiredMailString(target, "target");
  const body = requiredMailString(text, "text");
  const crossSpace = settings?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space;
  const wall = checkWall(directory, sender, recipient, { crossSpace });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the mail");

  const id = randomUUID();
  insertOutboxMessage(directory, { id, target: recipient, payload: { action: "steer", text: body } });
  decisionLogger(directory).forCorrelation(id).info("mail.accepted", { from: sender, target: recipient });
  return { id };
}
