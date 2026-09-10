import type { ControlAck } from "../types/control.ts";

const pending = new Map<string, () => void>();

/** Settle a delivery only when its reader acknowledges the request id. */
export function acknowledgeDelivery(id: string): void {
  pending.get(id)?.();
}

/** Register before sending so an immediate acknowledgement cannot be missed. */
export async function confirmDelivery(
  id: string,
  timeoutMs: number,
  send: () => Promise<ControlAck>,
): Promise<"acknowledged" | "unavailable"> {
  let acknowledged = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const received = new Promise<void>((resolve) => {
    pending.set(id, () => {
      acknowledged = true;
      resolve();
    });
  });
  try {
    const ack = await send();
    if (ack === "none" && !acknowledged) return "unavailable";
    await Promise.race([
      received,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`delivery ${id} was not acknowledged within ${timeoutMs}ms; it may still arrive`)), timeoutMs);
      }),
    ]);
    return "acknowledged";
  } finally {
    clearTimeout(timer);
    pending.delete(id);
  }
}
