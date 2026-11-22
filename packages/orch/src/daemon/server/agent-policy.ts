// What a worker header says about an agent that already exists, read back from the store.
import { readOnlyOf } from "../../store/read-only-rows.ts";
import type { OrchDir, WorkerHeaderContext } from "../../types/core.ts";

/** What a worker header says about `agentId` that only the store knows. */
export function storedHeaderContext(directory: OrchDir, agentId: string): Pick<WorkerHeaderContext, "readOnly"> {
  const readOnly = readOnlyOf(directory, agentId);
  return readOnly === null ? {} : { readOnly };
}
