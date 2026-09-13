# 2a-01-target

Model: luna:xhigh
Owns: `src/commands/target.ts`

Goal: no function in this file reaches for `orchDir()`, `loadSettings()`, or `commandLogger()`. Each exported function that did gains a first parameter carrying what it needs, per the value rule in WORKER.md. Every command file is being rewritten in parallel to pass `services`, so callers are not your concern; the tree is expected red until task 2c lands.

Sites to remove (line numbers from before any edit):

- `:78` `export function agentViewIndex(root = orchDir())` → `agentViewIndex(root: string)`. No default.
- `:108` `currentLease(orchDir(), key)` → the enclosing function takes `orchDir: string` (or `services: OrchDirService` if it already takes an options object; pick one and be consistent within the function).
- `:120` `parseTarget(target, loadSettings(orchDir()).hosts)` → enclosing function takes `hosts: OrchSettings["hosts"]` if it needs only hosts, else `services: SettingsService` and reads `services.settings.current().hosts`.
- `:134` `loadSettings(orchDir()).hosts[hostName]` → same treatment as `:120`.
- `:191` `operatorControls(orchDir(), token, ...)` → thread `orchDir`.
- `:232` and `:372` `getBackend(...)` stays; it is a registry lookup by id, not a global reach.
- Every `commandLogger()` call in the file → the enclosing function takes `logger: Logger` (or `services: LoggerService`). Find them with grep on `commandLogger(`.
- `resolveLifecycleTarget` and `resolveTarget`-family exports: whatever mix of the above they use, they take `services: Pick<Services, ...>` naming exactly the members used, since they need more than one thing.

Import `Services`, `OrchDirService`, `SettingsService`, `LoggerService` from `../types/services.ts` and `Logger` from `../types/core.ts` as needed. Remove the `orchDir`, `loadSettings`, and `commandLogger` imports when nothing in the file uses them.

Do not keep any old signature alongside a new one. One shape.

Check: lint, tc on this file will be green; tc on the tree will name every command caller. That is expected. Tests: none named (command tests run after 2c).

Report every changed exported signature under `CALLERS:` as `<symbol> now takes <first param type>` so the delegator can cross-check the 2b tasks.
