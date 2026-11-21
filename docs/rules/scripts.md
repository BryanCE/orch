# Package scripts

Read before adding or editing a `package.json` script.

Root scripts: every verb runs from the root and delegates through `bun --filter`. A bare verb covers the whole workspace (`bun check`, `bun run build`). `:orch` or `:web` scopes it to one package (`bun run check:web`, `bun run build:orch:dev`). Verbs with no counterpart in the other package (`db:*`, `reset`, `reinstall`, `fallow:*`) stay unsuffixed. A package owns its own verbs. The root only fans out, one explicit entry per package, so a missing script fails loudly instead of matching nothing.

Never call a bare `orch` from a package.json script. The workspace links `node_modules/.bin/orch` to the repo-local `packages/orch/dist/bin/orch.js`, which shadows the installed CLI inside every `bun run`. The repo build's `packageRoot()` then points harness shims and shebangs at the checkout instead of `~/.local/lib/node_modules/@bryance/orch`. Scripts resolve `ORCH=$(npm prefix -g)/bin/orch` and invoke that.
