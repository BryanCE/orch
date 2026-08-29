import type { AgentAdapter, SpawnOpts } from "../../src/adapters/adapter.ts";

/**
 * One complete AgentAdapter for tests, built from the real type so a port change
 * fails HERE rather than in every suite that hand-rolled a fixture. Overrides
 * replace individual members; everything else is an inert default.
 *
 * Rule 13: a fixture that does not satisfy the type gets a typed factory that
 * builds the COMPLETE value — never a cast.
 */
export function fakeAdapter(overrides: Partial<AgentAdapter> = {}): AgentAdapter {
  const interactiveCmd = overrides.interactiveCmd ?? ((): string => "fake-agent");
  return {
    id: "pi",
    capabilities: {
      steer: "none", ask: false, setModel: false, sessionTail: false,
      registersPresenceOnStart: false, lifecycle: [], enforcesCommandLocks: false,
    },
    interactiveCmd,
    // Derived from interactiveCmd so a suite that overrides only the command
    // still gets argv that agrees with it.
    interactiveArgv: (opts: SpawnOpts): readonly string[] => interactiveCmd(opts).split(" "),
    headlessCmd: (): string[] => ["true"],
    detectState: () => "unknown",
    steer: () => undefined,
    answer: () => undefined,
    extractResult: () => undefined,
    ...overrides,
  };
}
