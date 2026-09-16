// orchd resolves who a governed write comes from. The CLI sends its credential;
// the actor fields are stamped here, so a client can never claim an actor it is not.
import { selfIdentityOf, spaceOfAgent } from "../../identity/self.ts";
import { callerKindOf } from "../../policy/caller.ts";
import type { Governance, GovernedMethod } from "../client/protocol.ts";
import type { RpcHandler } from "../../types/daemon.ts";
import type { DaemonState } from "./state.ts";

function operatorOnly(flag: string): Error {
  return new Error(`${flag} is operator-only: a driving session may only touch agents it holds.`);
}

/** The governance a credential resolves to. Params with no credential pass untouched. */
export function stampGovernance<P extends Governance>(state: DaemonState, params: P): P {
  const credential = params.caller;
  if (credential === undefined) return params;
  const directory = state.directory;
  const kind = callerKindOf(directory, credential);
  if (params.steal === true && kind !== "operator") throw operatorOnly("--steal");
  if (params.crossSpace === true && kind !== "operator") throw operatorOnly("--cross-space");
  const stamped: P = { ...params };
  delete stamped.actor;
  delete stamped.actorSpace;
  delete stamped.actorIsOperator;
  const actor = selfIdentityOf(directory, credential)?.id ?? null;
  if (actor === null) return stamped;
  stamped.actor = actor;
  const space = spaceOfAgent(directory, actor);
  if (space !== null) stamped.actorSpace = space;
  stamped.actorIsOperator = kind !== "agent";
  return stamped;
}

/** One handler whose params are stamped before it runs. */
export function governed<M extends GovernedMethod>(state: DaemonState, handler: RpcHandler<M>): RpcHandler<M> {
  return (params, emit, context) => handler(stampGovernance(state, params), emit, context);
}
