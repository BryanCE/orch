# Layers: client, server, shared

The rest of Rule 21 in `CLAUDE.md`, binding like it. Relative paths are inside `packages/orch/` unless they start with `packages/`.

- Client: the CLI (`src/commands/`, `src/cli/`, `bin/orch.ts`), the web UI (`packages/web/src/`), and the harness bridge (`extensions/`, the bridge code in `src/agent/`). A client parses or collects input, calls orchd over RPC, and shows the answer.
- Server: `src/daemon/server/`, `src/store/`, `src/presence/`, `src/backends/`, `src/adapters/`, `src/control/`, `src/pty/`, `src/hosts/`, `src/worktrees/`, `src/entities/`, process identity and placement, and `node:child_process`. Only orchd imports it. The exact list is `SERVER` in `scripts/check-layers.ts`.
- Shared: types, the wire protocol (`src/daemon/client/`), settings, and pure helpers with no I/O. Shared never imports server code.
- Inside orchd, an agent's machine-specific state (process, PTY, pane, session file, log, worktree, delivery) is reached only through its placement. Code that has not proved the agent runs here cannot touch it.
- Location is never implied. Every agent's host is stored, this machine included. No null, no missing row and no default means "here".
