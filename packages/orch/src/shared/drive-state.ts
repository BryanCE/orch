import type { AgentView } from "../types/store.ts";

export const NO_ORCH_DRIVER = "no orch driving it";
export const DEAD_HOLDER_DRIVER = `${NO_ORCH_DRIVER} (holder gone)`;

/** What every reading of a lease needs: the composed views, and whether a holder's process runs. */
export interface LeaseFacts {
  readonly viewOf: (agentId: string) => AgentView | null;
  readonly holderAlive: (holderId: string) => boolean;
}
