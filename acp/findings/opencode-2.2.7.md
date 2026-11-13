# opencode 2.2.7: what an orch integration builds on

Read on 2026-11-12 from the local install (`~/.opencode/bin/opencode`, `--help` output, the
compiled binary, the sqlite schema) and the V2 docs (https://opencode.ai/docs/llms.txt). The
plugin types come from `@opencode/plugin@2.2.7` on npm. Nothing here was run against a model.

## V2 is a rewrite

- V1 plugins do not run. V1 hook names (`tool.execute.before`, `permission.ask`) are gone.
- Packages: plugin SDK `@opencode/plugin`, client `@opencode/client`, CLI `@opencode/cli`.
  `opencode-ai` and `@opencode-ai/sdk` are V1.
- Config keys: `plugins`, `permissions` (an array), `agents`.
- Routes live under `/api/...`. The V1 docs pages for server and ACP are stale.
- One shared background server per user (`opencode serve --service`). The TUI, `run`, `models`
  and `session` are its clients. `--standalone` gives a command a private server.
  Plugins run in the server, so a TUI that attaches to the shared service never sees the
  launch env orch sets. An orch TUI launch passes `--standalone`.

## Launch flags

- TUI: `opencode [dir] --standalone --server <url> --auto -c -s <id> --prompt <text>`.
  No `--model`. `-s` continues a session or creates it.
- `opencode mini` adds `-m provider/model`, `--agent`, `--fork`, `--replay`.
- `opencode run [message] -m provider/model#variant --format json -s <id> --auto --standalone`.
  JSON output is NDJSON: `text`, `tool_use`, `step_start`, `step_finish`, `error` (exit 1).
- `opencode acp` takes only `--login` and global flags. One process serves many sessions.
- `opencode models` prints one `provider/model` per line.

## ACP, probed with initialize and session/new

- agentInfo `OpenCode 2.2.7`. Capabilities: loadSession, resume, close, fork, list, delete,
  additionalDirectories. Auth method `opencode-login`.
- Session ids are `ses_…` and equal opencode's own session ids (same sqlite store,
  `~/.local/share/opencode/opencode.db`). Not yet confirmed by resuming an ACP session in
  the TUI.
- Config options: `model` (values `provider/model`, default `opencode/iceman-free`) and
  `mode` (`build`, `plan`). The docs name an `effort` option (category `thought_level`) that
  appears for a model with variants.

## codex-acp 2.6.0, probed the same way, for comparison

- Config options: `mode` (`read-only`, `workspace-write`, `agent`, `agent-full-access`),
  `collaboration_mode`, `model` (bare slugs; default `gpt-6.1-sol`), `reasoning_effort`
  (category `thought_level`: low, medium, high, xhigh, max, ultra), `fast-mode`.
- A model error such as a 402 arrives as agent message text with stopReason `end_turn`.

## Plugins

- Load from `.opencode/plugins/`, `~/.config/opencode/plugins/`, or the `plugins` config key
  (npm name, local dir, `file://` URL, `{package, options}`).
- Module: default export `{ id, setup(ctx) }`. `Plugin.define` returns its argument, so no
  runtime dependency is needed.
- `ctx` domains: session, permission, event, shell, tool, model, and more. Hooks register with
  `ctx.<domain>.hook(name, cb)`: tool `execute.before`/`execute.after`, shell `create.before`
  (rewrites command, cwd, env), permission `evaluate`, session `prompt`.
- Events: `ctx.event.subscribe({ types })` yields `{ type, ... }`. Used ones:
  `session.status` (`idle | busy | retry`), `session.execution.started|succeeded|failed|interrupted`,
  `session.text.ended` (full text of one block), `permission.asked`, `permission.replied`.
- Control from a plugin: `ctx.session.prompt`, `interrupt`, `switchModel`, `switchAgent`,
  `compact`; `ctx.permission.reply({ sessionID, requestID, decision })`.

## Env

- Read: `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG_CONTENT`,
  `OPENCODE_DISABLE_PROJECT_CONFIG`, `OPENCODE_DB`, `OPENCODE_PASSWORD`.
  `OPENCODE_PERMISSION` does not exist in V2.
- Exported into the agent's shell: `AGENT=1`, `OPENCODE=1`, `AI_AGENT=opencode`,
  `OPENCODE_SESSION_ID=<ses_…>`.

## Permissions and compaction

- `"permissions": [{ action, resource, effect }]`, last match wins. The base policy allows
  everything except `.env` reads. `--auto` approves anything not denied.
- `compaction.auto`, `compaction.keep.tokens`, `compaction.buffer`.

## Install

- `curl -fsSL https://opencode.ai/v2/install | bash` (to `~/.opencode/bin`), or
  `npm i -g @opencode/cli`, or `bun install -g --trust @opencode/cli`.
