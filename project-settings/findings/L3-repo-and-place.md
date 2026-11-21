## 1. Repository roots
- `repositoryRootOf(directory: string): string | null` walks upward for `.git`; linked worktrees resolve through `commondir` to the shared main root. Outside a repository it returns `null`. It reads `.git` marker/`commondir` files and does not run git. `packages/orch/src/worktrees/repository.ts:33`
- `repoRootOf(cwd: string | null | undefined): string | null` returns `null` for absent/empty cwd, the common repository root when in a repository, otherwise `resolve(cwd)`. It delegates to the filesystem-only `repositoryRootOf`; it does not run git. `packages/orch/src/policy/space.ts:36`
- Worktree-specific `checkoutRoot` does run `git rev-parse --show-toplevel`; unlike `repositoryRootOf`, it returns that checkout’s root. `packages/orch/src/worktrees/repository.ts:57`

## 2. `.worktreeinclude`
- `gitWorktrees(...).provision` checks and reads `<source>/.worktreeinclude`, where `source` is the original checkout root; it passes the file as git’s `--exclude-from` list and copies included ignored files into the worktree. This code runs in orchd’s worktree provisioning path. `packages/orch/src/worktrees/git.ts:68`

## 3. Agent working directory
- The open `agent_hosts` interval stores `hostId` and `cwd`; `openLocationIn` writes it. `packages/orch/src/store/interval-rows.ts:45`
- `agentLocation(orchDir: OrchDir, agentId: string): AgentLocation | undefined` reads the open row for an agent. `packages/orch/src/store/interval-rows.ts:61`
- `hereAgentIfAny(orchDir: OrchDir, id: string): HereAgent | null` establishes that the agent runs on this host; `repoRootFor` uses it before reading that agent’s cwd. `packages/orch/src/process-place.ts:70`; `packages/orch/src/policy/space.ts:44`

## 4. Spaces and caller directory
- A space is an orch-owned, named database row (`id`, `name`, creator and creation instant); agents’ space membership is separately interval-recorded. `packages/orch/src/store/space-rows.ts:8`; `packages/orch/src/store/space-rows.ts:32`
- `settings.spaces` maps space names to repository/directory roots (the configured lookup value). `packages/orch/src/shared/space.ts:17`
- Order: CLI `createSpace` sends `process.cwd()` as `cwd` → RPC `space-create` → handler `createSpace` passes that cwd to `openHome` when a plexer home exists. This records/opens the home; it does not automatically assign the caller to the space. `packages/orch/src/commands/space.ts:38`; `packages/orch/src/daemon/client/protocol.ts:729`; `packages/orch/src/daemon/server/handlers/space.ts:45`

## 5. Caller cwd in RPC
`CALLER` and `GOVERNANCE` have these schemas:
```ts
const CALLER = z.object({
  launch: z.string().nullable(),
  session: CALLER_SESSION.nullable(),
  pid: z.number().int().positive(),
}) satisfies z.ZodType<CallerCredential>;
const GOVERNANCE = z.object({
  caller: CALLER.optional(),
  actor: z.string().min(1).optional(),
  actorSpace: z.string().optional(),
  actorIsOperator: z.boolean().optional(),
  steal: z.boolean().optional(),
  crossSpace: z.boolean().optional(),
});
```
`packages/orch/src/daemon/client/protocol.ts:55`; `packages/orch/src/daemon/client/protocol.ts:91`
- Requests with a `cwd` field: `spawn-headless`, `spawn`, `tile`, and `space-create`. `packages/orch/src/daemon/client/protocol.ts:670`; `packages/orch/src/daemon/client/protocol.ts:691`; `packages/orch/src/daemon/client/protocol.ts:703`; `packages/orch/src/daemon/client/protocol.ts:729`
- The caller credential itself carries no cwd; these request-specific cwd values are separate from `GOVERNANCE`.

## 6. Linked-host settings
- A linked host’s own orchd governs its launch, worker header and verification policy: the remote host receives the request and runs its own daemon code/settings. The local relaunch handler explicitly routes the request to the peer; its comment states that the far host’s orchd acts “with its own settings and code.” `packages/orch/src/daemon/server/handlers/relaunch.ts:3`
- On whichever host handles worker dispatch, `workerHeaderFor` obtains `workerRules(options.settings.current())`, so the header and its verify commands come from that host’s current settings. `packages/orch/src/daemon/server/work-loop.ts:104`
- The host link routes RPC to the far orchd using `orch host serve`. `packages/orch/src/hosts/link.ts:1`; `packages/orch/src/hosts/link.ts:61`

## 7. Other repository files read
- `.git` marker files and linked-worktree `commondir` metadata are read to locate the repository root. `packages/orch/src/worktrees/repository.ts:16`
- Git commands read repository metadata/state for branch, checkout, worktree and review operations; examples include `rev-parse`, `branch`, `worktree list`, and `status`. `packages/orch/src/worktrees/repository.ts:57`; `packages/orch/src/worktrees/repository.ts:67`; `packages/orch/src/worktrees/repository.ts:89`; `packages/orch/src/worktrees/repository.ts:96`
