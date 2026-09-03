// What the environment this agent runs in can do, handed to it at spawn.
//
// A LEAF, and the reason a bundled harness artifact links no plexer: orch knows
// which plexer it is spawning into at the moment it spawns, so it writes the
// answer into the launch environment instead of shipping every provider into the
// bundle to probe for one. Nothing here names a plexer, and adding a plexer adds
// no branch to any harness module (Rule 9: branch on capabilities, never on an
// environment id).
//
// Composition, not identity: an environment HAS these roles or it does not, and
// an agent with none of them is a normal agent in a plain terminal.
import { isRecord } from "../util.ts";
import type { PaneLabels } from "../types/plexer.ts";

export const ENVIRONMENT_ENV = "ORCH_ENVIRONMENT";

export interface AgentEnvironment {
  /** The environment can report the pane and tab labels a human typed. */
  readonly labels: boolean;
  /** Harness-bus event this environment raises when its pane blocks, or null
   *  when it raises none. The name is the environment's, never the agent's. */
  readonly blockedEvent: string | null;
}

/** An environment composing no roles: a plain terminal, CI, a detached agent. */
const BARE: AgentEnvironment = { labels: false, blockedEvent: null };

/** The blocked signal an environment raises, decoded at the boundary. The
 *  CHANNEL is the environment's vocabulary; this pair is all a bridge sees. */
export interface BlockedSignal {
  readonly active: boolean;
  readonly label: string | undefined;
}

export function isBlockedSignal(value: unknown): value is BlockedSignal {
  if (!isRecord(value)) return false;
  if (typeof value.active !== "boolean") return false;
  return value.label === undefined || typeof value.label === "string";
}

export function isPaneLabels(value: unknown): value is PaneLabels {
  if (!isRecord(value)) return false;
  if (value.label !== null && typeof value.label !== "string") return false;
  return value.tabLabel === null || typeof value.tabLabel === "string";
}

function isAgentEnvironment(value: unknown): value is AgentEnvironment {
  if (!isRecord(value)) return false;
  if (typeof value.labels !== "boolean") return false;
  return value.blockedEvent === null || typeof value.blockedEvent === "string";
}

/** The launch-env entry a backend stamps so the agent it spawns can read back
 *  what its environment composes. Each backend declares its OWN roles, in its
 *  own directory, so no plexer's vocabulary leaks into core or into a harness. */
export function environmentStamp(environment: AgentEnvironment): Record<string, string> {
  return { [ENVIRONMENT_ENV]: JSON.stringify(environment) };
}

/** The roles orch stamped at spawn. An unstamped process composes nothing —
 *  a driving session in a plain terminal is the normal case, not an error. */
export function agentEnvironment(): AgentEnvironment {
  const raw = process.env[ENVIRONMENT_ENV];
  if (!raw) return BARE;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAgentEnvironment(parsed) ? parsed : BARE;
  } catch {
    return BARE;
  }
}
