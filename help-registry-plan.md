# Help registry

Goal: every orch command declares its flags once. The parser and `orch help` read that one
table. Doctrine per command lives in `packages/orch/help/<cmd>.md`, shipped in the package
and read at runtime. This is the `git` and `npm` model.

Done when: `help.ts` and the `usage()` string in `src/commands/index.ts` are deleted, every
command reads the parser instead of `args`, and a test proves every handler has a spec,
every flag has a help line, and every spec has its doc file.

Paths below are inside `packages/orch/`.

## Decisions in force

- `--flag value` and `--flag=value` both work, on every command.
- An unknown flag dies with that command's usage line.
- A repeatable flag (`--file`, `--model`, `--with`, `--prompt`) collects into an array.
- Subcommands (`tab`, `space`, `queue`, `review`, `daemon`, `settings`, `notify`) are child
  specs of the parent. One doc file per parent holds every child.
- `orch help <cmd>` prints usage, the doc file, then the flag table. A missing doc file prints
  usage and the flag table plus one line naming the missing path. It never throws.
- The doc file is read from `join(packageRoot(), "help", name + ".md")`. In the repo build
  that is the checkout, so a doc edit is live with no rebuild.
- No flag is renamed, added, or removed. Same argv in, same result out.

## Steps

### 1. Spec, parser, registry. Done.

- `src/cli/spec.ts`: `FlagSpec`, `CommandSpec`, `Invocation`, `UsageError`.
- `src/cli/parse.ts`: `parseInvocation(spec, argv, globals)`.
- `src/commands/registry.ts`: `COMMANDS`, `GLOBAL_FLAGS`, `commandSpec(word)`. 50 top-level
  specs, every flag that exists today.
- `test/cli-parse.test.ts`, `test/cli-registry.test.ts`.

### 2. Doc files. Done.

- `help/<cmd>.md`, one per top-level command, 50 files. Doctrine only; flag tables render
  from the spec. The registry test fails when a command has no doc.
- `package.json` `files` has `"help/"`.

### 3. Help renders from the spec. First change to existing code.

- `src/cli/help.ts`: `renderMap(registry)`, `renderTopic(spec, doc)`.
- `src/cli/doc.ts`: `readHelpDoc(name)`.
- `src/commands/index.ts`: `orch help`, `orch help <cmd>`, `orch <cmd> -h` route through them.
  `help.ts` and the `usage()` string are deleted.
- `src/doctor/`: one check, every registered command has its doc file.
- `test/cli-help.test.ts`: every handler has a spec, every spec has a summary, every flag has
  a help line, every spec has a doc file. `test/golden/help.txt` re-rendered.

### 4. Commands read the parser. 22 files, file-disjoint, sliced into waves.

- `cmdX(services, args)` becomes `cmdX(services, invocation)`.
- `args.includes("--json")` becomes `invocation.flags.json`.
- The six hand routers drop their `args[0] === "..."` chains; the parser routes to the child.
- `spawn/flags.ts` drops `readSpawnFlag` and `parseSpawnFlags`, keeps per-agent resolution.
- `dispatch --then <target> <note...>`: the parser takes the target as the flag's value; the
  note is every positional after the prompt. `control.ts` reads it from there.

### 5. Skill reference.

- `skills/orch/reference/commands.md` shrinks to what `help/<cmd>.md` does not say. Where
  the doc carries the text, the reference points at `orch help <cmd>`.
