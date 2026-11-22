Score: 8/10

**Criterion 4, as the user now defines it, holds everywhere I checked:**
- `PROJECT_SETTINGS_FILE_SCHEMA` is strict and built from `PROJECT_KEYS`.
- `project-setting-write` validates the whole file.
- The ruling, the claude hook and the pi/omp bridge all take install `gatedPatterns` plus the project's locks.
- An invalid file, or no answer from orchd, falls back to the install locks alone.
- `locked_commands.applies_to`, `gated_commands`, `denied_commands` and `models.allowed` stay install-only.
- A spoofed `cwd` on `command-lock` can only change which project locks are added.

What keeps the score from 10 is criteria 1 and 2: one false fact about the bridge, two flows that conflict with the plan's own directory rule, and some citation drift.

**On the other members' round 2:**
- Both lead items, the approval-laundering hole, are moot under the ruling.
- **GPT asks to send every bash call through orchd, refused when orchd is down.** I agree with the plan's refusal. A lock only makes a command wait, and that change is outside this job.
- **GPT's `min(project, install)` for `council.rounds`** is ruled out.
- **GPT asks to prove the worktree marker.** I disagree. git refuses a `.git` path in any tree, so a clone cannot plant one. Only a local actor can, and a local actor can already edit the file.
- **GPT says absence of an agent row is not operator authority.** I agree, and it is still open as item 3.
- **Sonnet's union-source row and old-peer points** are now answered: the row is display-only, and both hosts run the same build.

## Improvements

1. **"The list an agent's process wraps with", pi/omp bullet: the plan's claim about `before_agent_start` is false, and the first call can race.**
   - The handler at `packages/orch/src/agent/tools.ts:203-209` is a synchronous arrow function. It is not "already async".
   - The bullet should say that the handler returns the `project-locks` promise, and whether pi and omp await a promise returned from `before_agent_start` before the turn runs.
   - If they await it, say so with the harness API that guarantees it.
   - If they do not, the first `tool_call` of every prompt can run against a list that does not have the answer yet. Say which list it uses then: the previous prompt's answer, and the install locks alone on the first prompt.
   - Add that case to `bridge-command-gate.test.ts`.

2. **"`council.models` and `council.rounds`", lineup bullet: resolve the lineup against the council's `cwd` for every caller, and say where the models check runs.**
   - The conflict: "Which directory" says an agent caller's `cwd` is ignored, and `project-settings` takes `{ cwd }`. So when an orch agent runs `orch council convene … --dir <other repo>` (`packages/orch/src/commands/council.ts:24-26`), the lineup would come from the orch's own repository. But "A council: the `cwd` its request carries" makes the round limit come from `--dir`. One council would take its lineup and its rounds from two different project files.
   - Say that a council resolves against its request `cwd` whatever the caller kind, and how the CLI asks for that: a `council: true` flag on `project-settings`, or orchd resolving the lineup inside `conveneCouncil`.
   - Say where "only `convene` is refused" happens. Is it the CLI running `requireCouncilModelsAllowed` on the returned row, an `error` field on the row, or `admitModel` at launch (`packages/orch/src/daemon/server/handlers/lifecycle.ts:70`), which already refuses a model outside `models.allowed`? With one of those named, the resolver can return `state: "ok"` for that file without contradiction.

3. **"Which directory a request resolves against" and `project-setting-write`: map every `CallerKind`, not only agent and operator.**
   - `callerKindOf` (`packages/orch/src/policy/caller.ts:12-26`) also returns `"session"`, a harness session with a launch credential or session but no claimed row, plus whatever `kind` an agent row holds. The orch skill's orchestrator is often such a session.
   - For each kind, say how its directory is found and whether a write is allowed. The proposed rule: a caller whose `selfIdentityOf` resolves to a row with a stored location here uses that location. Any other non-operator is refused with a message naming the missing registration. It never falls back to the `cwd` it sends.
   - Add the `"session"` case to `project-setting-write.test.ts`.

4. **"`orch settings` inside a repository", A write / `--clear` / the editor: say how the CLI knows it is inside a repository.**
   - The CLI cannot call `repositoryRootOf` (it is server code). Yet "by the operator outside a repository, it writes the install file" and "Outside one there is only the Install view" are both decisions the CLI must make.
   - State the rule: the CLI first asks `project-settings { cwd }`, and `file: null` means outside, so it writes the install file. Or: `project-setting-write` answers `{ outcome: "no-repository" }` for the operator, and the CLI then writes the install file.
   - Name the result shape of `project-setting-write`. Today the plan gives only its parameters.

5. **"Linked hosts", A spawn: compose the header where both linked forms use the prompt.**
   - `spawnHeadless` puts `params.prompt` into `opts.prompt` at `lifecycle.ts:81-91`, and the detached headless branch launches with it at `lifecycle.ts:105`. Composing only "before it hands `firstPrompt` to `spawnHeldLaunch` (`lifecycle.ts:113`)" leaves a linked headless-form agent with a raw prompt and no worker header. Say that the composition happens once, before `opts` is built at `:83`.
   - Say that `spawnOnHost` forwards `worker`. It destructures an explicit field list at `lifecycle.ts:138-139`, so the field is dropped unless it is added there.
   - Say that `storedHeaderContext` (`packages/orch/src/daemon/server/handlers/write.ts:331`) moves into the `here` branch with the rules, and that `peerDrive` (`packages/orch/src/daemon/server/handlers/drive.ts:93`) adds the far host's own stored context.

6. **"Sources": give the merged `locked_commands.commands` row one `source` value.** The table shows `project + install` as display only, but `source: SettingSource` must still hold one of the four words in `--json`. State it: `project` when the project list is non-empty, else the install row's source.

7. **Fix the citations that drifted. The plan calls itself "the checked one".**
   - The claude hook's awaited handler table is `extensions/claude/index.ts:155-163`, not `:146-154`, which are `reportNotification` and `reportPrompt`.
   - `gateToolCall` is `:87`.
   - The `settings` flags are `src/commands/registry.ts:436-438`.
   - `dispatch`'s `worker` is `src/daemon/client/protocol.ts:671`.
   - `sourceFor` is `src/settings/shell/state.ts:20`.
   - `agentSettingRefusal` is `src/policy/agent-settings.ts:31`.

8. **"Documents that change": add the files that name these settings or flags.**
   - `packages/orch/skills/orch-council/SKILL.md:101` points at "the `council.models` row of `orch settings`", which now has a Project view.
   - `packages/orch/help/council.md` covers the lineup and the round limit.
   - `packages/orch/skills/orch/reference/commands.md` lists `orch settings` and needs `--install` and `--clear`.

9. **"Tests": fix the worktree fixture and add the cases above.**
   - The "worktree reading the main root's file" case needs a `.git` file with a `gitdir:` line and a `commondir` file under the temp dir (`packages/orch/src/worktrees/repository.ts:17-24`), not a `.git` directory.
   - Add a linked headless-form spawn that carries the header (item 5) to `acp-far.test.ts`.
   - Add a convene with `--dir` from an agent caller (item 2) to `council-command.test.ts`.
