import { randomBytes } from "node:crypto";
/**
 * Agent identity: one minted id, and nothing else.
 *
 * Identity is a minted id and NOTHING else, immutable. Never encode environment
 * into identity. No `<backend>~<workspace>~<handle>` key.
 *
 * This module used to serialize `<plexer>~<plexer-grouping>~<id>` into the
 * presence directory name and the registry primary key. That made an agent's
 * identity a function of where it happened to be sitting, so an agent that
 * MOVED between plexers or spaces could not keep its identity — which is why
 * moving was never implemented, and why a driving session with no plexer and no
 * space was stamped `headless~local~…`, inventing a place called "local" that
 * the web then rendered as a real one.
 *
 * The plexer and the space are environment. They live in `agent_plexers` and
 * `agent_spaces`, on their own timelines, and are read through
 * `src/store/agent-view.ts`. Nothing reads them out of a key, because a key no
 * longer has anywhere to put them.
 *
 * A LEAF: this module imports nothing but `node:crypto`. Resolving a target name
 * to an id is a lookup over presence and the agent views, so it lives in
 * `src/control/normalize-target.ts` — doing it here made the id vocabulary import
 * `presence/store.ts`, which imports this module straight back.
 */

/** Characters in a minted id; excludes every separator and escape trigger. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const ID_LENGTH = 10;

/** The shape a minted id always has. A key that does not match this is not an
 *  identity, whatever produced it. */
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

/** Mint one opaque agent id. Unique per spawn, stable for the agent's life. */
export function mintAgentId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

/** True when `value` has the shape of a minted id. */
export function isAgentId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

