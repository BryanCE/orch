# 2a-02-entities

Owns: `src/entities.ts`

Goal: this file is a leaf. It takes plain values and never reaches for `orchDir()` or `loadSettings()`. Callers are being rewritten in parallel; the tree is expected red until task 2c.

Sites (line numbers from before any edit):

- `:35` `const configured = hosts ?? loadSettings(orchDir()).hosts;` → `hosts` becomes a required parameter of the enclosing function; the line becomes `const configured = hosts;` or the variable is removed.
- `:50` `function viewsById(root = orchDir())` → `viewsById(root: string)`.
- `:81`, `:91`, `:113`, `:193`, `:232`, `:334`, `:409` each call `agentById(orchDir(), ...)`, `spaceOf(orchDir(), ...)`, `currentLease(orchDir(), ...)`, or `checkWall(orchDir(), ...)`. The enclosing exported function gains `root: string` as its first parameter and passes it. Where the enclosing function is private, thread `root` from its exported caller inside this file.
- `:409` also calls `selfId()` from `src/identity/self.ts`, which reaches for `orchDir()` internally. Leave that call as is; task 3a-identity-self changes it.

Remove the `orchDir` and `loadSettings` imports once unused.

Check: lint, tc on this file green; tree tc will name callers in `src/commands/*`, expected. Tests: `test/agent-key-is-minted-id.test.ts` and any test that imports `entities.ts` (`grep -l "entities" test/*.ts`); some will fail to compile until 2c, which is expected. Run them once, paste the output, do not fix tests.

Report every changed exported signature under `CALLERS:`.
