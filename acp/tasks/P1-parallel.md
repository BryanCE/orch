# P1: the work that needs no ACP SDK

Ten sections, one agent each, no two sections editing the same file. Paths are relative to the
repo root `/home/bryan/orch`. Source is under `packages/orch/src/`, tests under
`packages/orch/test/`.

Read first: `acp/MODEL.md` for the words (harness, form, backend, channel, link), then the
files your section names. `acp/findings/` maps today's code with `path:line`.

Rules for every section:
- Never run `orch`, `git`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`,
  `bun install`, or anything under `packages/orch/scripts/`. Never edit `packages/orch/drizzle/`.
- Edit only the files your section names, plus a test file your section names. If the job
  needs another file, stop and report it.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins only.
- Never branch on a harness id, a backend id or a form id (`form === "acp"`). Branch on what
  the adapter, backend or form declares.
- No number, timeout or path as a literal: a setting or an existing constant.
- No code that accepts an old shape. One shape, every writer and reader changed together.
- Call an existing helper before writing one. Never copy a function: move it.
- Comments: one short doc line on an exported name, nothing else. No plan notes in code.
- Tests: run `bun test packages/orch/test/<the files your section names>` once, after your
  edits. Never bare `bun test`. Never a test that opens a pane, a terminal or a real plexer.
- Verify means: run `bun check` once from the repo root. Other agents are editing other files
  at the same time. An error in a file you did not touch is not yours: report `pending`.

## T1 The schema inventory test lists `store_identity`
Edit `packages/orch/test/store-rebuild-schema.test.ts`:
- In `expectedInventory`, the first array is the table names. Add `"store_identity"` to it,
  after `"spaces"`.
Test: `bun test packages/orch/test/store-rebuild-schema.test.ts` passes, every test.
Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 A pipes provider and the holder that keeps each process
Read `packages/orch/src/types/pty.ts`, the PTY provider under `packages/orch/src/pty/`,
`packages/orch/src/daemon/server/held.ts` and `packages/orch/test/helpers/` for the fake PTY.
Mirror their naming and structure. Do not edit them.

New `packages/orch/src/types/pipes.ts`:
```ts
export interface PipesSpawn {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}
export interface PipesExit { readonly code: number | null; readonly signal: string | null }
export interface PipesProcess {
  readonly pid: number;
  /** The process's stdin. */
  readonly input: WritableStream<Uint8Array>;
  /** The process's stdout. */
  readonly output: ReadableStream<Uint8Array>;
  onStderr(listener: (text: string) => void): void;
  readonly exited: Promise<PipesExit>;
  kill(): void;
}
export interface PipesProvider { spawn(request: PipesSpawn): PipesProcess }
```
New `packages/orch/src/pty/node-pipes.ts`: `nodePipes: PipesProvider`. `node:child_process`
`spawn` with `stdio: ["pipe", "pipe", "pipe"]`, `Writable.toWeb` and `Readable.toWeb` from
`node:stream`, stderr decoded as utf8. A spawn error rejects nothing: it resolves `exited`
with `code: null` and sends the error message to the stderr listeners.

New `packages/orch/src/daemon/server/held-pipes.ts`: a holder keyed by agent id.
`holdPipes(agentId, process)` refuses a second process for one agent by throwing.
`heldPipes(agentId): PipesProcess | null`. `releasePipes(agentId)` kills and forgets. When a
held process exits, the holder forgets it. `dropHeldPipes()` for tests and shutdown.

New `packages/orch/test/helpers/fake-pipes.ts`: `fakePipes()` returns
`{ provider, spawned }`. Each entry of `spawned` holds the request and the far ends:
`fromOrchd: ReadableStream<Uint8Array>` is what was written to `input`,
`toOrchd: WritableStream<Uint8Array>` feeds `output`, `stderr(text)`, `exit(code)`.
Built on `TransformStream`.

New `packages/orch/test/held-pipes.test.ts`:
- Bytes written to `input` arrive on `fromOrchd`. Bytes written to `toOrchd` arrive on `output`.
- `exit(0)` resolves `exited` with code 0 and `heldPipes(id)` is then null.
- A second `holdPipes` for the same agent throws.
- `releasePipes` kills: the fake records the kill, and `heldPipes(id)` is null.
- `nodePipes` runs `process.execPath` with `["-e", "process.stdin.pipe(process.stdout)"]`:
  bytes written to `input` come back on `output`, and closing `input` resolves `exited` with code 0.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Abort is a control action in the one dispatcher
Read `packages/orch/src/types/control.ts`, `packages/orch/src/control/dispatch.ts`,
`packages/orch/src/control/agent-links.ts`, `abortHere` in
`packages/orch/src/daemon/server/handlers/drive.ts`, and `acp/findings/control-channels.md`.

End state:
- `ControlAction` in `src/types/control.ts` has an `abort` member, shaped like its siblings.
- `src/control/dispatch.ts` has `deliverAbort` beside the other `deliver*` functions, and the
  dispatcher routes `abort` to it.
- `deliverAbort` picks the channel the way the other actions do. When the adapter's bridge
  declares it takes `abort`, push the abort down the agent's link. Otherwise send the keys
  `abortHere` sends today. Add `abort` to the bridge action type if it is not a member. No
  adapter declares it in this task.
- The key-sending code moves out of `abortHere` into `deliverAbort`. `abortHere` calls the
  dispatcher and keeps everything else it does today. Abort is never written to the outbox
  and never checked against a lease.
- Every exhaustive `switch` over `ControlAction` handles `abort`.

Tests, in the existing control dispatch test file:
- An agent whose adapter has no bridge: abort sends the same keys as before this change.
- An agent whose fake adapter's bridge takes `abort`, with a link attached: abort pushes one
  abort message down the link and sends no keys.
- Abort on an agent held by a live foreign lease is delivered.
Run the control dispatch test file and the test files that cover `abortHere`.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The question view carries its options, and `orch questions` prints them
Read `packages/orch/src/store/question-rows.ts`, `packages/orch/src/types/question.ts`,
`acp/findings/presence-and-questions.md`, the handler that serves the questions list under
`packages/orch/src/daemon/server/handlers/`, its wire schema under
`packages/orch/src/daemon/client/`, and the `questions` command under
`packages/orch/src/commands/`.

End state:
- Each pending question the server returns has `options: QuestionOption[]`, in stored order,
  empty for a question with none. The store reads them in one query with the questions, not
  one query per question.
- The wire schema for a question has `options` as a required array. Every fixture and test
  that builds a question view gains it.
- `orch questions` prints each option under its question, numbered from 1, as two spaces,
  the number, a period, a space, the label. `--json` includes `options`.
- Do not edit `src/types/control.ts`, `src/control/dispatch.ts` or the `answer` command.
  In `src/daemon/client/protocol.ts`, touch only the question schema lines if it lives there.

Tests, in the test files that already cover the questions list and the `questions` command:
- A question recorded with two options returns both in order over the RPC.
- A question with none returns `options: []`.
- The command output for a question with two options has the two numbered lines.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T5 Spawn takes a form
Read `acp/MODEL.md` section "Choosing form and backend at spawn",
`packages/orch/src/types/form.ts`, `packages/orch/src/daemon/server/spawn/plan.ts`,
`packages/orch/src/commands/spawn/flags.ts`, `packages/orch/src/store/spawn-registration.ts`,
`setForm` in `packages/orch/src/store/interval-rows.ts`, and `acp/findings/spawn-and-relaunch.md`.

End state:
- `orch spawn --form <tui|oneshot|acp>`. One value for all names. An unknown value is
  refused with exit 1 by the flag parser, naming the three forms. The help line is in
  `src/commands/registry.ts`.
- Setting `defaults.forms`: a record from harness id to form id, default `{}`. Schema,
  `SETTINGS_DEFAULTS`, registry help line and required type, as every other setting.
- The spawn RPC params carry `form: FormId | null`. In
  `src/daemon/client/protocol.ts`, touch only the spawn params.
- `src/daemon/server/spawn/plan.ts` has one pure function that returns the form and the
  backend for a spawn from: the requested form or null, `defaults.forms`, the adapter, the
  backend chosen as today, and the `held` backend. Its steps:
  1. The form is the request, else `defaults.forms[harness]`, else unset.
  2. Unset: the form is `nativeForm(backend.offers)` and the backend is unchanged.
  3. Set, and the adapter lacks it: refused. The adapter has `acp` when its `acp` role is not
     null. Message: `harness <id> has no <form> form`.
  4. Set, and the backend offers it by `offersForm`: that backend.
  5. Set, the backend does not offer it, and `held` does: `held`.
  6. Otherwise refused. Message: `no backend here runs the <form> form`.
  A refusal exits 1 and creates nothing, like the plan's other refusals.
- Every spawn records its form with `setForm` in the same transaction as the rest of the
  spawn registration. The registration input type gains `form: FormId`.
- Every fixture and test that builds spawn params or a registration input gains the field.

Tests, in the spawn plan test file and the spawn registration test file:
- No form requested on a terminal backend: `tui`. On `headless`: `oneshot`.
- `defaults.forms` naming `tui` for the harness, on a terminal backend: `tui`, same backend.
- `acp` requested, adapter `acp` role null: refused with the message above.
- `acp` requested, fake adapter with an `acp` role, backend offering only a terminal: `held`.
- `oneshot` requested on a backend offering only a terminal: refused with the second message.
- A registered spawn has one open `agent_forms` row with its form.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T6 The static check keeps ACP inside `src/acp/`
Read `packages/orch/scripts/check-bridge.ts`, `packages/orch/scripts/check-layers.ts` and
`packages/orch/test/check-bridge.test.ts`. These three are the only files this section
edits, and editing them is allowed: they are build tooling, and you do not run them.

End state:
- `check-bridge.ts` gains one rule, built like its existing rules. A file under
  `packages/orch/src/` or `packages/orch/extensions/` that is not under
  `packages/orch/src/acp/` fails when it contains an import from a module whose name starts
  with `@agentclientprotocol/`, or a string literal that is one of these method names:
  `session/new`, `session/load`, `session/resume`, `session/close`, `session/list`,
  `session/prompt`, `session/cancel`, `session/update`, `session/set_mode`,
  `session/set_config_option`, `session/request_permission`. The message names the file, the
  line and `src/acp/` as the place the code belongs.
- The method names are one exported constant array in `check-bridge.ts`.
- `check-layers.ts`: `src/acp/` joins `SERVER`.

Tests in `packages/orch/test/check-bridge.test.ts`, using the helpers that file already uses:
- A file under `src/control/` importing `@agentclientprotocol/sdk` fails.
- A file under `src/adapters/` holding the string `"session/prompt"` fails.
- The same two files under `src/acp/` pass.
Run `bun test packages/orch/test/check-bridge.test.ts`.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T7 A held screen that orchd writes
Read `packages/orch/src/daemon/server/held.ts`, `packages/orch/src/types/pty.ts`,
`acp/findings/held-and-viewers.md`, and the test files that cover `held.ts`.

Today a held agent is a PTY plus a screen that `orch attach` streams. An agent on pipes has no
PTY, and orchd draws its transcript itself.

End state:
- `held.ts` can hold a screen with no PTY. One new exported function opens it for an agent
  with a size and returns `{ write(text: string): void; close(): void }`.
- Text written reaches the screen and every attached viewer through the same code PTY output
  takes. No second buffer, no second broadcast path.
- A held entry states its source as a union: a PTY, or a writer. No nullable `pty` field.
- Viewer input for a writer screen is dropped. A viewer resize changes the screen size.
- `close()` ends the screen the way a PTY exit ends it, so attached viewers see the end.
- Attach, detach, replay to a late viewer and the screen stream RPC work the same for both.

Tests, in the held test file:
- Text written before a viewer attaches is replayed to it. Text written after reaches it live.
- Input from a viewer of a writer screen reaches nothing and does not throw.
- `close()` ends the stream for an attached viewer.
- The existing PTY cases pass unchanged.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T8 The session log orchd writes, read by the one reader
Read `packages/orch/src/agent/read.ts`, `acp/findings/sessions.md`,
`packages/orch/src/types/form.ts`, and `form` on `AgentView` in
`packages/orch/src/types/store.ts`.

The one reader `readAgent` turns a harness's session file into entries. For a form whose
transcript orchd writes, the agent's log is JSONL that orchd appends: one entry per line, in
the entry type `readAgent` already returns.

End state:
- `src/types/form.ts` gains
  `export const FORM_TRANSCRIPT: Record<FormId, "harness" | "orchd"> = { tui: "harness", oneshot: "harness", acp: "orchd" };`
- New `packages/orch/src/agent/session-log.ts`:
  `appendSessionEntries(path: string, entries: readonly <Entry>[]): void` appends one JSON
  line per entry and creates the parent directory.
  `parseSessionLog(text: string): <Entry>[]` parses it with a real type guard. A line that is
  not an entry throws with the line number. `<Entry>` is the existing entry type by its real name.
- `readAgent` reads the agent's recorded log path with `parseSessionLog` when
  `FORM_TRANSCRIPT[form]` is `"orchd"`, and takes today's path otherwise. An agent with a
  null form takes today's path. Everything after parsing is shared.
- If `scripts/check-layers.ts` rejects where `session-log.ts` sits, do not add an exception:
  report it.

Tests, new `packages/orch/test/session-log.test.ts`:
- Entries appended in two calls parse back equal, in order.
- A malformed second line throws and the message names line 2.
- `readAgent` on an agent whose form is `acp`, with a log of three entries, returns them. Use
  the fixtures the existing `readAgent` tests use.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T9 The ack handler's body is a plain function
Read the `ack` handler in `packages/orch/src/daemon/server/handlers/table.ts` and
`packages/orch/src/daemon/server/outbox.ts`.

End state:
- `outbox.ts` exports `ackOutboxRow`, holding everything the `ack` handler does today after
  it has parsed its params. Its parameters are what that code needs, named and typed.
- The `ack` handler parses its params and calls `ackOutboxRow`. Nothing else changes.
- The code moves. It is not copied.

Tests: add nothing. Run the existing outbox ack test files once. They pass unchanged.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T10 `orch status` shows the form
Read `packages/orch/src/daemon/server/fleet-rows.ts`, `packages/orch/src/daemon/client/fleet-schemas.ts`,
the status command under `packages/orch/src/commands/status/`, and its tests.

`AgentView.form` and the fleet schema's `form` field exist. The status table does not show it.

End state:
- The status row has the agent's form. The table has a `FORM` column right after the harness
  column. A null form prints the way the table prints its other missing values.
- `--json` includes `form`.
- No branch on a form id anywhere. The column prints the value.
- Every fixture and snapshot of a status row or the status table gains the column.

Tests, in the status command's test file:
- An agent with form `tui` shows `tui` in the column. An agent with no form shows the
  missing-value text.
- `--json` output has `form` for both.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## L1 Lookup: the ACP TypeScript SDK as published
Read-only on the repo. Writes one file: `acp/findings/acp-sdk.md`.

`acp/reference/npm-sdk.json` holds the npm metadata of `@agentclientprotocol/sdk`. Find the
tarball URL of version 2.6.0 in it. Download that one file with `curl` into
`/tmp/claude-1000/-home-bryan-orch/f0cd823e-f445-4b4c-a865-538536ee281c/scratchpad/acp-sdk/`
and unpack it there with `tar`. Read the unpacked files. Never run, import or install
anything from it. Never run `npm`, `bun add` or `bun install`.

Answer in `acp/findings/acp-sdk.md`, each fact with the file and line in the unpacked tree,
and each signature copied exactly in a `ts` code block:
1. The `client()` function: its full signature, what it returns, and how a caller registers
   handlers for `session/update`, `session/request_permission` and extension methods.
2. How a client makes each request and what type each takes and returns: `initialize`,
   `session/new`, `session/load`, `session/resume`, `session/prompt`, `session/cancel`,
   `session/set_mode`, `session/set_config_option`, `session/close`, `session/list`.
3. `ndJsonStream`: its signature and the stream types it takes.
4. The exported type names for the `session/update` variants, `StopReason`, the permission
   request and its option kinds, and the protocol version constant.
5. Whether `ClientSideConnection` still exists and what its doc comment says.
6. From its `package.json`: `dependencies`, `peerDependencies`, `engines`, `type`, `exports`.
7. Every import in its `dist` JavaScript that is not a relative path: the module names.
8. A 30-line example, written from the signatures above and marked "not run", of a client
   that initializes, opens a session, sends one prompt and prints the stop reason.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/acp-sdk.md" or "blocked: <exact error>".
