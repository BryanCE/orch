## 1. Every place skills are shipped, read, copied, linked, listed, or cleaned up
- `packages/orch/package.json` publishes the whole `skills/` tree through its `files` allowlist; build scripts do not separately copy skills, so packaging includes the directory as-is. `packages/orch/package.json:22-30,58-65`
- `packagedSkillNames()` lists immediate child directories under `<packageRoot>/skills`; it is used by setup, doctor, and reset. `packages/orch/src/setup/skills.ts:34-41`
- `writeSkillToStore()` recursively copies each listed `skills/<name>` directory into the configured store, replacing the prior entry. `packages/orch/src/setup/skills.ts:43-49`
- `linkSkillIntoHarness()` replaces `<configured link root>/<name>` with a symlink/junction to the store copy. `packages/orch/src/setup/skills.ts:52-59`
- `installSkills()` copies every scanned skill to the store and links each one into every configured link root. `packages/orch/src/setup/skills.ts:70-83`
- Setup displays the scanned skill names in the consent prompt, and when consent is on calls `installSkills(roots)`; `offerSkills()` is called after integration. `packages/orch/src/commands/setup.ts:38-44,49-68,156-163`
- Setup flags `--skills`/`--no-skills` select install consent. `packages/orch/src/setup/flags.ts:28-29,34-45`
- `orch settings skills` can change the store/link roots and calls `installSkills()` when installation is enabled. `packages/orch/src/commands/settings.ts:191-207,209-217`
- Schema defaults store real copies in `~/.agents/skills` and links into `~/.claude/skills`; only Claude is in the default link list. `packages/orch/src/settings/schema.ts:127-129`
- The package settings allowlist includes `skills/`; no skill-specific build script exists. `packages/orch/package.json:22-30,58-65`
- Doctor calls `packagedSkillNames()`, reads each packaged directory for digest comparison, and checks the corresponding store and configured links. `packages/orch/src/daemon/server/doctor/skills.ts:24-49`
- Doctor’s warning includes the actionable mismatch hint `fix: orch settings skills --skills`; its runner registers the check and the CLI prints the result detail. `packages/orch/src/daemon/server/doctor/skills.ts:8,53-62`; `packages/orch/src/daemon/server/doctor/runner.ts:146`; `packages/orch/src/commands/doctor.ts:65-71`
- Reset reads the recorded skill roots (falling back to defaults) and removes each scanned packaged skill there; build cleanup deliberately skips that removal. `packages/orch/scripts/reset.ts:160-176`
- `.npmignore` inside the orch skill excludes its `evals/` subtree from package publication. `packages/orch/skills/orch/.npmignore:1`

## 2. Skill install directory by harness
- pi: the shared store is `~/.agents/skills`; setup creates no pi-specific link by default. `packages/orch/src/settings/schema.ts:127-129`; `packages/orch/src/setup/skills.ts:73-83`
- omp: the shared store is `~/.agents/skills`; setup creates no omp-specific link by default. `packages/orch/src/settings/schema.ts:127-129`; `packages/orch/src/setup/skills.ts:73-83`
- claude: the shared store is `~/.agents/skills`, with a default link at `~/.claude/skills`; the generic installer `installSkills()` writes the copy and link. `packages/orch/src/settings/schema.ts:127-129`; `packages/orch/src/setup/skills.ts:73-83`
- codex: the shared store is `~/.agents/skills`; setup creates no codex-specific link by default. `packages/orch/src/settings/schema.ts:127-129`; `packages/orch/src/setup/skills.ts:73-83`
- opencode: the shared store is `~/.agents/skills`; setup creates no opencode-specific link by default. `packages/orch/src/settings/schema.ts:127-129`; `packages/orch/src/setup/skills.ts:73-83`
- These are configurable roots, not per-harness installer branches: `SkillRoots` carries one store and an array of link roots, all handled by `installSkills()`. `packages/orch/src/setup/skills.ts:19-24,70-83`

## 3. How the shipped skill set is decided
It is a directory scan, not a list or a hard-coded `orch` name:
```ts
const source = path.join(pkgRoot, "skills");
if (!files.existsSync(source)) return [];
return files.readdirSync(source, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
```
`packages/orch/src/setup/skills.ts:34-41`

## 4. Doctor’s installed-skill checks and mismatch message
- If settings are absent, installation is off, or the build has no packaged skill directories, doctor skips the check. `packages/orch/src/daemon/server/doctor/skills.ts:27-34`
- For every packaged skill it checks that the store copy exists, matches the packaged content digest, and each configured harness entry is a link resolving to that store copy. `packages/orch/src/daemon/server/doctor/skills.ts:36-50`
- On defects it returns `warn` with the defect details followed by `fix: orch settings skills --skills`; the safe fix reinstalls the skills and relinks roots. `packages/orch/src/daemon/server/doctor/skills.ts:8,53-62`
- Doctor’s normal table prints the result detail (including the mismatch hint); JSON mode includes the result object. `packages/orch/src/commands/doctor.ts:65-71`

## 5. Eval contents and runner
- `evals/` contains two case definitions: `skill-loads` is a smoke case verifying the model loads the skill, while `plan-per-agent-harness` scaffolds an orch source task and grades the resulting agent plan. `packages/orch/skills/orch/evals/skill-loads/case.yaml:1-18`; `packages/orch/skills/orch/evals/plan-per-agent-harness/case.yaml:1-52`
- The plan case includes `fixture.sh`, which unpacks the pre-fix source fixture into an eval workspace. `packages/orch/skills/orch/evals/plan-per-agent-harness/case.yaml:6-7`; `packages/orch/skills/orch/evals/plan-per-agent-harness/fixture.sh:1-7`
- `RESULTS.md` records benchmark results, methodology, and the exact smoke and compare invocations; no repository script runs these cases. The runner is the documented `claude plugin eval` CLI command. `packages/orch/skills/orch/evals/RESULTS.md:1-5,92-105`
- The eval directory is excluded from publishing via the skill’s `.npmignore`. `packages/orch/skills/orch/.npmignore:1`

## 6. Files to edit to ship `packages/orch/skills/council/`
- No existing file needs an edit: `packages/orch/package.json:63` already includes all of `skills/`; `packagedSkillNames()` scans all immediate skill subdirectories and `installSkills()` installs each one. Add the new skill directory/files only. If council also has eval fixtures, add an appropriate `.npmignore` in that new directory to exclude them, matching `packages/orch/skills/orch/.npmignore:1`.
