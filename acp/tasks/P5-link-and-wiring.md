# P5: the ACP link, the entry renderer, and orchd holding an ACP agent

Paths are relative to the repo root `/home/bryan/orch`. Read `acp/MODEL.md` first, then
`acp/findings/acp-wiring.md`: it has the signatures this wave builds on, with `path:line`.

Rules for every section:
- Never run `orch`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`, `bun install`,
  or anything under `packages/orch/scripts/`. `git diff` and `git status` only, read-only.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins and Web Streams.
- Never branch on a harness id, a backend id or a form id. Branch on what is declared.
- No number, timeout, path or name as a literal: a setting or an existing constant.
- One shape. No code that accepts an old shape. Call an existing helper before writing one.
  Never copy a function: move it.
- Comments: one short doc line on an exported name, nothing else.
- Tests: run `bun test packages/orch/test/<the files you edited>`. After a fix, once more.
  Never bare `bun test`. Never a test that opens a pane, a terminal or a real plexer.
- Verify means: run `bun check` from the repo root. After a fix, once more. Other agents are
  editing other files. An error in a file you did not touch is not yours: report `pending`.
- A type, schema, fixture or test your shape change forces is yours to edit. List every file.

## T1 `src/acp/link.ts`: an agent link over an ACP session
Read `packages/orch/src/acp/session.ts`, `packages/orch/src/acp/entries.ts`,
`packages/orch/test/helpers/fake-acp-agent.ts`, `packages/orch/src/control/agent-links.ts` and
`packages/orch/src/shared/bridge-message.ts`.

`link.ts` may import types from `src/control/agent-links.ts`, `src/shared/bridge-message.ts`
and `src/types/`, and code from `src/acp/`. Nothing else of orch.

New `packages/orch/src/acp/link.ts`:
```ts
export interface AcpLinkEvents {
  /** A prompt went to the agent: a turn began. */
  onTurnStarted(deliveryId: string): void;
  onEntries(entries: readonly SessionViewEntry[]): void;
  /** The turn ended. text is the turn's last assistant message, empty when it had none. */
  onTurnEnded(outcome: AcpOutcome, text: string): void;
  /** Opens a question for a permission ask and returns the question's id. */
  onAsk(ask: AcpPermissionAsk): string;
  /** An ask was answered and none is open any more. */
  onAsksSettled(): void;
  /** An open ask ended with no answer. */
  onAskDropped(questionId: string): void;
  /** A delivery was applied. */
  onApplied(deliveryId: string): void;
  onError(error: Error): void;
}
export interface AcpLink { readonly link: AgentLink; readonly session: AcpSession }
export function openAcpLink(streams: AcpStreams, open: AcpOpen, info: AcpClientInfo, events: AcpLinkEvents): Promise<AcpLink>;
```
Behavior of `link.push(delivery)`, by `delivery.message.action`:
- `dispatch` and `steer` are prompts. With no turn running: call `onApplied(delivery.id)`,
  `onTurnStarted(delivery.id)`, send the prompt. With a turn running: hold it in order, and
  send it the same way when the running turn ends. A steer never cancels a turn.
- When a prompt resolves: `flush` the entry builder into `onEntries`, then
  `onTurnEnded(outcomeOf(stopReason), text)`, then start the next held prompt if any.
- When a prompt rejects: `onError`, then `onTurnEnded` with state `error` and the error's
  message, then the next held prompt.
- `answer`: resolve the open ask whose question id is `message.questionId` with
  `message.optionId`, then `onApplied`. When no ask is open any more, `onAsksSettled()`. An
  answer for no open ask, or with a null `optionId`, calls `onError` and applies nothing.
- `model`: `session.setModel(message.model)`, then `onApplied`. A rejection calls `onError`.
- Every update from the session goes through one `acpEntryBuilder` into `onEntries`, in
  order, including the replay of a load.
- A permission ask calls `onAsk`, keeps its resolver under the returned question id, and
  waits. Several may be open.
- `link.takes` is `dispatch`, `steer`, `answer`, and `model` only when
  `session.offer.modelOption` is not null.
- `link.abort` calls `session.cancel()`. Every ask open at that moment gets `onAskDropped`.
- `link.close` closes the session.
- The `switch` over the message actions is exhaustive.

New `packages/orch/test/acp-link.test.ts`, on `fakeAcpAgent`:
- A dispatch: `onApplied`, `onTurnStarted`, entries, then `onTurnEnded` with `done` and the
  last assistant message as text. In that order.
- A steer pushed mid-turn: the agent receives the second prompt only after the first turn
  ends, never a cancel, and `onApplied` for the steer comes when it is sent.
- Two asks open, answered in reverse order: each resolves its own option, and
  `onAsksSettled` is called once, after the second.
- `abort` with an ask open: the agent receives `session/cancel`, `onAskDropped` has that
  question id, and the turn ends `aborted`.
- A `model` push on an agent with no model option: `onError`, no `onApplied`. `takes` has no `model`.
- An answer for an unknown question id: `onError`, no `onApplied`.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 One entry renderer for the CLI and orchd
`renderViewEntry` in `packages/orch/src/commands/results.ts` turns a `SessionViewEntry` into
text for `orch tail`. orchd will draw the same entries on an agent's screen, and server code
cannot import from `src/commands/`.

End state:
- `renderViewEntry` moves, unchanged, into a new pure module with no I/O that both the
  client and the server may import under `packages/orch/scripts/check-layers.ts`. Put it
  beside the other shared pure helpers the layers file already classes as shared.
- `src/commands/results.ts` imports it from there. No copy stays behind.
- Nothing else changes. `tailEntries` stays where it is.

Tests: add nothing. Run the test files that cover `orch tail` and `results.ts`. They pass unchanged.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 orchd holds an agent in the `acp` form
Read `acp/MODEL.md` sections "What the ACP session reports", "Questions" and "Viewers".
Read `packages/orch/src/acp/link.ts`, `packages/orch/src/backends/held/index.ts`,
`packages/orch/src/daemon/server/held.ts`, `packages/orch/src/daemon/server/held-pipes.ts`,
`packages/orch/src/daemon/server/handlers/lifecycle.ts`, `packages/orch/src/daemon/server/spawn/`,
`packages/orch/src/agent/session-log.ts`, and `packages/orch/src/types/form.ts`.

New `packages/orch/src/daemon/server/acp-agents.ts`. One exported function starts an agent
whose form needs pipes, taking what `startHeldAgent` takes plus the daemon state.

What it does, in order:
1. Builds the command from the adapter's `acp` role: `acp.argv(opts)`, and the environment
   the held start builds today plus `acp.env(opts)`.
2. Starts it on pipes through a `PipesProvider` kept on the daemon state the way the PTY
   provider is, so tests pass `fakePipes()`. Holds it with `holdPipes`.
3. Registers the spawned agent the way `startHeldAgent` does, with its pid and its form.
4. Opens a writer screen for the agent with `openScreen`, sized as a held PTY is sized.
5. Decides the agent's session log path with the helpers the `headless` backend uses for its
   log directory and file name. Export or move those helpers. Do not copy them.
6. Opens the link with `openAcpLink`, with `packageManifest()` as the client info.
7. Attaches the link with `attachLink`, and reports the session id, the session log path as
   `sessionPath`, and the state a fresh agent with no task reports, through `acceptStatusReport`.

The link events:
- `onTurnStarted`: `acceptStatusReport` with state `working` and the dispatch id.
- `onEntries`: `appendSessionEntries` to the session log, and each entry drawn on the screen
  with the shared entry renderer, one line break after each.
- `onTurnEnded`: `acceptStatusReport` with the outcome's state, its error as `lastError`,
  the text as `lastText`, and the finish time. For `done`, also `acceptResultReport` with
  the text.
- `onAsk`: mint a question id, `recordQuestion` with the ask's title, its options and
  `supersede: false`, then `acceptStatusReport` with state `asking` and the title as the
  blocked message. Return the id.
- `onAsksSettled`: `acceptStatusReport` with state `working` and no blocked message.
- `onAskDropped`: close that question with no answer, through the store function that
  superseding uses. Export it from `question-rows.ts` if it is not exported.
- `onApplied`: `ackOutboxRow`.
- `onError`: log it, and `acceptStatusReport` with the message as `lastError`.

When the process exits: detach the link, close the screen, release the pipes. The liveness
tick marks the agent `exited` from its pid, as it does for every agent. stderr goes to the logger.

Where it is called: the spawn path that starts a held agent picks the start by what the
form needs. `FORM_STDIO[form]` of `pipes` takes this function. `terminal` takes
`startHeldAgent`. No comparison with a form id. This holds for a spawn on this host and for
`spawn-headless` from a linked host.

One presence owner. An agent in a form whose state orchd reports must not also be reported
by its harness's shim or hooks. Find how each shim decides to report, and make the `acp`
launch environment leave that out by a declared property of the form, not a form id. If
that needs a change inside `extensions/`, stop and report what you found instead.

A first prompt given at spawn is delivered the way a held agent's first prompt is.

New `packages/orch/test/acp-agents.test.ts`, on `fakePipes()`, `fakeAcpAgent` and a fake
adapter with an `acp` role:
- Spawn with a first prompt: the agent's states go through `working` to `done`, the result
  text is stored, and the session log holds the turn's entries.
- A permission ask: one pending question with its options, state `asking`. Answer `1`: the
  agent receives the first option's id, the question is settled, state returns to `working`.
- Abort during a turn: the agent receives `session/cancel`, state ends `aborted`.
- The fake process exits: the link is detached and `heldPipes` is null.
- The agent's screen snapshot holds the rendered text of the turn's entries.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
