# worktree-review Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Per-agent worktree isolation
`orch spawn --worktree` (and queue tasks with `--worktree`) SHALL give each spawned agent its own git worktree and branch (`orch/<agent-name>`) created from the repository's current branch, and start the agent with that worktree as its cwd. Worktree and branch SHALL be recorded in the spawn registry. Spawning with `--worktree` outside a git repository SHALL fail with a clear message.

#### Scenario: Isolated fleet in one repo
- **WHEN** the user runs `orch spawn 3 --worktree --tab fixes` in a git repo
- **THEN** three worktrees exist on branches `orch/fixes-1..3`, and each agent's presence shows its own worktree as cwd

#### Scenario: Not a repo
- **WHEN** the user runs `orch spawn 2 --worktree` in a directory that is not a git repository
- **THEN** orch exits 1 explaining worktree mode requires a git repo

### Requirement: Review queue
`orch review` SHALL present, one at a time, each agent whose work is finished (state `done`) and whose branch has commits ahead of its base, showing the task, result summary, and diff, and offering approve / reject / skip. Non-interactive plumbing SHALL exist: `orch review list [--json]`, `orch review approve <target>`, `orch review reject <target> -m "<feedback>"`.

#### Scenario: Finished work appears for review
- **WHEN** two worktree agents reach `done` with commits and the user runs `orch review list`
- **THEN** both are listed with branch, commit count, and task summary

#### Scenario: Plumbing works without a TTY
- **WHEN** a script runs `orch review approve fixes-2`
- **THEN** the merge proceeds identically to interactive approval

### Requirement: Approve merges and cleans up
Approving SHALL merge the agent's branch into its base branch (fast-forward when possible, else a merge commit), then remove the worktree and delete the branch. A merge conflict SHALL abort the merge, leave the worktree intact, and report the conflict without any automatic resolution.

#### Scenario: Clean approve
- **WHEN** the user approves an agent whose branch merges cleanly
- **THEN** base contains the commits and the worktree and branch are gone

#### Scenario: Conflicting approve aborts safely
- **WHEN** an approve hits a merge conflict
- **THEN** base is left unchanged, the worktree remains, and orch prints the conflicting paths with next-step options

### Requirement: Reject re-dispatches with feedback
Rejecting SHALL send the reviewer's feedback to the same agent (via its adapter's steer/dispatch mechanism) as a follow-up task in the same worktree, keeping branch and history so the agent iterates rather than restarts.

#### Scenario: Iterate on rejected work
- **WHEN** the user rejects with `-m "handle the empty-file case"`
- **THEN** the agent receives the feedback, its state returns to `working`, and the branch later reappears in the review queue with new commits

### Requirement: Worktree lifecycle hygiene
`orch clean` SHALL also report and (with `--worktrees`) remove orphaned orch worktrees — those whose agent is gone and whose branch is merged or empty. Worktrees with unmerged commits SHALL never be removed without an explicit `--force`.

#### Scenario: Orphan cleanup is conservative
- **WHEN** `orch clean --worktrees` runs and one orphan branch has unmerged commits
- **THEN** merged/empty orphans are removed, the unmerged one is only reported with a `--force` hint

