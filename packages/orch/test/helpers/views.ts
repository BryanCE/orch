import type { AgentView, AgentEnvironment, AgentTuning } from "../../src/types/store.ts";

export interface AgentViewFixtureOverrides extends Omit<Partial<AgentView>, "id" | "environment" | "tuning"> {
  readonly environment?: Partial<AgentEnvironment>;
  readonly tuning?: Partial<AgentTuning>;
}

/** Build a complete AgentView while allowing callers to state only relevant overrides. */
export function agentViewFixture(id: string, overrides: AgentViewFixtureOverrides = {}): AgentView {
  const { environment: environmentOverrides, tuning: tuningOverrides, ...baseOverrides } = overrides;
  const environment: AgentEnvironment = {
    plexer: "headless", handle: null, space: null, worktree: null, branch: null,
    ...environmentOverrides,
  };
  const tuning: AgentTuning = { model: null, thinking: null, ...tuningOverrides };
  return {
    id,
    name: id,
    label: null,
    harnessId: "pi",
    cwd: "/repo",
    createdAt: 1,
    spawnedBy: null,
    spawnedByName: null,
    rootAgentId: id,
    heldBy: null,
    endedAt: null,
    ...baseOverrides,
    environment,
    tuning,
  };
}
