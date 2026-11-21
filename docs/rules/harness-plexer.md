# Harness, plexer, protocol: the axes and where code lives

The rest of Rules 9 and 10 in `CLAUDE.md`, binding like them. Relative paths are inside `packages/orch/` unless they start with `packages/`.

## Rule 9. The axes
- The axes, each varying on its own. A harness is the agent program. A backend is what holds the agent's process and its stdio: a plexer's pane, orchd itself (`held`), or nothing (`headless`). "Backend" in code and settings and "plexer" in the CLI and the store name that one slot. A form is one way a harness runs: `tui` needs a terminal, `acp` needs pipes, `oneshot` needs nothing. A backend states the stdio it offers, and spawn and restart match form to backend on that alone.
- A protocol several harnesses speak, like ACP, is not a harness, not a backend and not a plexer. Its wire format lives in one module of its own (`src/acp/`). What one harness's binding needs (argv, env, session sharing) lives on that harness's adapter as a nullable role.
- A channel is a live link orchd drives an agent through: keys, a bridge, an ACP session. The dispatcher picks one per action from what the agent's form declares. A channel is never stored.
- Adding a form, a protocol or a channel edits no command, no renderer and no policy.

## Rule 10. Where each kind of code lives
- Harness is not backend. Code gated on a plexer (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) goes in `src/backends/<plexer>/`, never `extensions/`.
- A protocol is neither. Code that speaks a protocol several harnesses share goes in `src/<protocol>/` (`src/acp/`), never `extensions/`, never `src/backends/`, never an adapter. `scripts/check-bridge.ts` fails on its method names or its SDK import anywhere else.
- The presence protocol is orch's, and it is the daemon socket. A harness reports state, results, and control outcomes over RPC (`report-status`, `report-result`, `control-outcome`) and never touches `$ORCH_DIR/agents/`. orchd owns that directory and appends `status.jsonl`, `results.jsonl`, `outcomes.jsonl` there as history. Nothing reads those files to make a decision. `rm -rf $ORCH_DIR/agents/*` loses history and nothing else. The one history appender lives in `src/presence/`.
- Bundle output names are decoupled from source dirs in `src/bridge-bundles/metadata.ts`. Renaming a source dir must not rename a shipped artifact. The `build:*` scripts in `packages/orch/package.json` are the only bundler; runtime `src/**` never bundles.
- `scripts/check-bridge.ts` enforces this. Its `extensions` scan must stay recursive or it scans nothing and passes.
