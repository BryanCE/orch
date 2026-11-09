// Where an agent runs is part of its type. Every agent has exactly one host at a time, stored
// as the open `agent_hosts` row; `placeAgent` (src/process-place.ts) reads it and is the only
// code that can mint a `HereAgent`. Every function that touches an agent's machine-specific
// state here (its process, handle, plexer, worktree, delivery route) takes a `HereAgent`, so
// an agent on another host can never reach one: the compiler sends the caller through
// `placeAgent` and an exhaustive match first.
import type { HostId } from "./host.ts";
import type { LinkedHost } from "./process.ts";

/** An agent's identity: one minted id. Minted only by `mintAgentId`; read back from the
 *  store row that holds it, or parsed off the wire, through the guards in
 *  `src/shared/agent-id.ts`. A bare string never stands in for one. */
export type AgentId = string & { readonly __brand: "AgentId" };

/** An agent this orchd runs, on this orchd's own host: proven by `placeAgent`, which is the
 *  only code that mints one. The proof holds for the instant it was read; a caller places the
 *  agent again for each act rather than keeping one. */
export type HereAgent = { readonly id: AgentId; readonly host: HostId } & { readonly __brand: "HereAgent" };

/** Where an agent runs, from this orchd. `here`: this orchd's own host, so this orchd's code
 *  answers for it. `linked`: a host this orchd reaches over a link, whose orchd answers for it.
 *  `unreachable`: a host this orchd has no link to, so nothing here may act on it. */
export type AgentPlace =
  | { readonly kind: "here"; readonly agent: HereAgent }
  | { readonly kind: "linked"; readonly agent: AgentId; readonly host: LinkedHost }
  | { readonly kind: "unreachable"; readonly agent: AgentId; readonly host: HostId };

/** An agent's open `agent_hosts` row: the host it runs on, the directory it runs in there,
 *  and since when. Every agent has one, this machine's included. */
export interface AgentLocation {
  readonly host: HostId;
  readonly cwd: string;
  readonly since: number;
}
