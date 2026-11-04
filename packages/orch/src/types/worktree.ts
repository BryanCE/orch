/** Every tool orch can make an agent's worktree with. */
export const WORKTREE_PROVIDER_IDS = ["git", "worktrunk"] as const;

export type WorktreeProviderId = (typeof WORKTREE_PROVIDER_IDS)[number];

export function isWorktreeProviderId(value: string): value is WorktreeProviderId {
  return WORKTREE_PROVIDER_IDS.some((id) => id === value);
}

/** The `worktrees` section of settings.json, fully resolved. */
export interface WorktreeConfig {
  readonly provider: WorktreeProviderId;
  /** An agent's branch is this prefix plus its name. */
  readonly branch_prefix: string;
  /** Where a provider that leaves the location to orch puts a worktree, under the repository root. */
  readonly directory: string;
  /** The worktrunk binary. */
  readonly worktrunk_command: string;
  /** How long one provider command may run, hooks included, in milliseconds. */
  readonly timeout_ms: number;
}

/** One worktree an agent runs in: the row `agent_worktrees` holds. */
export interface AgentWorktree {
  readonly path: string;
  readonly branch: string;
  /** The branch it forked from, and the one review lands it on. */
  readonly base: string;
  /** The tool that made it, and so the tool that lands and removes it. */
  readonly provider: WorktreeProviderId;
}

export interface WorktreeCreateRequest {
  /** The directory the launch started in. A new worktree forks from what is checked out here. */
  readonly from: string;
  /** The main repository root every linked worktree shares. */
  readonly root: string;
  /** The agent's name. */
  readonly name: string;
  readonly branch: string;
  readonly base: string;
}

export interface WorktreeLandRequest {
  readonly root: string;
  readonly worktree: string;
  readonly branch: string;
  readonly base: string;
}

export interface WorktreeRemoveRequest {
  readonly root: string;
  readonly worktree: string;
  readonly branch: string;
  /** Throw away uncommitted changes and unmerged commits. */
  readonly discard: boolean;
}

export type WorktreeLanding = "fast-forward" | "merge-commit" | "rebase";

/** One tool's whole surface. Its argv and its output format stay in its own module. */
export interface WorktreeProvider {
  readonly id: WorktreeProviderId;
  /** The directory under the repository root this provider fills, or null when the tool picks. */
  readonly repositoryDirectory: string | null;
  isAvailable(): boolean;
  /** Make the worktree and its branch; returns the worktree's path. */
  create(request: WorktreeCreateRequest): string;
  /** Put the branch's commits on the base. Refusing leaves both branches as they were. */
  land(request: WorktreeLandRequest): WorktreeLanding;
  remove(request: WorktreeRemoveRequest): void;
}

/** Runs one command and returns its stdout. Throws when it fails. */
export type WorktreeExec = (file: string, args: readonly string[], timeoutMs?: number) => string;
