// The agents a caller holds, by identity key: what `--all` on a drive verb means.
import { buildEntities } from "../../../entities/inventory.ts";
import { viewForKey } from "../../../entities/lookup.ts";
import { spawnedRecords } from "../../../presence/store.ts";
import { callerOwns } from "../../../policy/ownership.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

export function ownedAgents(state: DaemonState, params: ParamsOf<"owned-agents">): ResultOf<"owned-agents"> {
  const directory = state.directory;
  const views = spawnedRecords(directory);
  const keys = buildEntities(directory, state.services.settings.current())
    .filter((entity) => entity.presence !== null)
    .filter((entity) => callerOwns(directory, params.caller, entity.key, viewForKey(views, entity.key)?.heldBy?.orchId ?? null))
    .map((entity) => entity.key);
  return { keys };
}
