# 2a-01a-target-orchdir

Owns: `src/commands/target.ts`. Chain: this, then `2a-01b`, then `2a-01c`, same agent, context kept.

Goal: only the `orchDir()` reaches in this file. Nothing else changes in this slice.

Sites (line numbers from before any edit):
- `:78` `export function agentViewIndex(root = orchDir())` → `agentViewIndex(root: string)`. No default.
- `:108` `currentLease(orchDir(), key)` → the enclosing function takes `orchDir: string` as its first parameter and passes it.
- `:191` `operatorControls(orchDir(), token, ...)` → same.

Any private function between an exported one and these sites gets `orchDir` threaded through. Callers in `src/commands/*` are being rewritten in parallel; the tree is expected red. Do not keep an old signature alongside a new one.

Check: lint, tc on this file. Tests: none named.
Report every changed exported signature under `CALLERS:` as `<symbol> now takes <first param>`.
