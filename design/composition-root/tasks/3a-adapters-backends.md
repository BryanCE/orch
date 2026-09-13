# 3a-adapters-backends

Owns: `src/adapters/claude.ts`, `src/adapters/codex.ts`, `src/adapters/model-catalogue.ts`, `src/backends/headless/index.ts`, `src/backends/herdr/notify.ts`, `src/backends/herdr/hud.ts`. Follow `3a-README.md`.

Sites:
- `claude.ts:101`, `:310` `declaredRuntime(orchDir())` and `:112`, `:165` `claudeHookCommand(shim, event, runtime, orchDir())` → `orchDir: string`
- `codex.ts:41`, `:42` same shape
- `model-catalogue.ts:40` `const directory = orchDir();`, `:59` `writeCatalogue(orchDir(), ...)`, `:127` `clearCatalogues(orchDir())` → `orchDir: string`. Also note the module-level `let stored`, `let storedFrom` at `:34-35`; do not change them in this task, but report their line numbers so the delegator can write a follow-up.
- `headless/index.ts:25` `return override ?? orchDir();` with the comment at `:23` → the function takes `orchDir: string` required; delete the `??` and the comment
- `herdr/notify.ts:11` `loadSettingsOrNull(orchDir())?.enabled.backends.includes("herdr") ?? false` → `settings: OrchSettings | null`, keep `?? false`
- `herdr/hud.ts:65` `environmentOf(orchDir(), id)` → `orchDir: string`

Adapters are constructed through the provider registry (`src/adapters/registry.ts` or similar). If an adapter method needs `orchDir` and the port type in `src/types/adapter.ts` does not carry it, report BLOCKED naming the port method; do not change the port in this task.
