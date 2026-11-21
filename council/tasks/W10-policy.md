# W10: the worker policy carries the write root

Context for every section. An agent launched with a write root may change files only inside
that one directory. Every launch already carries a `WorkerPolicy`
(`packages/orch/src/types/policy.ts`): the spawn request, the backend options, the adapter's
`SpawnOpts.workers`. This wave puts the write root on that policy, so each place that carries
the policy carries the root with it. The two sections touch different files and run at the
same time. Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript, no `as`
casts, no `any`, double quotes, a `/** ... */` doc comment on every export.

The shape both sections build against, added by T11:
```ts
export interface WorkerPolicy {
  // ...the six members it has today, then:
  /** The one directory the worker may write in, absolute. Null lets it write wherever its harness does. */
  readonly writeRoot: string | null;
}
```

Verify for every section: run exactly these from the repo root, once, after the edits. Ignore
any other verify command your header names; it belongs to another project. Run no typecheck:
the other section's half-finished edit would fail it.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test <the test files the section names>
```

## T11 The policy, its wire schema, and what it sets at launch
Edit `packages/orch/src/types/policy.ts`: `WorkerPolicy` gains a last member, exactly as
written above.
Edit `packages/orch/src/daemon/client/protocol.ts`: in `workerPolicy` (L113-120), after
`compactAtTokens: CompactionTableSchema,` add `writeRoot: z.string().nullable(),`.
Edit `packages/orch/src/policy/workers.ts`:
- Add `import { WRITE_ROOT_ENV, writeRootTools, type ToolVocabulary } from "./write-root.ts";`.
- Add this private function above `workerTools`:
  ```ts
  /** Orch's own tools for a worker under these settings. */
  function orchTools(settings: OrchSettings): readonly string[] {
    return [...ORCH_BASE_TOOLS, ...(settings.fleet.worker_peer_tools ? ORCH_PEER_TOOLS : [])];
  }
  ```
- `workerTools` becomes:
  ```ts
  /** The tool allowlist a policy launches under, or undefined for no restriction. */
  export function policyTools(policy: WorkerPolicy): string | undefined {
    return policy.allowTools.length ? policy.allowTools.join(",") : undefined;
  }

  /** The tool allowlist a worker launches under, or undefined for no restriction.
   *  Orch's own tools are always required; everything else is `workers.allow_tools`. */
  export function workerTools(settings: OrchSettings): string | undefined {
    return policyTools(workerPolicyFrom(settings));
  }
  ```
- In `workerPolicyFrom`: delete its `const orchTools = ...` line, write `orchTools(settings)`
  where `orchTools` was spread, and add `writeRoot: null,` as the last member of the returned
  object.
- After `workerPolicyFrom` add:
  ```ts
  /** The policy of a worker launched under a write root: its harness's read and write tools and
   *  orch's own, and no user extension or MCP server, since either can bring a tool that writes.
   *  The built-ins stay on, because the allowlist names the ones the worker keeps. */
  export function confinedPolicy(settings: OrchSettings, root: string, tools: ToolVocabulary): WorkerPolicy {
    return {
      ...workerPolicyFrom(settings),
      inheritExtensions: false,
      inheritMcp: false,
      builtinTools: true,
      allowTools: [...writeRootTools(tools), ...orchTools(settings)],
      writeRoot: root,
    };
  }
  ```
- `compactionEnv` is renamed and grows. Replace it and its doc comment with:
  ```ts
  /** The env a launch's policy sets: its compaction point, and its write root when it has one. */
  export function policyEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>> {
    const root = policy === undefined ? null : policy.writeRoot;
    return { ...compactionLaunch(adapter, model, policy).env, ...(root === null ? {} : { [WRITE_ROOT_ENV]: root }) };
  }
  ```
Edit `packages/orch/src/daemon/server/spawn/placement.ts` (L11, L118) and
`packages/orch/src/daemon/server/spawn/index.ts` (L7, L148): `compactionEnv` becomes
`policyEnv` in the import and at the call.
Edit `packages/orch/test/compaction-env.test.ts`: `compactionEnv` becomes `policyEnv` in the
import and at every call (ten calls), and the `workers` fixture (L12-19) gains
`writeRoot: null,` as its last member. Add one test inside its first `describe`:
```ts
  test("a policy with a write root sets it beside the compaction point", () => {
    const confined = { ...workers, writeRoot: "/repo/.orch/councils/plan/ada" };
    expect(policyEnv(claudeAdapter, "haiku", confined)).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000", ORCH_WRITE_ROOT: "/repo/.orch/councils/plan/ada" });
    expect(policyEnv(codexAdapter, "gpt-5.5", confined)).toEqual({ ORCH_WRITE_ROOT: "/repo/.orch/councils/plan/ada" });
  });
```
Edit `packages/orch/test/worker-tools.test.ts`: import `confinedPolicy` and `workerPolicyFrom`
beside `workerTools`, and add inside its `describe`:
```ts
  test("settings alone give a policy with no write root", () => {
    expect(workerPolicyFrom(settings()).writeRoot).toBeNull();
  });

  test("a write root leaves only the harness's read and write tools and orch's own", () => {
    const tools = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };
    const policy = confinedPolicy(settings(true, ["bash"]), "/repo/out", tools);
    expect(policy.writeRoot).toBe("/repo/out");
    expect(policy.allowTools).toEqual(["read", "grep", "edit", "write", "orch_ask", "orch_agents", "orch_send", "orch_read"]);
    expect(policy.inheritExtensions).toBe(false);
    expect(policy.inheritMcp).toBe(false);
    expect(policy.builtinTools).toBe(true);
    expect(confinedPolicy(settings(), "/repo/out", tools).allowTools).toEqual(["read", "grep", "edit", "write", "orch_ask"]);
  });
```
Test files to run: `packages/orch/test/worker-tools.test.ts packages/orch/test/compaction-env.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T12 The adapters read the write root from the policy
Edit `packages/orch/src/types/adapter.ts`: delete the `writeRoot` member of `SpawnOpts` and
its doc comment (the two lines after the `workers` member).
Edit `packages/orch/src/adapters/claude.ts`: `writeRootArgv` and its doc comment become
```ts
/** Claude's `--tools` for a worker with a write root: the tools that read and the two that write, and no other. */
function writeRootArgv(opts: SpawnOpts): string[] {
  return opts.workers === undefined || opts.workers.writeRoot === null ? [] : ["--tools", writeRootTools(CLAUDE_TOOLS).join(",")];
}
```
Edit these test fixtures: each `WorkerPolicy` object literal gains `writeRoot: null` as its
last member.
- `packages/orch/test/adapter-allowlist.test.ts`: the policy that ends at L13, and `LOCKED_DOWN` (L15-22).
- `packages/orch/test/orch-bugs-4-5.test.ts`: `inherited` (L8-15).
- `packages/orch/test/claude-adapter.test.ts` (L162): the `policy` literal becomes
  `{ inheritExtensions: true, excludeExtensions: {}, builtinTools: true, allowTools: [], compactAtTokens: {}, writeRoot: null }`.
In `packages/orch/test/claude-adapter.test.ts`, directly after the test
`"loads no MCP server unless the worker policy inherits MCP"`, add:
```ts
  test("a worker with a write root launches with only the tools that read and the two that write", () => {
    const confined = { inheritExtensions: false, inheritMcp: false, excludeExtensions: {}, builtinTools: true, allowTools: [], compactAtTokens: {}, writeRoot: "/repo/out" };
    expect(claudeAdapter.interactiveArgv({ workers: confined })).toEqual(["claude", "--strict-mcp-config", "--tools", "Read,Grep,Glob,Edit,Write"]);
    expect(claudeAdapter.headlessCmd("reply", { workers: confined })).toEqual(["claude", "-p", "--strict-mcp-config", "--tools", "Read,Grep,Glob,Edit,Write", "reply"]);
  });
```
In `packages/orch/test/adapter-allowlist.test.ts`, inside the `describe` that starts
`"pi worker launch obeys the worker policy"`, add:
```ts
  test("a write-root policy names the tools the worker keeps and leaves the built-ins on", () => {
    const confined: WorkerPolicy = { inheritExtensions: false, inheritMcp: false, excludeExtensions: {}, builtinTools: true, allowTools: ["read", "grep", "find", "ls", "edit", "write", "orch_ask"], compactAtTokens: {}, writeRoot: "/repo/out" };
    const command = piAdapter.workerLaunch.restrictedInteractiveCmd({ workers: confined });
    expect(command).toContain("--tools read,grep,find,ls,edit,write,orch_ask");
    expect(command).not.toContain("--no-builtin-tools");
  });
```
If that file names pi's adapter something other than `piAdapter`, use the name it imports.
Test files to run: `packages/orch/test/claude-adapter.test.ts packages/orch/test/adapter-allowlist.test.ts packages/orch/test/orch-bugs-4-5.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
