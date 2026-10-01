import type { JsonRecord } from "../types/core.ts";

export type DeliveryAction = "dispatch" | "steer" | "answer" | "pipe" | "task" | "broadcast";

export interface Delivery {
  readonly target: string;
  readonly name: string;
  readonly action: DeliveryAction;
  readonly id: string;
  readonly ack: "acknowledged" | "unavailable";
}

export function deliveryLine(delivery: Delivery, ackMs: number, suffix = ""): string {
  if (delivery.ack === "acknowledged") return `Delivered to ${delivery.name} (${delivery.action} ${delivery.id})${suffix}`;
  return `Queued for ${delivery.name} (${delivery.action} ${delivery.id}): no bridge ack within ${ackMs}ms${suffix}`;
}

export function writeDelivery(delivery: Delivery, options: { json: boolean; ackMs: number; suffix?: string }): void {
  if (options.json) {
    const record: JsonRecord = {
      target: delivery.target,
      name: delivery.name,
      action: delivery.action,
      id: delivery.id,
      ack: delivery.ack,
    };
    process.stdout.write(`${JSON.stringify(record)}\n`);
    return;
  }
  process.stdout.write(`${deliveryLine(delivery, options.ackMs, options.suffix)}\n`);
}
