# P1-3 `adapter-shape` — one capability, `bridge`, replaces `inboxSteering` and `question`

Read `SOCKET-REFACTOR/README.md` first (The wire → the adapter capability; Cross-slice
contracts). Read `CLAUDE.md` at the repo root and
`learnings/2026-07-16-harness-plexer-architecture.md` (Rule 9). Paths are inside
`packages/orch/`.

## You own exactly these files

- `src/types/adapter.ts`
- `src/adapters/pi.ts`, `src/adapters/omp.ts`, `src/adapters/claude.ts`, `src/adapters/codex.ts`
- `test/helpers/adapter.ts`, `test/adapter-pi.test.ts`

Touch nothing else. The callers of the roles you rename are P1-4 (`dispatch.ts`) and P1-5
(`worker-prompt.ts`, `spawn/index.ts`, `check-bridge.test.ts`); they land in this phase
against the contract below. Your scoped `bun check` will show their errors until they land —
name them in your result, do not fix them.

## The task

### `src/types/adapter.ts`

Replace `QuestionRole`, `InboxSteeringRole`, `question`, `inboxSteering` with:

```ts
/** The harness runs orch's bridge: it attaches to orchd at start and applies deliveries
 *  pushed down that link. `takes` lists the actions this bridge applies. */
export interface BridgeRole { readonly takes: readonly BridgeAction[] }
```
and on `AgentAdapter`: `readonly bridge: BridgeRole | null;`. `BridgeAction` comes from
`src/control/bridge-message.ts`.

- Delete `AnswerRequest` and the top-level `answer(request)` method. An answer is a bridge
  delivery; no adapter builds a command for it.
- Delete `SteerMechanism` — nothing reads it (`grep -rn SteerMechanism src test` to prove it).
- `SteerRequest.id` stays; strip "inbox" / "lossless inbox delivery" from its doc.
- `ModelControlRole.setModel` doc: returns the command that retargets the model, or
  `undefined` when the harness's bridge applies the `model` delivery instead.

### `src/adapters/pi.ts`

- Delete `steerViaInbox`, `answerViaFile`, `setModelViaInbox` and the `appendInbox` /
  `writeAnswer` imports. Delete the comment claiming pi's wire format is `inbox.jsonl` /
  `answer.json` — the bridge speaks orch's own message shape; pi has no wire format here.
- `readonly bridge: BridgeRole = { takes: ["dispatch", "steer", "answer", "model"] };`
- `steer(request)` returns `undefined` (doc: the bridge takes steers; nothing to run).
  `setModel(request)` the same. Delete `answer(...)`.
- `presenceRegistration` stays (P2-3 replaces its caller).

### `src/adapters/omp.ts`

Same as pi. Fix its import list from `./pi.ts`.

### `src/adapters/claude.ts`, `src/adapters/codex.ts`

`readonly bridge = null;` replaces the two nulls. Delete `answer(...)`. Claude's `steer` doc:
"Claude runs no bridge; the caller routes degraded steering through the environment."

### `test/helpers/adapter.ts`

`bridge: null` replaces `question: null, inboxSteering: null`; delete `answer: () => undefined`.

### `test/adapter-pi.test.ts`

`adapter.bridge` is not null and `takes` is the four actions. Delete the two tests that read
`inbox.jsonl` / `answer.json`.

## Done means

`bun check` on your files (paste it; errors in `dispatch.ts`, `worker-prompt.ts`,
`spawn/index.ts`, `check-bridge.test.ts` are P1-4/P1-5's and are named, not fixed).
`bun test test/adapter-pi.test.ts` green (paste it). Report the final `AgentAdapter` member
list verbatim.
