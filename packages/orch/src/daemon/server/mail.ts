import type { OrchDir } from "../../types/core.ts";
import { randomUUID } from "node:crypto";
import { checkWall } from "../../policy/space.ts";
import { SETTINGS_DEFAULTS } from "../../settings/schema.ts";
import { insertOutboxMessage } from "../../store/outbox-rows.ts";
import { agentView } from "../../store/agent-view.ts";
import { decisionLogger } from "../client/decision-log.ts";
import type { MailDelivery, OrchSettings } from "../../types/settings.ts";

function requiredMailString(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

/** The landing one mail gets: a worker writing the agent that spawned it follows
 *  `to_spawner`; every other sender and recipient pair follows `to_worker`. */
export function mailDelivery(directory: OrchDir, mail: OrchSettings["mail"], from: string, target: string): MailDelivery {
  return agentView(directory, from)?.spawnedBy === target ? mail.to_spawner : mail.to_worker;
}

/** Queue one agent's message to another. Mail is governed by the space wall only, never by
 * the lease: it is not a driving verb (Rule 11). The row is picked up by the outbox drain
 * or by the caller's own delivery attempt, and `mailDelivery` decides its route then. */
export function acceptMail(directory: OrchDir, settings: OrchSettings | null, from: string, target: string, text: string): { id: string } {
  const sender = requiredMailString(from, "from");
  const recipient = requiredMailString(target, "target");
  const body = requiredMailString(text, "text");
  const crossSpace = settings?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space;
  const wall = checkWall(directory, sender, recipient, { crossSpace });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the mail");

  const id = randomUUID();
  insertOutboxMessage(directory, { id, target: recipient, payload: { action: "mail", from: sender, text: body } });
  decisionLogger(directory, settings).forCorrelation(id).info("mail.accepted", { from: sender, target: recipient });
  return { id };
}
