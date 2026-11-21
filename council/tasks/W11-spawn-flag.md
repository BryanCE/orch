# W11: `orch spawn --write-root`

Context. An agent launched with a write root may change files only inside that one directory,
and launches with no shell. This task lets a spawn name that directory per agent and carries
it to orchd on the wire. orchd's side is another task. Paths are from the repo root
`/home/bryan/orch`. Code style: TypeScript, no `as` casts, no `any`, double quotes, a
`/** ... */` doc comment on every export.

Verify: run exactly these from the repo root, once, after the edits. Ignore any other verify
command your header names; it belongs to another project. Run no typecheck.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test packages/orch/test/commands-spawn.test.ts
```

## T13 The flag and the wire field
Edit `packages/orch/src/daemon/client/protocol.ts`:
- `SPAWN_AGENT` (L215) gains a last member `writeRoot: nonBlank.nullable()`, and this doc
  comment above it:
  `/** One agent a spawn launches. `writeRoot` is the one directory it may write in, absolute, or null when it writes wherever its harness does. */`
- In the `tile` params (L705), `SPAWN_AGENT.omit({ prompt: true })` becomes
  `SPAWN_AGENT.omit({ prompt: true, writeRoot: true })`.
Edit `packages/orch/src/commands/registry.ts`: in the `spawn` entry's `flags`, directly after
the `--tasks` line (L219), add
```ts
      { name: "--write-root", arity: "many", placeholder: "<dir>", help: "The one directory an agent may write in; it launches with no shell. {name} stands for the agent's name. One, or one per name." },
```
Edit `packages/orch/src/commands/spawn/flags.ts`:
- Add `import * as path from "node:path";`.
- `SpawnFlags` gains, after `withPaths`:
  ```ts
    /** The directories the agents may write in: one for all, or one per agent. `{name}` stands for the agent's name. */
    writeRoots: string[];
  ```
- `parseSpawnFlags` returns `writeRoots: [...flags.values("--write-root")],` after `withPaths`.
- Above `planAgent` add:
  ```ts
  /** What `--write-root` writes for the agent's own name. */
  const NAME_TOKEN = "{name}";

  /** One agent's write root as an absolute path, taken from the directory the agents start in. */
  function writeRootFor(flags: SpawnFlags, root: string | undefined, name: string): string | null {
    return root === undefined ? null : path.resolve(flags.cwd, root.replaceAll(NAME_TOKEN, name));
  }
  ```
- `planAgent`: its `agent` parameter type gains `writeRoot: string | null`, and the object it
  returns gains `writeRoot: agent.writeRoot`.
- `resolveSpawnSettings`:
  - Directly after the `if (flags.host !== null) { ... }` block add
    `if (flags.cmd !== null && flags.writeRoots.length > 0) throw usageError(flags.at, "--write-root confines the harness's own launch, and --cmd replaces that launch; drop one");`
  - After `const models = perAgent(...)` add
    `const roots = perAgent(flags.at, "--write-root", flags.writeRoots, n);`
  - The `planAgent(...)` call passes
    `{ name, adapter, model: models[index], prompt, writeRoot: writeRootFor(flags, roots[index], name) }`.
Edit `packages/orch/test/commands-spawn.test.ts`: add one `describe("--write-root", ...)` at the
end of the file. Each case calls
`resolveSpawnSettings(parseSpawnFlags([...]), settingsFor(dir)).params.agents.map((agent) => agent.writeRoot)`
and gets `dir` and `settingsFor` the way the test `"collects repeated models"` near L318 does.
Cases:
- `["a", "b"]` gives `[null, null]`.
- `["a", "b", "--dir", "/repo", "--write-root", "out/{name}"]` gives `["/repo/out/a", "/repo/out/b"]`.
- `["a", "b", "--dir", "/repo", "--write-root", "/x/one", "--write-root", "two"]` gives `["/x/one", "/repo/two"]`.
- `["a", "b", "c", "--write-root", "x", "--write-root", "y"]` throws
  `/--write-root accepts one value for all agents or exactly 3 values/`.
- `["a", "--write-root", "x", "--cmd", "pi"]` throws `/--write-root confines the harness's own launch/`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
