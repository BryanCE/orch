import type { DaemonClient } from "../../src/types/agent.ts";

/** A DaemonClient that accepts everything and forwards nothing. */
export function stubDaemonClient(): DaemonClient {
  return {
    messageIdOf: () => undefined,
    isAcked: () => false,
    markAcked: () => undefined,
    postAck: () => Promise.resolve(true),
    postControlOutcome: () => Promise.resolve(true),
  };
}
