# P3: the ACP module, `packages/orch/src/acp/`

Paths are relative to the repo root `/home/bryan/orch`. Read `acp/MODEL.md` and
`acp/findings/acp-sdk.md` first. The SDK is installed: its declarations are under
`node_modules/@agentclientprotocol/sdk/dist/v1/stable/acp.d.ts` and
`node_modules/@agentclientprotocol/sdk/dist/v1/schema/types.gen.d.ts`. Read them for every
type you use. Import only from `@agentclientprotocol/sdk`, the stable v1 root export.

`src/acp/` is the only place that imports the SDK or names an ACP method. It imports core
types under `packages/orch/src/types/` and nothing else of orch: no adapter, no backend, no
daemon, no store. It knows no harness.

Rules for every section:
- Never run `orch`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`, `bun install`,
  or anything under `packages/orch/scripts/`. `git diff` and `git status` only, read-only.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins and Web Streams.
- No number, timeout, path or name as a literal: a parameter, a setting or an existing constant.
- Comments: one short doc line on an exported name, nothing else.
- Tests: run `bun test packages/orch/test/<the files your section names>`. After a fix, run
  them once more. Never bare `bun test`.
- Verify means: run `bun check` from the repo root. After a fix, once more. Other agents are
  editing other files. An error in a file you did not touch is not yours: report `pending`.
- A type or fixture your change forces is yours to edit. List every file in your report.

## T1 `src/acp/session.ts`: one ACP session over a pair of streams
New `packages/orch/src/acp/session.ts`. Exported shape:
```ts
import type { SessionUpdate, StopReason } from "@agentclientprotocol/sdk";
import type { QuestionOption } from "../types/question.ts";

/** The agent process's stdin and stdout. */
export interface AcpStreams {
  readonly input: WritableStream<Uint8Array>;
  readonly output: ReadableStream<Uint8Array>;
}
export type AcpOpen =
  | { readonly kind: "new"; readonly cwd: string }
  | { readonly kind: "load"; readonly cwd: string; readonly sessionId: string }
  | { readonly kind: "resume"; readonly cwd: string; readonly sessionId: string };
export interface AcpPermissionAsk {
  readonly toolCallId: string;
  readonly title: string;
  readonly options: readonly QuestionOption[];
}
export interface AcpSessionHandlers {
  onUpdate(update: SessionUpdate): void;
  /** Resolves the id of the option chosen, or null when the ask was cancelled. */
  onPermission(ask: AcpPermissionAsk): Promise<string | null>;
}
/** What the agent said it supports. */
export interface AcpOffer {
  readonly load: boolean;
  readonly resume: boolean;
  readonly close: boolean;
  /** The id of the config option that selects the model, null when the agent has none. */
  readonly modelOption: string | null;
}
export interface AcpClientInfo { readonly name: string; readonly version: string }
export interface AcpSession {
  readonly sessionId: string;
  readonly offer: AcpOffer;
  prompt(text: string): Promise<StopReason>;
  cancel(): Promise<void>;
  setMode(modeId: string): Promise<void>;
  setModel(value: string): Promise<void>;
  close(): Promise<void>;
  /** Settles when the connection ends, for any reason. */
  readonly ended: Promise<void>;
}
export function openAcpSession(streams: AcpStreams, open: AcpOpen, handlers: AcpSessionHandlers, info: AcpClientInfo): Promise<AcpSession>;
```
Behavior:
- `client({ name })`, `ndJsonStream(streams.input, streams.output)`, `connect`.
- `initialize` sends `PROTOCOL_VERSION`, the client info, and client capabilities with no
  file system and no terminal capability. An agent answering another protocol version rejects
  `openAcpSession` with an error naming both versions.
- `open.kind` picks `session/new`, `session/load` or `session/resume`, with `mcpServers: []`.
  `load` or `resume` on an agent that does not offer it rejects, naming what is missing.
- `offer` is read from the initialize response and the session response by their real field
  names. `modelOption` is the id of the config option whose category is the model one.
- `session/update` notifications for this session id call `onUpdate` in arrival order.
- `session/request_permission` calls `onPermission` with the options mapped to
  `QuestionOption`: the kind `allow_once` becomes `allow-once`, and so on for the four. The
  answer is the selected outcome with the returned id, or the cancelled outcome for null.
  Several asks may be open at once. Each waits for its own answer.
- `prompt` sends one text content block and resolves the stop reason. A second `prompt`
  while one is running rejects.
- `cancel` sends the `session/cancel` notification, and every open permission ask resolves
  cancelled, as the protocol requires of a client.
- `setModel` sets `offer.modelOption` to the value, and rejects when `modelOption` is null.
- `close` sends `session/close` when offered, then ends the connection.

New `packages/orch/test/helpers/fake-acp-agent.ts`: a scripted agent built with the SDK's own
agent-side builder over `TransformStream` pairs. `fakeAcpAgent(script)` returns the
`AcpStreams` for the client side and a record of every request and notification it received.
The script says, per prompt: the updates to send, permission asks to make and wait on, and
the stop reason. It also says what the agent offers and the replay a `session/load` sends.

New `packages/orch/test/acp-session.test.ts`:
- A full turn: two message chunks, then `end_turn`. `onUpdate` saw both in order.
- `cancel` during a turn: the agent received `session/cancel` and the prompt resolves `cancelled`.
- Two permission asks open at once, answered in reverse order: each gets its own option id.
- `cancel` with an ask open: that ask is answered cancelled.
- `load` replays three updates before `openAcpSession` resolves, and `onUpdate` saw them.
- `load` against an agent that does not offer it rejects.
- A wrong protocol version rejects.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 `src/acp/entries.ts`: ACP updates to orch's session entries
Read `packages/orch/src/agent/session-log.ts` and `packages/orch/src/agent/read.ts` for the
entry type the one reader returns, called `<Entry>` below: use its real name. Read the
`SessionUpdate` union in the SDK's `types.gen.d.ts`.

If `<Entry>` is declared in a file `src/acp/` may not import under the layering in
`packages/orch/scripts/check-layers.ts`, stop and report where it is declared.

New `packages/orch/src/acp/entries.ts`:
```ts
/** Turns a session's updates into entries, joining consecutive chunks of one message. */
export interface AcpEntryBuilder {
  push(update: SessionUpdate): <Entry>[];
  /** The entry still being joined, if any. Call when the turn ends. */
  flush(): <Entry>[];
}
export function acpEntryBuilder(): AcpEntryBuilder;
export interface AcpOutcome { readonly state: "done" | "aborted" | "error"; readonly error: string | null }
export function outcomeOf(stop: StopReason): AcpOutcome;
```
Use orch's own presence state type for `state` if one exists with these members.

Behavior:
- Consecutive `agent_message_chunk` updates join into one assistant message entry, emitted
  when an update of another kind arrives or on `flush`. The same for `agent_thought_chunk`
  as a thinking entry, and `user_message_chunk` as a user entry.
- `tool_call` emits a tool call entry. `tool_call_update` emits an entry only when its status
  is a final one, carrying the result text.
- `plan` emits one entry holding the plan's items as text lines.
- Every other variant emits nothing. The `switch` over the variants is exhaustive, with each
  ignored variant named.
- Map onto the variants `<Entry>` already has. If `<Entry>` has no variant for thinking, a
  tool call or a plan, do not add one: stop and report which is missing.
- `outcomeOf`: `end_turn` is `done`. `cancelled` is `aborted`. `refusal`, `max_tokens` and
  `max_turn_requests` are `error` with the stop reason as the error text.

New `packages/orch/test/acp-entries.test.ts`:
- Three message chunks then a tool call: `push` returns nothing for the chunks, then one
  message entry with the joined text and one tool call entry.
- Chunks then `flush`: one message entry.
- A thought chunk between two message chunks: three entries in order.
- A tool call update with a non-final status emits nothing. A final one emits its result.
- `outcomeOf` for each of the five stop reasons.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
