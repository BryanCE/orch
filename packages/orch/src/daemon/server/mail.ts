import type { CallerCredential, Logger, OrchDir } from "../../types/core.ts";
import { randomUUID } from "node:crypto";
import { checkWall } from "../../policy/space.ts";
import { SETTINGS_DEFAULTS } from "../../settings/schema.ts";
import { insertOutboxMessage, selectOutboxByIdPrefix } from "../../store/outbox-rows.ts";
import { selfIdentityOf } from "../../identity/self.ts";
import { agentView } from "../../store/agent-view.ts";
import { resolveTargetRoute } from "../../control/dispatch.ts";
import { joinsLeadingOrchs, requireOrchPeers } from "./peer-orchs.ts";
import type { MailDelivery, OrchSettings } from "../../types/settings.ts";
import type { HereAgent } from "../../types/agent-place.ts";

function requiredMailString(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

/** The direction setting one mail follows: `to_orch` between two leading orchs, `to_spawner`
 *  from a worker to the agent that spawned it, `to_worker` for every other pair. */
function mailDirection(directory: OrchDir, mail: OrchSettings["mail"], from: string, target: HereAgent): MailDelivery {
  if (joinsLeadingOrchs(directory, from, target.id)) return mail.to_orch;
  return agentView(directory, from)?.spawnedBy === target.id ? mail.to_spawner : mail.to_worker;
}

/** The landing one mail gets. `prompt-unless-focused` resolves here: the stream while the human
 *  is in the recipient's pane and the recipient watches it, because keys typed there go out with
 *  whatever the human types. With no watch open, the stream reaches no one, so the input does. */
export function mailDelivery(directory: OrchDir, mail: OrchSettings["mail"], from: string, target: HereAgent, watched: boolean): Exclude<MailDelivery, "prompt-unless-focused"> {
  const direction = mailDirection(directory, mail, from, target);
  if (direction !== "prompt-unless-focused") return direction;
  return watched && targetPaneFocused(directory, target) ? "events" : "prompt";
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

/** The full text of one mail the caller sent or received, named by its id or the start of it. */
export function readMail(directory: OrchDir, credential: CallerCredential, code: string): { id: string; text: string } {
  const caller = selfIdentityOf(directory, credential)?.id;
  if (caller === undefined) throw new Error("only a registered caller has mail");
  const mine = selectOutboxByIdPrefix(directory, code).flatMap((row) =>
    row.payload.action === "mail" && (row.target === caller || row.payload.from === caller) ? [{ id: row.id, text: row.payload.text }] : []);
  const [mail] = mine;
  if (mine.length > 1) throw new Error(`${code} names several mails; give more of the id: ${mine.map((each) => each.id).join(", ")}`);
  if (mail === undefined) throw new Error(`no mail ${code} to or from you; mail is kept for retention.outbox_days`);
  return mail;
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
