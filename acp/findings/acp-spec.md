# ACP as published

## Corrections, checked against `acp/reference/acp-schema.json`

- Stop reasons are five: `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`. The Prompt turn section below lists four.
- SDK 2.6.0 deprecates `ClientSideConnection` in favor of a fluent `client()` function, per `acp/reference/typescript.md`. The TypeScript SDK section below names the deprecated class.
- `agentCapabilities.sessionCapabilities` carries `list`, `delete`, `resume`, `close`, `additionalDirectories`, `systemPrompt`. `session/resume` restores a session without replaying it.
- `codex-acp` reads `INITIAL_AGENT_MODE` for its starting permission mode and offers mid-turn input through a `_session/steering` extension, per `acp/reference/official-codex-README.md`.

Sources: ACP v1 docs linked by [llms.txt](https://agentclientprotocol.com/llms.txt); JSON Schema at [`acp/reference/acp-schema.json`](https://raw.githubusercontent.com/agentclientprotocol/agent-client-protocol/main/schema/v1/schema.json). The schema is the stable v1 schema; draft/unstable additions are not treated as stable here.

## Methods

| Name | Direction | Kind | Stability | Params → result / fields |
|---|---|---|---|---|
| `initialize` | client → agent | request | stable | protocolVersion, clientCapabilities, clientInfo → protocolVersion, agentCapabilities, authMethods, agentInfo |
| `authenticate` | client → agent | request | stable | methodId, optional `_meta` → empty result |
| `logout` | client → agent | request | stable | optional `_meta` → empty result |
| `session/new` | client → agent | request | stable | cwd, mcpServers, optional `_meta` → sessionId, optional modes/models/configOptions |
| `session/load` | client → agent | request | stable | sessionId, cwd, mcpServers, optional `_meta` → empty result; agent replays history as `session/update` notifications |
| `session/list` | client → agent | request | stable | cursor, cwd, optional `_meta` → sessions, nextCursor |
| `session/delete` | client → agent | request | stable | sessionId, optional `_meta` → empty result |
| `session/close` | client → agent | request | stable | sessionId → empty result |
| `session/resume` | client → agent | request | stable | sessionId, cwd, mcpServers, optional `_meta` → empty result |
| `session/prompt` | client → agent | request | stable | sessionId, prompt content blocks, optional `_meta` → stopReason |
| `session/cancel` | client → agent | notification | stable | sessionId; no response |
| `session/set_mode` | client → agent | request | stable | sessionId, modeId → empty result |
| `session/set_config_option` | client → agent | request | stable | sessionId, configId, value → updated config option |
| `session/request_permission` | agent → client | request | stable | sessionId, toolCall, options → outcome (`selected` with optionId, or `cancelled`) |
| `elicitation/create` | agent → client | request | stable | message, optional scope → structured user response |
| `elicitation/complete` | agent → client | notification | stable | elicitationId |
| `fs/read_text_file` | agent → client | request | stable | sessionId, path, optional line/limit → content |
| `fs/write_text_file` | agent → client | request | stable | sessionId, path, content → empty result |
| `terminal/create` | agent → client | request | stable | sessionId, command, args, cwd, env, outputByteLimit → terminalId |
| `terminal/output` | agent → client | request | stable | sessionId, terminalId → output, exitStatus, truncated |
| `terminal/wait_for_exit` | agent → client | request | stable | sessionId, terminalId → exitCode, signal |
| `terminal/kill` | agent → client | request | stable | sessionId, terminalId → empty result |
| `terminal/release` | agent → client | request | stable | sessionId, terminalId → empty result |
| `session/update` | agent → client | notification | stable | sessionId, update variant (see Prompt turn) |
| `$/cancelRequest` | either direction | notification | stable | requestId; cancels a pending JSON-RPC request |

The schema defines the RPC message envelopes and variant payloads; protocol names and roles are documented in [Overview](https://agentclientprotocol.com/protocol/v1/overview), [Initialization](https://agentclientprotocol.com/protocol/v1/initialization), [Session Setup](https://agentclientprotocol.com/protocol/v1/session-setup), [Prompt Turn](https://agentclientprotocol.com/protocol/v1/prompt-turn), [File System](https://agentclientprotocol.com/protocol/v1/file-system), and [Terminals](https://agentclientprotocol.com/protocol/v1/terminals). The schema also permits extension methods (`_`) and extension notifications; these are not fixed ACP methods.

## initialize

[Initialization](https://agentclientprotocol.com/protocol/v1/initialization): protocol version is integer `1`; client requests its latest supported version, agent replies with the agreed supported version. Capabilities are optional and omitted capabilities mean unsupported.

- Client capabilities: `fs.readTextFile` and `fs.writeTextFile` advertise client filesystem access; `terminal` advertises client terminal operations; `auth.terminal` permits terminal authentication; `elicitation.form` and `.url` advertise supported structured-input modes; `session.configOptions.boolean` permits boolean config options; `session.compaction` permits compaction updates; `session.notices` permits notice updates. Capability objects are optional; absent/null means unsupported.
- Agent capabilities: `loadSession` allows `session/load`; `promptCapabilities.image`, `.audio`, and `.embeddedContext` advertise supported prompt blocks; `mcpCapabilities.http` and `.sse` advertise MCP transports; `auth.logout` indicates `logout`; session capabilities include `delete`, `additionalDirectories`, and `systemPrompt`. Agent returns supported `authMethods`, and optionally `agentInfo`. Both sides may include implementation name/title/version.
- Client optionally sends `clientInfo` (`name`, `title`, `version`); the agent optionally returns `agentInfo` with the same identity fields.

## Sessions

[Session Setup](https://agentclientprotocol.com/protocol/v1/session-setup): `session/new` takes `cwd`, `mcpServers` and optional `_meta`; returns a unique `sessionId`. `session/load` takes `sessionId`, `cwd`, `mcpServers`, optional `_meta`; requires `agentCapabilities.loadSession`, replays the prior conversation through `session/update`, then responds. `session/list` takes optional `cursor` and `cwd`, and returns `sessions` plus optional `nextCursor`; `session/resume` restores a session without history replay; `session/delete` removes history; `session/close` closes the active session. The session identifier is the agent-generated unique identifier for that conversation and identifies it across load/resume; implementations must persist it if they support persistence. The schema does not define fork.

## Prompt turn

[Prompt Turn](https://agentclientprotocol.com/protocol/v1/prompt-turn), [Content](https://agentclientprotocol.com/protocol/v1/content), [Tool Calls](https://agentclientprotocol.com/protocol/v1/tool-calls): `session/prompt` carries `sessionId` and `prompt[]`. Content blocks include text, image, audio, resource link, embedded resource, and resource; capability-gated or extension blocks can be negotiated separately.

`session/update` variants and principal fields: `user_message_chunk` (content); `agent_message_chunk` (content); `agent_thought_chunk` (content); `tool_call` (toolCallId, title, kind, status, optional content/locations/rawInput); `tool_call_update` (toolCallId, status and optional title/kind/content/locations/rawInput/rawOutput); `plan` (entries: content, priority, status); `available_commands_update` (availableCommands); `current_mode_update` (currentModeId); `config_option_update` (configOptions); `session_info_update` (title, optional updatedAt); `usage_update` (used, size, cost); `other` (extension data). See the union in the schema and [Agent Reports Output](https://agentclientprotocol.com/protocol/v1/prompt-turn#3-agent-reports-output).

Prompt stop reasons: `end_turn`, `max_tokens`, `refusal`, `cancelled`. `session/cancel` is a notification to stop the current turn; client continues accepting final updates and the prompt request resolves with `cancelled`. JSON-RPC `$/cancelRequest` carries `requestId` to cancel a pending request.

## Permissions

[Tool Calls](https://agentclientprotocol.com/protocol/v1/tool-calls) and schema `RequestPermissionRequest`: agent requests permission with `sessionId`, `toolCall` (id/title/kind/status/content/locations/input), and ordered `options` (`optionId`, name, kind). Option kinds are `allow_once`, `allow_always`, `reject_once`, `reject_always`. Client answers the request with an outcome: selected option (`outcome: "selected"`, `optionId`) or cancellation (`outcome: "cancelled"`). If the turn is cancelled while the request is pending, client answers the permission request with the `cancelled` outcome.

## Modes, models, config

[Session Modes](https://agentclientprotocol.com/protocol/v1/session-modes): `session/new` may return `modes` (`currentModeId`, `availableModes` with id/name/optional description); `session/set_mode` takes `sessionId` and `modeId`. [Session Config Options](https://agentclientprotocol.com/protocol/v1/session-config-options): `session/new` may return `configOptions`; `session/set_config_option` takes `sessionId`, `configId`, and a value. Config option types include `select` (options), `input` (value), and capability-gated `boolean`; categories include `mode` and `model`. `session/set_mode`, modes, config options, and model selection through config options are stable v1 surfaces. The protocol has no separate `session/set_model` method; model choice is expressed through model config options when advertised.

## Client-side methods

[File System](https://agentclientprotocol.com/protocol/v1/file-system): agent calls `fs/read_text_file` and `fs/write_text_file` only when the corresponding client `fs` capability is advertised; without it, the agent must not call that method and must use another supported route or report inability. [Terminals](https://agentclientprotocol.com/protocol/v1/terminals): `terminal/create`, `terminal/output`, `terminal/wait_for_exit`, `terminal/kill`, `terminal/release`; client advertises `terminal: true` to permit these calls. Without that capability, agent must not rely on client terminals and needs its own execution facility.

## Bindings

The package checks were `npm view ... --json`; all five requested package names exist. `latest` package metadata, executable `bin`, dependencies, and repository:

| Package | Latest | `bin` | Dependencies | Repository |
|---|---:|---|---|---|
| `@agentclientprotocol/sdk` | 2.6.0 | none | none listed | https://github.com/agentclientprotocol/typescript-sdk |
| `@agentclientprotocol/claude-agent-acp` | 0.106.0 | `claude-agent-acp: dist/index.js` | zod 4.6.7; diff 9.0.0; SDK 2.6.0; Claude Agent SDK 0.3.322 | https://github.com/agentclientprotocol/claude-agent-acp |
| `@zed-industries/claude-code-acp` | 0.16.2 | `claude-code-acp: dist/index.js` | diff 8.0.3; minimatch 10.2.1; SDK 0.14.1; MCP SDK 1.26.0; Claude Agent SDK 0.2.44 | https://github.com/zed-industries/claude-code-acp |
| `@agentclientprotocol/codex-acp` | 2.6.0 | `codex-acp: dist/index.js` | zod, diff, open, cross-spawn, `@openai/codex`, vscode-jsonrpc, SDK | https://github.com/agentclientprotocol/codex-acp |
| `@zed-industries/codex-acp` | 0.16.0 | `codex-acp: bin/codex-acp.js` | none listed | https://github.com/zed-industries/codex-acp |

Binding details (argv is the executable plus its arguments; stdio is the ACP transport):

| Harness | ACP speaker and launch | Environment / authentication | `session/load` |
|---|---|---|---|
| Claude | `claude-agent-acp` (official current adapter); legacy `claude-code-acp`. The official README documents its standalone `claude-agent-acp` executable and `CLAUDE_CODE_EXECUTABLE` override; no extra argv is prescribed. | Existing Claude login; README says full session smoke requires Claude login. `CLAUDE_CODE_EXECUTABLE` selects a CLI path. | Official README documents ACP v1 and v2 support; it explicitly describes resume/load support, including v2 `session/resume`. Legacy adapter README: https://github.com/zed-industries/claude-code-acp |
| Codex | `codex-acp`; optional `--version`. Documented via `npx -y @agentclientprotocol/codex-acp`; adapter starts Codex App Server. | ChatGPT auth, `CODEX_API_KEY`, `OPENAI_API_KEY`, or client-provided custom gateway. `CODEX_PATH` overrides binary; `NO_BROWSER` suppresses browser auth; `DEFAULT_AUTH_REQUEST` configures auth request. | Official README links session load/reconstruction details and describes load support. https://github.com/agentclientprotocol/codex-acp |
| Gemini | Gemini CLI's ACP mode is `gemini --experimental-acp` (stdio). | Uses Gemini CLI authentication/configuration; environment may include `GEMINI_API_KEY` or `GOOGLE_API_KEY`. The cited Gemini CLI command docs URL was unavailable during this lookup, so argv/auth/session-load behavior is not established by the fetched README material. | Not established by the retrieved public material. https://github.com/google-gemini/gemini-cli |

The legacy Zed Codex README documents `codex-acp` and `OPENAI_API_KEY`; development has moved to the official Codex ACP project. The fetched package metadata itself does not establish the behavior of every historical release. Official adapter READMEs: https://github.com/agentclientprotocol/claude-agent-acp and https://github.com/agentclientprotocol/codex-acp.

## TypeScript SDK

[TypeScript SDK docs](https://agentclientprotocol.com/libraries/typescript): client-side `ClientSideConnection` connects to an agent-side `AgentSideConnection` over an `ndJsonStream`. Constructor shape: `new ClientSideConnection(client: Client, stream: Stream, options?: Options)`. The client implements `Client` handlers, including `requestPermission(params)`, `sessionUpdate(params)`, and filesystem/terminal handlers when advertised. The SDK also exposes `ndJsonStream(reader, writer)` for stdio JSON-RPC framing. See the SDK docs and declarations in the linked `agentclientprotocol/typescript-sdk` repository.

## Does not fit

The requested GitHub path `schema/schema.json` returns 404; the repository now stores the v1 schema at `schema/v1/schema.json`, saved as `acp/reference/acp-schema.json`. The Gemini CLI command documentation URL attempted during this lookup returned 404, so its `session/load` support could not be verified from that source.
