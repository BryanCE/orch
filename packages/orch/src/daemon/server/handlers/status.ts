// `orch status` as orchd answers it: every agent's row from this store, and for each agent a
// linked host runs for this one, what that host's orchd knows of it now. That orchd holds
// the agent's environment, its reports and its run, so its row's live facts are the ones a
// caller here reads; this store's reference row keeps who asked for it and who holds it.
import { fleetStatus, type DaemonState } from "../state.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { originOf } from "../../../store/agent-rows.ts";
import { linkedHosts } from "../../../store/host-rows.ts";
import { requirePeer } from "./peer.ts";
import { errorMessage } from "../../../util.ts";
import { registerMemoReset } from "../../../store/connection.ts";
import type { StatusRow } from "../../../types/command.ts";
import type { FleetStatus } from "../../../types/daemon.ts";
import type { HostId } from "../../../types/host.ts";
import type { RpcRequestContext } from "../../../types/daemon.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** What an agent's host knows of it now: its environment, state, model and run. */
type HostFacts = Pick<StatusRow,
  "backend" | "backendStatus" | "bridgeAttached" | "model" | "state" | "stateFallback" | "exited" | "alive"
  | "task" | "lastText" | "cost" | "ctxPercent" | "dispatchId" | "tokens" | "endReason">;

/** The environment each agent's host last said it runs in, so its row still says so while that
 *  host cannot be asked. */
const lastEnvironment = new Map<string, string | null>();
registerMemoReset(() => lastEnvironment.clear());

function hostFacts(row: StatusRow): HostFacts {
  const { backend, backendStatus, bridgeAttached, model, state, stateFallback, exited, alive, task, lastText, cost, ctxPercent, dispatchId, tokens, endReason } = row;
  return { backend, backendStatus, bridgeAttached, model, state, stateFallback, exited, alive, task, lastText, cost, ctxPercent, dispatchId, tokens, endReason };
}

/** The rows of the agents a linked host runs for this one, by agent, from each host whose
 *  link is up. A host that cannot answer now leaves its rows as this store has them. */
async function hostRows(state: DaemonState, rows: readonly StatusRow[]): Promise<ReadonlyMap<string, StatusRow>> {
  const here = hostIdentity().id;
  const linked = linkedHosts(state.directory);
  const asked = new Set<HostId>(rows.filter((row) => row.host.id !== here && row.hostOffline === undefined).map((row) => row.host.id));
  const answers = await Promise.all([...asked].map(async (hostId) => {
    const host = linked.get(hostId);
    if (host === undefined) return [];
    const link = state.hosts.link(host.name);
    if (link.current().kind !== "up") return [];
    try {
      return (await link.call("peer-status", {})).rows;
    } catch (error: unknown) {
      state.services.logger.warn("status.host-rows-failed", { host: host.name, error: errorMessage(error) });
      return [];
    }
  }));
  const rowsThere = answers.flat();
  for (const row of rowsThere) lastEnvironment.set(row.key, row.backend);
  return new Map(rowsThere.map((row) => [row.key, row]));
}

/** The fleet's rows, each agent on a linked host carrying what that host knows of it now. */
export async function statusAnywhere(state: DaemonState, params: ParamsOf<"status">): Promise<ResultOf<"status">> {
  const local = fleetStatus(state, params.caller);
  const far = await hostRows(state, local.rows);
  return {
    names: local.names,
    rows: local.rows.map((row) => {
      const there = far.get(row.key);
      if (there !== undefined) return { ...row, ...hostFacts(there) };
      // Its host is offline: it still runs in the environment that host last named.
      const environment = row.hostOffline === undefined ? undefined : lastEnvironment.get(row.key);
      return environment === undefined ? row : { ...row, backend: environment };
    }),
  };
}

/** For a linked host's orchd: the rows of the agents it asked this host to run. */
export function peerStatus(state: DaemonState, context: RpcRequestContext): FleetStatus {
  const peer = requirePeer(context);
  const fleet = fleetStatus(state, null);
  return { names: fleet.names, rows: fleet.rows.filter((row) => originOf(state.directory, row.key)?.askedBy === peer) };
}
