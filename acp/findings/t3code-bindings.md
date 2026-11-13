# How t3code drives each harness

Read from /home/bryan/src/t3code at commit 357fb754 on 2026-11-12. Paths are t3code's.
`RT` is packages/provider-acp/src/server/AcpSessionRuntime.ts, `AD` is
packages/provider-acp/src/server/adapter.ts, `OC` is packages/provider-opencode/src/server,
`PI` is packages/provider-pi/src/server.

## Which channel each harness uses

| Harness | t3code drives it over | Where |
|---|---|---|
| codex | `codex app-server` JSON-RPC; model and effort on each `turn/start` | apps/server/src/provider/codexLaunchArgs.ts:12, Adapters/CodexAdapterV2.ts:786 |
| claude | the Claude Agent SDK, `CLAUDE_CODE_ENTRYPOINT: "t3-code"` | Adapters/ClaudeAdapterV2.ts:1043, Drivers/ClaudeHome.ts:69 |
| opencode 2.x | a private `opencode serve` over HTTP, `@opencode/client` 2.0.28 | OC/v2/ |
| pi | `pi --mode rpc` JSONL | PI/rpc.ts, PI/adapter.ts |
| everything else | ACP, from the ACP registry | packages/provider-acp-registry |

codex-acp and claude-acp exist in the registry but are hidden behind the native drivers
(packages/client-runtime/src/providerClients.ts:35, :42). Nothing in t3code sets
`CLAUDE_CODE_EXECUTABLE`, `CODEX_PATH` or `INITIAL_AGENT_MODE`.

## The generic ACP client

- Binaries come from `https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`:
  binary, then npx, then uvx, exact versions (AcpRegistrySupport.ts:51, :423).
- Session start (`configureSession`, AD:7225): validate the model against the `category:"model"`
  select option and fail the turn if it is not offered; set it with `session/set_config_option`
  (legacy `session/set_model` only without the option); then the other options. An option id the
  session does not expose is skipped with a warning, and a value it does not offer is skipped
  silently. Then mode. `setConfigOption` sends nothing when the value is already current
  (RT:2031).
- `config_option_update` replaces the cached options (RT:2747). Updates during start are
  buffered and replayed (RT:1737).
- A fresh conversation spawns a new binding process, opens a session on it, swaps it in and
  kills the old process, with no `session/close` (AD:6922-7093). It refuses while a turn is
  active. The next turn re-applies the full model selection.
- Reopen: `session/load` when offered, else `session/resume` (RT:2218). Replayed history
  (`_meta.isReplay`) is dropped.
- Permissions: auto-approve picks `allow_once`, then `allow_always`; no match answers
  `cancelled` (AD:1302). fs and terminal client capabilities are off for registry agents.
- Auth: `-32000` from session/new, load or resume triggers `authenticate` with the first method
  of type `agent`, then one retry (RT:2165). Terminal methods cannot run headless.
- A failed turn is a prompt RPC error or `stopReason: "error"` (AD:8423). An error reported as
  text with `end_turn` (codex-acp's 402) is not detected.
- Stderr: a 4096-character redacted tail, attached to the process-exited error (stderr.ts).
- Cancel sends `session/cancel` and lets the prompt end with `stopReason: "cancelled"`
  (RT:2367).
- `usage_update` gives context use and cost (runtimeModel.ts:1568).

## opencode 2.x, native

- One private `opencode serve --hostname=127.0.0.1 --port=<free>` per provider instance,
  shared by every directory; never the shared service, never the TUI, no plugins
  (OC/OpenCodeRuntime.ts:495). Ready on the stdout line `server listening on <url>`.
  `OPENCODE_PASSWORD` is a generated secret; HTTP Basic user `opencode`.
- Session: `session.create({ location: { directory }, model, permissions })`; prompt
  `session.prompt({ sessionID, id, text })`; steer is the same call with `delivery: "steer"`;
  `session.interrupt`, `session.switchModel({ model: { providerID, id, variant } })`,
  `session.switchAgent`, `permission.reply({ decision: "once" | "reject" })`.
- Observe one SSE stream, `GET /api/event`: `session.execution.started|succeeded|failed|interrupted`
  drive state, `session.text.ended` carries the text, `permission.asked` means asking.
  `session.execution.failed` carries `{ type, message, status }`; 402 is out of balance.
- Unattended: session permissions `[{ action: "*", resource: "*", effect: "allow" }]`.
- Models: `client.model.list`, id `provider/model`, effort is the model's `variant`. A cold
  server lists a partial catalogue; read until two reads agree.

## pi, `--mode rpc`

- `pi --mode rpc --session <path>`; JSONL requests `{ ...cmd, id }`, responses
  `{ type: "response", id, success, data, error }`, everything else is an event.
- Commands: `new_session`, `switch_session`, `get_state`, `set_model { provider, modelId }`
  then `set_thinking_level`, `prompt { message, streamingBehavior: "steer" }`, `abort`
  (after `clear_queue`), `compact`, `get_messages`.
- Events: `agent_start` working, `agent_settled` done, `message_end` with `stopReason`
  `error` or `aborted`, `extension_ui_request` asking.
