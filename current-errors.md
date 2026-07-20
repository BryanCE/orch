$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x eslint(no-unused-vars): Variable 'identity' is assigned a value but never used. Unused variables should start with a '_'.
    ,-[extensions/codex/index.ts:52:5]
 51 | if (!key) process.exit(0);
 52 | let identity: ReturnType<typeof parseIdentity>;
    :     ^^^^|^^^
    :         `-- 'identity' is declared here
 53 | try {
 54 |   identity = parseIdentity(key);
    :   ^^^^|^^^
    :       `-- it was last assigned here
 55 | } catch (error: unknown) {
    `----
  help: Did you mean to use this variable?

  x eslint(no-unused-vars): Variable 'identity' is assigned a value but never used. Unused variables should start with a '_'.
     ,-[extensions/claude/index.ts:129:5]
 128 | if (!key) process.exit(0);
 129 | let identity: ReturnType<typeof parseIdentity>;
     :     ^^^^|^^^
     :         `-- 'identity' is declared here
 130 | try {
 131 |   identity = parseIdentity(key);
     :   ^^^^|^^^
     :       `-- it was last assigned here
 132 | } catch (error: unknown) {
     `----
  help: Did you mean to use this variable?

Found 0 warnings and 2 errors.
Finished in 606ms on 169 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
