# W14: the tree moves from "write root" to "read-only agent, optional output directory"

Context for every section. A read-only agent keeps the tools that read and nothing else: no
shell, no MCP tool, no extension tool. It may be given one output directory, which lets it
write files there and nowhere else. `packages/orch/src/policy/read-only.ts` is the one module
that decides it; read it first. It replaces `policy/write-root.ts`, which is deleted. These
are already in place:
```ts
// packages/orch/src/policy/read-only.ts
export interface ReadOnly { readonly out: string | null }
export interface ReadOnlyGate extends ReadOnly { readonly cwd: string; readonly tools: ToolVocabulary }
export function readOnlyEnv(readOnly: ReadOnly): Record<string, string>
export function readOnlyGate(env: NodeJS.ProcessEnv, cwd: string, tools: ToolVocabulary): ReadOnlyGate | null
export function readOnlyTools(vocabulary: ToolVocabulary, readOnly: ReadOnly): string[]
export function readOnlyRefusal(gate: ReadOnlyGate, toolName: unknown, input: unknown): string | undefined
// packages/orch/src/types/policy.ts: WorkerPolicy.writeRoot is gone; it has
readonly readOnly: ReadOnly | null;
// packages/orch/src/policy/workers.ts: confinedPolicy and workerTools are gone; it has
export function policyTools(policy: WorkerPolicy): string | undefined
export function readOnlyPolicy(settings: OrchSettings, readOnly: ReadOnly, tools: ToolVocabulary): WorkerPolicy
// packages/orch/src/types/adapter.ts: the adapter member toolVocabulary is gone; it has
export interface ReadOnlyRole { readonly tools: ToolVocabulary }
readonly readOnly: ReadOnlyRole | null;
```
The four sections touch different files and run at the same time. Paths are from the repo
root `/home/bryan/orch`. Code style: TypeScript, no `as` casts, no `any`, double quotes, a
`/** ... */` doc comment on every export. The words "write root" and "confined" appear
nowhere in what you leave behind: say "read-only" and "output directory".

Run the verify command your header names over the files you edited, then the test files your
section names with `bun test <files>` from the repo root. Run no typecheck: another section's
half-finished edit would fail it.

## R1 The bridge and the claude hook
Edit `packages/orch/extensions/pi/vocabulary.ts`, `packages/orch/extensions/omp/vocabulary.ts`
and `packages/orch/extensions/claude/vocabulary.ts`: the import path
`orch/core/policy/write-root.ts` becomes `orch/core/policy/read-only.ts`, and in each doc
comment `a write-root agent keeps` becomes `a read-only agent can keep`.
Edit `packages/orch/src/types/agent.ts`:
- The import from `"../policy/write-root.ts"` becomes
  `import type { ReadOnlyGate, ToolVocabulary } from "../policy/read-only.ts";`.
- The doc comment of `HarnessIdentity.tools` becomes
  `/** The harness's own names for the tools a read-only agent can keep. */`.
- In `AgentToolsOptions`, the member `writeRoot` and its doc comment become
  ```ts
    /** The gate this session runs behind when it was launched read-only, or null. */
    readOnly: ReadOnlyGate | null;
  ```
Edit `packages/orch/src/agent/harness-bridge.ts`: import `readOnlyGate` from
`"../policy/read-only.ts"` in place of `writeRootGate`, and the option and its comment become
```ts
    // A read-only agent keeps its harness's tools that read and orch's own.
    readOnly: readOnlyGate(process.env, process.cwd(), { ...identity.tools, reads: [...identity.tools.reads, ...ORCH_TOOLS] }),
```
Edit `packages/orch/src/agent/tools.ts`: import `readOnlyRefusal` from
`"../policy/read-only.ts"` in place of `writeRootRefusal`. In the `tool_call` listener,
`options.writeRoot` becomes `options.readOnly` (twice) and `writeRootRefusal` becomes
`readOnlyRefusal`. In the comment above the listener, the sentence about a write root becomes
`A read-only agent is refused every call that is not a read, or a write inside its output directory.`
Edit `packages/orch/extensions/claude/tool-gate.ts`: the import becomes
`import { readOnlyRefusal, type ReadOnlyGate } from "orch/core/policy/read-only.ts";`, the
third parameter of `preToolUse` becomes `readOnly: ReadOnlyGate | null`, its body uses
`readOnly` and `readOnlyRefusal`, and the second sentence of its doc comment becomes
`A read-only agent is refused every call that is not a read, or a write inside its output directory.`
Edit `packages/orch/extensions/claude/index.ts`: import `readOnlyGate` from
`"orch/core/policy/read-only.ts"` in place of `writeRootGate`, and call it in `gateToolCall`.
Rename `packages/orch/test/bridge-write-root.test.ts` to
`packages/orch/test/bridge-read-only.test.ts` with `mv`, then in it:
- Import `type { ReadOnly, ReadOnlyGate }` from `"../src/policy/read-only.ts"`.
- `fire`'s first parameter becomes `readOnly: ReadOnly | null`, the gate becomes
  `const gate: ReadOnlyGate | null = readOnly === null ? null : { out: readOnly.out, cwd: process.cwd(), tools: { ...PI_IDENTITY.tools, reads: [...PI_IDENTITY.tools.reads, "orch_ask"] } };`
  and the options object passes `readOnly: gate`.
- Every call `fire(root, ...)` becomes `fire({ out: root }, ...)`. `fire(null, ...)` stays.
- `other.reason` becomes `` `orch refused this tool: this agent is read-only, and writes only inside ${root}.` ``.
- The `describe` title becomes `"bridge read-only gate"`.
- Add: `fire({ out: null }, "write", { path: "notes.md", content: "x" }).answer` equals
  `{ block: true, reason: "orch refused this tool: this agent is read-only." }`, and
  `fire({ out: null }, "read", { path: "src/a.ts" }).answer` is `undefined`.
Edit `packages/orch/test/claude-tool-gate.test.ts`: `WriteRootGate` becomes `ReadOnlyGate`
imported from `"../src/policy/read-only.ts"`, `gate` becomes
`{ out: root, cwd, tools: CLAUDE_TOOLS }`, the denial reason for `Bash` and `NotebookEdit`
becomes `` `orch refused this tool: this agent is read-only, and writes only inside ${root}.` ``,
and add: with `{ out: null, cwd, tools: CLAUDE_TOOLS }`,
`{ tool_name: "Write", tool_input: { file_path: "/repo/notes.md", content: "x" } }` is denied
with the reason `"orch refused this tool: this agent is read-only."`.
In `packages/orch/test/bridge-command-gate.test.ts`, `packages/orch/test/bridge-terminal.test.ts`
and `packages/orch/test/bridge-reasserts-pin.test.ts`: `writeRoot: null` becomes `readOnly: null`.
Test files: `packages/orch/test/bridge-read-only.test.ts packages/orch/test/bridge-command-gate.test.ts packages/orch/test/claude-tool-gate.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R2 The adapters and the policy tests
Edit `packages/orch/src/adapters/pi.ts`:
- Delete `import type { ToolVocabulary } from "../policy/write-root.ts";` (L16) and add
  `ReadOnlyRole` to the type import from `"../types/adapter.ts"` (L13).
- `abstract readonly writeRoot: WriteRootRole;` becomes `abstract readonly readOnly: ReadOnlyRole;`.
- `readonly writeRoot = { tools: PI_TOOLS };` becomes `readonly readOnly = { tools: PI_TOOLS };`.
Edit `packages/orch/src/adapters/omp.ts`: `readonly writeRoot = { tools: OMP_TOOLS };` becomes
`readonly readOnly = { tools: OMP_TOOLS };`.
Edit `packages/orch/src/adapters/codex.ts` and `packages/orch/src/adapters/opencode.ts`:
`readonly writeRoot = null;` becomes `readonly readOnly = null;`.
Edit `packages/orch/src/adapters/claude.ts`:
- `import { writeRootTools } from "../policy/write-root.ts";` becomes
  `import { readOnlyTools } from "../policy/read-only.ts";`.
- `readonly writeRoot = { tools: CLAUDE_TOOLS };` becomes `readonly readOnly = { tools: CLAUDE_TOOLS };`.
- `writeRootArgv` and its doc comment become
  ```ts
  /** Claude's `--tools` for a read-only worker: the tools that read, and the two that write when it has an output directory. */
  function readOnlyArgv(opts: SpawnOpts): string[] {
    const readOnly = opts.workers === undefined ? null : opts.workers.readOnly;
    return readOnly === null ? [] : ["--tools", readOnlyTools(CLAUDE_TOOLS, readOnly).join(",")];
  }
  ```
  and its two callers call `readOnlyArgv(opts)`.
Edit `packages/orch/test/helpers/adapter.ts`: `writeRoot: null,` becomes `readOnly: null,`.
In `packages/orch/test/adapter-allowlist.test.ts`, `packages/orch/test/orch-bugs-4-5.test.ts`,
`packages/orch/test/claude-adapter.test.ts` and `packages/orch/test/compaction-env.test.ts`:
every `writeRoot: null` becomes `readOnly: null`, and every `writeRoot: "/repo/out"` becomes
`readOnly: { out: "/repo/out" }`. Then:
- `adapter-allowlist.test.ts`: the test title `"a write-root policy names the tools the worker keeps and leaves the built-ins on"`
  becomes `"a read-only policy names the tools the worker keeps and leaves the built-ins on"`.
- `claude-adapter.test.ts`: the test title becomes
  `"a read-only worker launches with only the tools that read, and the two that write when it has an output directory"`,
  and add inside it:
  ```ts
      const noOut = { ...confined, readOnly: { out: null } };
      expect(claudeAdapter.interactiveArgv({ workers: noOut })).toEqual(["claude", "--strict-mcp-config", "--tools", "Read,Grep,Glob"]);
  ```
- `compaction-env.test.ts`: the test `"a policy with a write root sets it beside the compaction point"` becomes
  ```ts
    test("a read-only policy says so beside the compaction point", () => {
      const out = "/repo/.orch/councils/plan/ada";
      const readOnly = { ...workers, readOnly: { out } };
      expect(policyEnv(claudeAdapter, "haiku", readOnly)).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000", ORCH_READ_ONLY: "1", ORCH_OUT_DIR: out });
      expect(policyEnv(codexAdapter, "gpt-5.5", readOnly)).toEqual({ ORCH_READ_ONLY: "1", ORCH_OUT_DIR: out });
      expect(policyEnv(codexAdapter, "gpt-5.5", { ...workers, readOnly: { out: null } })).toEqual({ ORCH_READ_ONLY: "1" });
    });
  ```
Edit `packages/orch/test/worker-tools.test.ts`:
- The import becomes `import { policyTools, readOnlyPolicy, workerPolicyFrom } from "../src/policy/workers.ts";`.
- Every `workerTools(<x>)` becomes `policyTools(workerPolicyFrom(<x>))`.
- `workerPolicyFrom(settings()).writeRoot` becomes `workerPolicyFrom(settings()).readOnly`, and
  that test's title becomes `"settings alone give a policy that is not read-only"`.
- The test `"a write root leaves only the harness's read and write tools and orch's own"` becomes
  ```ts
    test("a read-only policy leaves the harness's read tools, its write tools when there is an output directory, and orch's own", () => {
      const tools = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };
      const policy = readOnlyPolicy(settings(true, ["bash"]), { out: "/repo/out" }, tools);
      expect(policy.readOnly).toEqual({ out: "/repo/out" });
      expect(policy.allowTools).toEqual(["read", "grep", "edit", "write", "orch_ask", "orch_agents", "orch_send", "orch_read"]);
      expect(policy.inheritExtensions).toBe(false);
      expect(policy.inheritMcp).toBe(false);
      expect(policy.builtinTools).toBe(true);
      expect(readOnlyPolicy(settings(), { out: null }, tools).allowTools).toEqual(["read", "grep", "orch_ask"]);
    });
  ```
Test files: `packages/orch/test/worker-tools.test.ts packages/orch/test/compaction-env.test.ts packages/orch/test/claude-adapter.test.ts packages/orch/test/adapter-allowlist.test.ts packages/orch/test/orch-bugs-4-5.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R3 The store, the registration and the restart
Run no test in this section: the new table has no migration yet.
Edit `packages/orch/src/db/schema.ts`: the `agentWriteRoots` table and its doc comment become
```ts
/** A read-only agent: it keeps the tools that read, and writes only in its output directory
 *  when it has one. An agent with no row has every tool its harness gives it. Written with the
 *  spawn and never changed. */
export const agentReadOnly = sqliteTable("agent_read_only", {
  agentId: text("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  /** The one directory the agent may write in. NULL: it writes nothing. */
  outDir: text("out_dir"),
  setAt: integer("set_at").notNull(),
});
```
Delete `packages/orch/src/store/write-root-rows.ts` and create
`packages/orch/src/store/read-only-rows.ts`:
```ts
// Which agents are read-only, and where each may write. One row per read-only agent.
import { eq } from "drizzle-orm";
import { agentReadOnly } from "../db/schema.ts";
import { orm } from "./connection.ts";
import type { ReadOnly } from "../policy/read-only.ts";
import type { OrchDir } from "../types/core.ts";

/** Record that an agent is read-only, with its output directory. Written once, with the agent's spawn. */
export function setReadOnly(orchDir: OrchDir, agentId: string, now: number, readOnly: ReadOnly): void {
  orm(orchDir).insert(agentReadOnly).values({ agentId, outDir: readOnly.out, setAt: now }).run();
}

/** What a read-only agent is held to, or null for an agent that is not read-only. */
export function readOnlyOf(orchDir: OrchDir, agentId: string): ReadOnly | null {
  const row = orm(orchDir).select({ outDir: agentReadOnly.outDir }).from(agentReadOnly).where(eq(agentReadOnly.agentId, agentId)).get();
  return row === undefined ? null : { out: row.outDir };
}
```
Edit `packages/orch/src/types/store.ts`: in `SpawnRegistration`, the `writeRoot` member and its
doc comment become
```ts
  /** Set for an agent launched read-only, with its output directory. */
  readOnly?: ReadOnly;
```
and add `import type { ReadOnly } from "../policy/read-only.ts";`.
Edit `packages/orch/src/backends/registration.ts`:
`writeRoot: opts.workers?.writeRoot ?? undefined,` becomes
`readOnly: opts.workers?.readOnly ?? undefined,`.
Edit `packages/orch/src/store/spawn-registration.ts`: the import becomes
`import { setReadOnly } from "./read-only-rows.ts";`, the line in `writeEnvironment` becomes
`if (input.readOnly !== undefined) setReadOnly(directory, agentId, now, input.readOnly);`, and
in that function's doc comment `write root` becomes `read-only`.
Edit `packages/orch/src/daemon/server/agent-policy.ts`:
- Import `readOnlyPolicy` from `"../../policy/workers.ts"` in place of `confinedPolicy`, and
  `readOnlyOf` from `"../../store/read-only-rows.ts"` in place of `agentWriteRoot`.
- `relaunchPolicy` and its doc comment become
  ```ts
  /** The policy `agentId` relaunches under on `adapter`: a read-only agent's, or undefined for
   *  any other agent, which relaunches as its harness's own launch. A harness that cannot refuse
   *  a tool call is refused, since the agent would come back with every tool. */
  export function relaunchPolicy(directory: OrchDir, settings: OrchSettings, adapter: AgentAdapter, agentId: string): WorkerPolicy | undefined {
    const readOnly = readOnlyOf(directory, agentId);
    if (readOnly === null) return undefined;
    const role = adapter.readOnly;
    if (role === null) throw new CommandRefusal(`this agent is read-only, and ${adapter.id} cannot hold it to that: orch has no way to refuse its tool calls`);
    return readOnlyPolicy(settings, readOnly, role.tools);
  }
  ```
Edit `packages/orch/src/daemon/server/handlers/relaunch.ts`: the refusal text
`"this agent has a write root, and --cmd replaces the launch that holds it there; restart it without --cmd"`
becomes
`"this agent is read-only, and --cmd replaces the launch that holds it to that; restart it without --cmd"`.
Edit `packages/orch/src/daemon/server/handlers/restart-form.ts`: in the doc comment of
`restartOpts`, `the policy of its write root when it has one` becomes
`its read-only policy when it is read-only`.
Edit `packages/orch/test/store-rebuild-schema.test.ts`: `"agent_write_roots"` becomes
`"agent_read_only"`.
Delete `packages/orch/test/store-write-root-rows.test.ts` and create
`packages/orch/test/store-read-only-rows.test.ts` with the same imports, `dirs`, `afterEach`
and `fixture`, importing `readOnlyOf` and `setReadOnly` from
`"../src/store/read-only-rows.ts"`. Cases, in one `describe("read-only agents", ...)`:
- An agent with no row: `readOnlyOf(dir, "a")` is `null`.
- After `setReadOnly(dir, "a", 5, { out: "/repo/out" })`: `readOnlyOf(dir, "a")` equals `{ out: "/repo/out" }`.
- After `setReadOnly(dir, "a", 5, { out: null })` on a fresh fixture: `readOnlyOf(dir, "a")` equals `{ out: null }`.
- A second `setReadOnly` for the same agent throws.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R4 The spawn request, the plan and the flags
Edit `packages/orch/src/daemon/client/protocol.ts`:
- `SPAWN_AGENT` (L215) gains a last member
  `readOnly: z.object({ out: nonBlank.nullable() }).nullable()`, and this doc comment above it:
  `/** One agent a spawn launches. `readOnly` is set for a read-only agent, with the one directory it may write in, absolute, or null for none. */`
- In the `tile` params, `SPAWN_AGENT.omit({ prompt: true })` becomes
  `SPAWN_AGENT.omit({ prompt: true, readOnly: true })`.
Edit `packages/orch/src/commands/registry.ts`: in the `spawn` entry's `flags`, directly after
the `--tasks` line, add
```ts
      { name: "--read-only", arity: "none", help: "Every agent keeps only the tools that read: no shell, no MCP tool, no extension tool." },
      { name: "--out", arity: "many", placeholder: "<dir>", help: "With --read-only: the one directory an agent may write in. One, or one per name." },
```
Edit `packages/orch/src/commands/spawn/flags.ts`:
- Add `import * as path from "node:path";`.
- `SpawnFlags` gains, after `withPaths`:
  ```ts
    /** `--read-only`: every agent keeps only the tools that read. */
    readOnly: boolean;
    /** `--out`: where a read-only agent may write, one for all or one per agent. */
    outDirs: string[];
  ```
- `parseSpawnFlags` returns `readOnly: flags.has("--read-only"),` and
  `outDirs: [...flags.values("--out")],` after `withPaths`.
- Above `planAgent` add:
  ```ts
  /** What `--read-only` and `--out` ask of one agent: null for an ordinary agent, else its output
   *  directory as an absolute path taken from the directory the agents start in, or none. */
  function readOnlyFor(flags: SpawnFlags, out: string | undefined): { out: string | null } | null {
    if (!flags.readOnly) return null;
    return { out: out === undefined ? null : path.resolve(flags.cwd, out) };
  }
  ```
- `planAgent`: its `agent` parameter type gains `readOnly: { out: string | null } | null`, and
  the object it returns gains `readOnly: agent.readOnly`.
- `resolveSpawnSettings`:
  - Directly after the `if (flags.host !== null) { ... }` block add
    ```ts
    if (!flags.readOnly && flags.outDirs.length > 0) throw usageError(flags.at, "--out names where a read-only agent may write; add --read-only");
    if (flags.readOnly && flags.cmd !== null) throw usageError(flags.at, "--read-only is held by the harness's own launch, and --cmd replaces that launch; drop one");
    ```
  - After `const models = perAgent(...)` add `const outs = perAgent(flags.at, "--out", flags.outDirs, n);`
  - The `planAgent(...)` call passes
    `{ name, adapter, model: models[index], prompt, readOnly: readOnlyFor(flags, outs[index]) }`.
Edit `packages/orch/src/daemon/server/spawn/plan.ts`:
- The workers import becomes
  `import { readOnlyPolicy, workerPolicyFrom } from "../../../policy/workers.ts";`.
- The doc comment of `SpawnAgentCommon.workers` becomes
  `/** What this agent may load. A read-only agent's policy says so. */`.
- `agentPolicy` and its doc comment become
  ```ts
  /** The policy one agent launches under. A read-only agent needs a harness whose integration can refuse a tool call. */
  function agentPolicy(settings: OrchSettings, agent: ParamsOf<"spawn">["agents"][number]): WorkerPolicy {
    if (agent.readOnly === null) return workerPolicyFrom(settings);
    const role = resolveAdapterOrDie(agent.harness).readOnly;
    if (role !== null) return readOnlyPolicy(settings, agent.readOnly, role.tools);
    const able = ADAPTER_IDS.filter((id) => resolveAdapterOrDie(id).readOnly !== null);
    throw new SpawnRefusalError(`${agent.harness} cannot run ${agent.name} read-only: orch has no way to refuse its tool calls. Launch it on one of: ${able.join(", ")}.`);
  }
  ```
Edit `packages/orch/src/daemon/server/spawn/admission.ts`: in `admitSpawn`, the
`const agents = ...` line becomes
```ts
  const offered = offeredModels(catalogue);
  const agents = settings.agents.map((agent) => ({ ...agent, model: admitLaunchModel(settingsFile, agent.adapter, catalogue, agent.model), workers: withLaunchPoints(agent.workers, offered) }));
```
and its last line becomes `return { ...settings, agents };`.
Edit `packages/orch/src/daemon/server/spawn/index.ts`:
- Merge the two imports from `"../../../policy/workers.ts"` (L7, L9) into
  `import { policyEnv, policyTools, workerPolicyFrom } from "../../../policy/workers.ts";`.
- In `executeHeadlessSpawn` (L146-148): `tools: settings.tools,` becomes
  `tools: policyTools(plan.workers),`, `workers: settings.workers,` becomes
  `workers: plan.workers,`, and `settings.workers` in the `policyEnv(...)` call becomes `plan.workers`.
- In `prepareAgents` (L179): the last argument of `spawnEnv(...)` becomes `plan.workers`.
- In `launchPrepared` (L249): `tools: settings.tools, workers: settings.workers,` becomes
  `tools: policyTools(plan.workers), workers: plan.workers,`.
- In the tile handler, directly above `const spec: TabSpawnSpec = {` add
  `const workers = withLaunchPoints(workerPolicyFrom(settingsFile), offeredModels(services.models));`,
  and in `spec`, `tools: workerTools(settingsFile),` becomes `tools: policyTools(workers),` and
  the `workers: withLaunchPoints(...)` line becomes `workers,`.
Edit `packages/orch/src/daemon/server/spawn/placement.ts`:
- In `placeAgent` (L245-246): `tools: settings.tools,` becomes
  `tools: policyTools(plan.workers),` and `workers: settings.workers,` becomes `workers: plan.workers,`.
- Its import from `"../../../policy/workers.ts"` becomes `import { policyEnv, policyTools } from "../../../policy/workers.ts";`.
- In `registerSpawnedTabAgent`, `writeRoot: spec.workers?.writeRoot ?? undefined,` becomes
  `readOnly: spec.workers?.readOnly ?? undefined,`.
Edit `packages/orch/test/commands-spawn.test.ts`: add at the end of the file, getting `dir`,
`tempDirs`, `settingsFor`, `mixedSettingsFor` and `planned` the way the test
`"resolves one model per agent"` does:
```ts
describe("--read-only and --out", () => {
  const readOnlyOf = (args: string[], dir: OrchDir): unknown[] => resolveSpawnSettings(parseSpawnFlags(args), settingsFor(dir)).params.agents.map((agent) => agent.readOnly);

  test("an ordinary spawn asks for no read-only agent", () => {
    const dir = tempOrchDir("orch-spawn-read-only-");
    tempDirs.push(dir);
    expect(readOnlyOf(["a", "b"], dir)).toEqual([null, null]);
  });

  test("--read-only alone gives each agent no output directory", () => {
    const dir = tempOrchDir("orch-spawn-read-only-");
    tempDirs.push(dir);
    expect(readOnlyOf(["a", "b", "--read-only"], dir)).toEqual([{ out: null }, { out: null }]);
  });

  test("--out is one directory for all, or one per name, taken from --dir", () => {
    const dir = tempOrchDir("orch-spawn-read-only-");
    tempDirs.push(dir);
    expect(readOnlyOf(["a", "b", "--read-only", "--dir", "/repo", "--out", "findings"], dir)).toEqual([{ out: "/repo/findings" }, { out: "/repo/findings" }]);
    expect(readOnlyOf(["a", "b", "--read-only", "--dir", "/repo", "--out", "/x/one", "--out", "two"], dir)).toEqual([{ out: "/x/one" }, { out: "/repo/two" }]);
  });

  test("--out without --read-only, a wrong count, and --cmd are refused", () => {
    const dir = tempOrchDir("orch-spawn-read-only-");
    tempDirs.push(dir);
    expect(() => readOnlyOf(["a", "--out", "x"], dir)).toThrow(/--out names where a read-only agent may write; add --read-only/);
    expect(() => readOnlyOf(["a", "b", "c", "--read-only", "--out", "x", "--out", "y"], dir)).toThrow(/--out accepts one value for all agents or exactly 3 values/);
    expect(() => readOnlyOf(["a", "--read-only", "--cmd", "pi"], dir)).toThrow(/--read-only is held by the harness's own launch/);
  });

  test("a read-only agent is planned under a policy of its own", () => {
    const dir = tempOrchDir("orch-spawn-read-only-");
    tempDirs.push(dir);
    const plan = planned(parseSpawnFlags(["a", "b", "--harness", "pi", "--read-only", "--dir", "/repo", "--out", "out/a", "--out", "out/b"]), settingsFor(dir));
    expect(plan.agents.map((agent) => agent.workers.readOnly)).toEqual([{ out: "/repo/out/a" }, { out: "/repo/out/b" }]);
    expect(plan.agents[0]?.workers.allowTools).toEqual(["read", "grep", "find", "ls", "edit", "write", "orch_ask"]);
    expect(planned(parseSpawnFlags(["a", "--harness", "pi", "--read-only"]), settingsFor(dir)).agents[0]?.workers.allowTools).toEqual(["read", "grep", "find", "ls", "orch_ask"]);
    expect(planned(parseSpawnFlags(["a", "--harness", "pi"]), settingsFor(dir)).agents[0]?.workers.readOnly).toBeNull();
  });
});
```
Import `OrchDir` as a type from `"../src/types/core.ts"` if the file does not import it yet.
Test files: `packages/orch/test/commands-spawn.test.ts packages/orch/test/spawn-preferred-models.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
