import type { Logger, OrchDir } from "../../types/core.ts";
import { randomUUID } from "node:crypto";
import { checkWall } from "../../policy/space.ts";
import { SETTINGS_DEFAULTS } from "../../settings/schema.ts";
import { insertOutboxMessage } from "../../store/outbox-rows.ts";
import { agentView } from "../../store/agent-view.ts";
import { resolveTargetRoute } from "../../control/dispatch.ts";
import { joinsLeadingOrchs, requireOrchPeers } from "./peer-orchs.ts";
import type { MailDelivery, OrchSettings } from "../../types/settings.ts";
import type { HereAgent } from "../../types/agent-place.ts";

function requiredMailString(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

/** The landing one mail gets: a worker writing the agent that spawned it follows
 *  `to_spawner`; every other sender and recipient pair follows `to_worker`.
 *  `prompt-unless-focused` resolves here: the stream while the human is in the
 *  recipient's pane, because keys typed there go out with whatever the human types. */
export function mailDelivery(directory: OrchDir, mail: OrchSettings["mail"], from: string, target: HereAgent): Exclude<MailDelivery, "prompt-unless-focused"> {
  const direction = agentView(directory, from)?.spawnedBy === target.id ? mail.to_spawner : mail.to_worker;
  if (direction !== "prompt-unless-focused") return direction;
  return targetPaneFocused(directory, target) ? "events" : "prompt";
}

/** Whether the human is in the target's pane now, as the plexer reports it. */
function targetPaneFocused(directory: OrchDir, target: HereAgent): boolean {
  const route = resolveTargetRoute(directory, target);
  const inventory = route?.backend.placementInventory;
  if (route === undefined || !inventory) return false;
  const handle = String(route.handle);
  return inventory.list().some((pane) => String(pane.handle) === handle && pane.focused);
}

/** Throws when the mail may not pass. Two leading orchs obey `fleet.orch_peers` alone; every other pair obeys the space wall. */
function admitMail(directory: OrchDir, fleet: Pick<OrchSettings["fleet"], "cross_space" | "orch_peers">, sender: string, recipient: string): void {
  if (joinsLeadingOrchs(directory, sender, recipient)) return requireOrchPeers(fleet);
  const wall = checkWall(directory, sender, recipient, { crossSpace: fleet.cross_space });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the mail");
}

/** Queue one agent's message to another. Mail is governed by the space wall or the orch-peers
 * switch, never by the lease: it is not a driving verb (Rule 11). The row is picked up by the
 * outbox drain or by the caller's own delivery attempt, and `mailDelivery` decides its route then. */
export function acceptMail(directory: OrchDir, settings: OrchSettings | null, from: string, target: string, text: string, logger?: Logger): { id: string } {
  const sender = requiredMailString(from, "from");
  const recipient = requiredMailString(target, "target");
  const body = requiredMailString(text, "text");
  admitMail(directory, settings?.fleet ?? SETTINGS_DEFAULTS.fleet, sender, recipient);

  const id = randomUUID();
  insertOutboxMessage(directory, { id, target: recipient, payload: { action: "mail", from: sender, text: body } });
  logger?.forCorrelation(id).info("mail.accepted", { from: sender, target: recipient });
  return { id };
}
