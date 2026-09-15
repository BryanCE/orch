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

### 3. Help renders from the spec. Done.

- `src/cli/help.ts`: `renderMap(commands)`, `renderTopic(spec, doc, globals)`, `HELP_HEADER`.
- `src/cli/doc.ts`: `helpDocPath(name)`, `readHelpDoc(name)`.
- `src/commands/index.ts`: `usage()` prints the map; `helpTopic(word)` is exported and
  renders the topic. `commandHandlers` is exported. `src/commands/help.ts` is deleted.
- `src/doctor/help-docs.ts`: `checkHelpDocs()`, wired in `runner.ts` as `help-docs`.
- `test/cli-help.test.ts`: handlers and specs match one to one; the map equals
  `test/golden/help.txt`; a missing doc never throws. Golden re-rendered.

### 4. Commands read the parser. Done.

- Every `cmdX(services, args)` opens with `parseCommand("<name>", args)` from
  `src/commands/registry.ts` and reads `flags`, `positional`, and `command.name`.
- Subcommand routers (`tab`, `space`, `queue`, `review`, `daemon`, `settings`, `notify`)
  switch on the matched child spec. `src/commands/index.ts` has no hand router.
- `splitOptionFlags`, `parseTargetPrompt`, `readAssignFlag`, `readValueFlag`,
  `readModelFlags`, `readSpawnFlag`, and `parseQueueInvocation` are deleted.
- Dead flags removed with their code: dispatch `--wait`/`--then`, restart `--hard`,
  close and abort `--force`, queue add `--close`.

### 5. Skill reference. Done.

- `skills/orch/reference/commands.md` is a situation-to-`orch help <cmd>` table plus the
  rules that span commands (targets, reuse before spawn, steer once, arrange without
  focus). Per-command text lives only in `help/<cmd>.md`.
