# Claude Code mods vs orch's bridge

Outside research, 2026-10-09. Question: Claude Code now ships "mods". Can one carry orch's
in-session bridge for Claude, the way the pi extension carries it for pi, so the Claude
adapter declares `bridge: { takes: [...] }` instead of hook shims and typed prompts?

Primary sources only. Link keys are expanded under Sources. "Not verified" means no primary
source states it.

## 1. What a mod is

- "Claude Mods" is the official product name. A mod is a plugin whose code registers
  event handlers; "function hook" is the implementation term ([ov], [gh91870]). Added in
  **v2.1.287**, changelog line "Added Claude Mods: plugins may now modify deeper behavior"
  ([cl]); npm published 2.1.287 on 2026-10-01 ([npm]); announced 2026-10-01 ([blog]). Desktop
  has had mods since 2.1.286 ([ov]). Before that it was early access behind
  `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`, which 2.1.287+ ignores ([ov]). The published type file
  still says "EARLY ACCESS: this surface may change between releases without notice" ([dts]).
  Mods are on by default ([ov]).
- Layout: `.claude-plugin/plugin.json`, `hooks/hooks.json` with `"modules": ["./register.js"]`,
  and an ES module exporting `register(on, options)`. `.js/.mjs/.ts/.tsx` and the rest are
  accepted ([ref]).
- Loading: install from a marketplace (`claude plugin install name@market`), or load a
  directory **for one session** with `claude --plugin-dir <dir>` (repeatable, hot-reloads on
  save), or `CLAUDE_CODE_PLUGIN_DIRS` for hosts that can't take a flag ([ov], [ref]). There is
  no `--mod` flag. `--settings` carries no mods. A first-time directory needs its trust prompt
  accepted ([ts]). `--bare`, `--safe-mode`, `disableAllHooks`, managed `allowManagedModsOnly`
  and `disableSideloadFlags` (which rejects `--plugin-dir`) stop installed or side-loaded mods,
  and Anthropic can turn installed mods off remotely with a "rollout switch" ([ref], [ts]).
- Runtime: **in Claude Code's process, on one worker thread that all installed mods share**
  ([ov] "functions ... Claude Code calls in its own process"; [ts] "Installed mods share one
  worker thread"). A hook that blocks the thread gets its mod unloaded. Three worker crashes
  unload every non-built-in mod for the session ([ts]).
- **No Node.js.** "The hooks module itself has no Node.js APIs, no timer globals such as
  `setTimeout`, and no network or file access of its own." Standard JS and web APIs (`URL`,
  `TextEncoder`, `AbortController`, `crypto.subtle`) exist. All I/O goes through `$` ([api]).
  This is deliberate: "everything goes through `$` so that admins can audit, allowlist, deny,
  log" ([gh91870]). Every `$` call is itself an event that another mod can refuse ([api]).
- Lifetime: loaded once per session. `session.start` fires once per load, before the first
  prompt, and Claude Code waits for it. It fires again after a reload, **not** after `/clear`,
  `/resume` or `/branch` ([ref], [api]). Module variables reset on reload. `$.state` resets on
  `/clear`, `/resume` and `/branch` ([ts]). Timers (`$.clock.every/after`) run between turns
  until the module reloads ([api]).
- Where it runs: hooks run in the terminal CLI, Desktop, the VS Code panel, `claude -p` and the
  Agent SDK. Drawing only works in the terminal and Desktop. Plugins are unavailable in Desktop
  WSL sessions ([ov]).
- Limits: a hook gets **10 s of its own execution per event**. Time inside `next` or inside a
  `$` call does not count, **except `$.clock.sleep`, which does**. Time awaiting "a promise of
  your own" counts too ([ref], [ev]). A timed-out hook is skipped and the event proceeds ([ev]).
  `$.process.run` defaults to 30 s, max 10 min ([ref]).

## 2. API surface (as of v2.1.290 per [ref])

Events ([ref], [ev]):
- Session: `session.start`, `session.end` (`reason`: clear/resume/logout/prompt_input_exit/other),
  `session.compact` (can veto), `session.receive`/`session.send` (peer messages),
  `session.append`, `session.attach/detach`, `session.measure`.
- Prompt: `prompt.submit` (rewrite `text`, add hidden `context`, or `{ drop }`; `e.origin`
  says who submitted it), plus `prompt.fill/suggest/edit/compose/section/context/attachment/mention`.
- Turn: `turn.start` (`turnId`), `turn.step` (one model request; can retarget `model` or
  `effort` per step; the message list is pinned, so it cannot inject messages), and
  `turn.complete` (`e.answer` final text, `e.isAborted`, `e.durationMs`, `e.usage`) ([ev], [dts]).
- Tools: `tool.call` (deny, rewrite input, answer with `{ result }`, retry, or post-process the
  result), `tool.check` (allow/ask/deny), `tool.describe` ([ref], [ev]).
- Commands and config: `command.run`, `command.describe`, `config.set`, `config.describe` ([ref]).
- Subagents: `agent.offer`, `agent.spawn` ([ref]).
- Every settings-hook event as `classic.<Event>` (`classic.Stop`, `classic.StopFailure`,
  `classic.Notification`, `classic.SessionStart`), with `e` equal to the hook's stdin JSON ([ref], [ev]).
- No dedicated model-change event. `config.set` fires for `/config` rows, and since 2.1.295
  `/model` asks a plugin's `config.set` hook before saving ([cl]).

Methods ([ref], [api], [dts]):
- Tools: `$.tool.register({ name, description, inputSchema, isDeferred })`, served by a
  `tool.call` hook on `mcp__<plugin>__<name>`. Register in `session.start` ([api]).
- Commands: `$.command.register({ name, description, argumentHint, immediate })`.
  `$.command.run({ command, args })` runs a slash command "as if the person typed" it, queued
  until idle ([dts]).
- Push into the session: `$.prompt.submit({ text, asUser })` starts a turn. **It waits until
  the session is idle** and resolves when that turn starts ([api]). A plugin's own submit
  carries no `turnId` and "runs once it is idle" ([dts]). There is no mid-turn steer method.
  A peer session's message is the one input that reaches the model inside a running turn
  ([dts] `PromptSubmitInput.turnId`; [xs] "reads the message between tool calls").
- `$.turn.abort({ turnId })` ([ref], [dts]); `$.session.compact()` between turns ([dts]).
- Session reads: `$.session.id/cwd/model/messages/usage/version/surfaces/repo` ([ref]).
  `$.session.model()` only reads ([dts]).
- UI: `$.ui.status/toast/notify/log/ask/open` plus panes and the band above the prompt ([ref]).
  `$.ui.ask(question, options)` shows the AskUserQuestion dialog and resolves to the pick ([ev]).
- I/O: `$.fs`, `$.store`, `$.env.get/set` (names must be string literals), `$.clock`,
  `$.http.fetch`, `$.process.run/spawn`, `$.mcp`, `$.model.complete/fork` ([api], [ref]).

Changing the model: no `$.session.setModel`. Two documented routes might do it:
`$.command.run({ command: "model", args })` and `$.config.set({ key, value })`. Neither is
documented for the model specifically: **not verified**. Clearing the session: likely
`$.command.run({ command: "clear" })`, **not verified** for built-in `/clear`.

## 3. Can a mod hold a long-lived socket to orchd?

**No `node:net`. A mod cannot open, hold or listen on a socket** ([api]). What it does have:

- `$.http.fetch(url, { socketPath })` speaks **HTTP** over a Unix socket and resolves "once the
  body is read" ([dts] `HttpInit.socketPath`). The path is capped near 100 bytes ([dts]). The
  type doc says "one per session, in a private directory", and whether an arbitrary socket path
  such as `$ORCH_DIR/orchd.sock` is accepted is **not verified**. Any fetch timeout:
  **not verified**. So request/response and long-poll are possible against an HTTP server.
  orchd speaks JSON lines, not HTTP (`openJsonLineLink`/`requestJsonLine` in
  `packages/orch/src/agent/daemon-client.ts`).
- `$.process.spawn` "streams a long-running command's output" ([api]). Its signature is missing
  from the published type file, which was written by 2.1.277 ([dts]). Community reports say
  stdin is a one-shot string, closed after writing: **not verified** from a primary source.
  `$.process.run` takes `stdin` as "text written ... then closed" ([dts]).
- The session's own inbox socket (`CLAUDE_CODE_MESSAGING_SOCKET`, plus
  `CLAUDE_CODE_MESSAGING_TOKEN`) accepts line messages from local processes. A message from one
  of the session's own child processes is delivered without a `crossSessionInbound` setting, on
  Linux by process evidence. Delivery happens between tool calls mid-turn, or starts a turn when
  idle ([xs]). Only the auth line's format is documented. The message line format is **not
  verified**. Claude reads it as a message from another session, not from the user ([xs]).

## Bridge mapping

orch's bridge contract: `HarnessApi` (`packages/orch/src/types/agent.ts`), deliveries
`dispatch | steer | answer | model` (`packages/orch/src/control/bridge-message.ts`), applied
in `routeDelivery` (`packages/orch/src/agent/presence.ts`), and the link in
`packages/orch/src/agent/daemon-client.ts`.

| orch need | pi today | Claude mod route | Status |
| :- | :- | :- | :- |
| Attach link to orchd, receive pushes | `openJsonLineLink` over node:net | Option A: HTTP long-poll via `$.http.fetch({ socketPath })` in a `$.clock` loop. Option B: `$.process.spawn` a node helper that holds the node:net link and prints deliveries to stdout | Possible, but needs either an HTTP endpoint on orchd or a helper process. No direct socket |
| `ack`, `report-status`, `report-result`, `control-outcome`, `question` | one JSON line on the link | `$.http.fetch` POST (A), or `$.process.run` one-shot per report (B) | Possible (A needs orchd HTTP) |
| `dispatch` | `sendUserMessage(text)` | `$.prompt.submit({ text, asUser: true })`. Ack when it resolves, which means the turn started ([api]) | **Works** when idle. Queued until idle otherwise |
| `steer` (mid-turn) | `sendUserMessage(text, { deliverAs: "steer" })` | No mod API. `prompt.submit` waits for idle and `turn.step` messages are pinned. Workarounds: append to the next tool result in a `tool.call` hook ([ev] allows rewriting a result), or post to the inbox socket as an own-child message ([xs]) | **Gap.** Workarounds unverified |
| `answer` to `orch_ask` | `answers.settle` resolves the waiting tool | The `tool.call` hook for `mcp__<plugin>__orch_ask` must wait **inside a `$` call**: a long-poll `$.http.fetch` for that question id, or `$.process.run` (10 min max). A promise resolved by the background delivery loop counts against the 10 s limit ([ev], [ref]) | Possible, with a different wait shape than pi |
| `answer` to Claude's own AskUserQuestion | trailing-`?` heuristic on Stop, answer typed as next prompt | `tool.call` hook on `AskUserQuestion`: post the question to orchd, wait in a `$` call, return `{ result }` ([ev]) | Possible. Replaces the heuristic |
| `model` | `harness.setModel` + registry find | `$.command.run({ command: "model", args })` or `$.config.set`. Confirm with `$.session.model()` | **Not verified** |
| thinking level | `get/setThinkingLevel` | Per-step `effort` rewrite in `turn.step` only ([ev]) | Gap for a persistent setting |
| reset (`/clear`) | lifecycle text | `$.command.run({ command: "clear" })`. Note `session.start` does not refire; use `classic.SessionStart` with `source: "clear"` ([ref], [ts]) | Not verified |
| Register `orch_ask`, `orch_send`, `orch_agents`, `orch_read` | `registerTool` | `$.tool.register` + `tool.call` hook. The model sees `mcp__<plugin>__orch_send` and so on. Use `isDeferred: false` so the tools are always listed ([api]) | **Works** |
| `/peers`, `/tell` commands | `registerCommand` | `$.command.register` + `command.run`, `immediate: true` to run mid-turn ([api]) | Works |
| Lifecycle → presence | `session_start`, `before_agent_start`, `agent_start`, `turn_end`, `message_end`, `tool_execution_start`, `agent_end`, settle event, `session_shutdown` | `session.start`, `prompt.submit`, `turn.start`, `turn.step` result (`usage`), `tool.call`, `turn.complete` (`answer`, `isAborted`), `classic.StopFailure`, `session.end` | Works. `turn.complete` as the "settled" signal for auto-continue cases is not verified |
| Command gate (lock rewrite of Bash) | `tool_call` mutates input | `tool.call` on `Bash`, `next({ ...e, command: wrapped, timeout })` ([ev]) | Works |
| Context, cost, session id | `ctx.getContextUsage`, `sessionManager` | `$.session.usage()`, `$.session.id()`. Transcript path from `classic.*` `transcript_path` ([ref], [ev]) | Works |
| HUD/status | `ui.setStatus/notify/setWidget` | `$.ui.status`, `$.ui.toast`/`notify`, `AbovePrompt` band ([api], [ref]) | Works |
| Identity (launch credential, orch dir) | `process.env` | `$.env.get("<literal>")` ([api]) | Works |

Verdict on the declared capability: a mod supports `bridge: { takes: ["dispatch", "answer"] }`
on documented APIs. `"model"` is plausible but unverified. `"steer"` has no mod API. Under
architecture law 3 (`learnings/2026-07-16-harness-plexer-architecture.md`), steer stays on the
plexer fallback or fails loudly until a route is proven.

## Gaps

1. **No socket.** The bridge's node:net link can't run in the mod. orchd would need an HTTP
   framing that `$.http.fetch({ socketPath })` can call (a new transport on the one daemon
   socket, or a second endpoint), or the mod would need a spawned node helper. Both are new
   surfaces. Socket path acceptance and fetch timeouts are not verified.
2. **The shared bridge code can't be loaded as is.** `registerHarnessBridge` → `createDaemonLink`
   and `presence.ts` import `node:fs`, `node:crypto` and the node:net socket client. The mod
   worker has no Node APIs ([api]). A Claude composition root in `extensions/claude/` would need
   a `$`-backed `DaemonLink` and a `HarnessApi` adapter, and the shared `src/agent/**` code would
   need its node imports pushed behind ports. This is the Rule 6/9 boundary, not a mod limitation.
3. **No mid-turn steer.** `$.prompt.submit` waits for idle ([api], [dts]). Only peer messages
   land mid-turn ([xs]), and only as "from another session".
4. **Waits must live inside `$` calls.** The 10 s own-time budget counts `$.clock.sleep` and
   your own promises ([ref], [ev]). `orch_ask` can't block on an in-memory waiter the way
   `presence.answers.await` does.
5. **Model and thinking control are unverified.** There is no setter, only `$.command.run` or
   `$.config.set` guesses, and per-step `effort`.
6. **Fragility.** The mod API is still marked early access ([dts]). Rollout can be switched off
   remotely, and `--bare`, `--safe-mode`, `disableAllHooks` and managed policy can block it
   ([ref], [ts]). A shared worker crash can unload it mid-session ([ts]). The Claude adapter
   would need a doctor check that the mod actually loaded (debug log line
   `hooks module <name>@inline loaded`, [ts]).
7. **`process.spawn` contract unpublished.** It is absent from the published type file ([dts]),
   and its stdin behavior is not verified.

## What it replaces in today's Claude integration

- **Hook shims.** `packages/orch/extensions/claude/index.ts`, built as
  `dist/scripts/claude-hooks.js`, and the `hooks` block written into `$ORCH_DIR/claude/settings.json`
  by `packages/orch/src/adapters/claude.ts` / `claude-hooks.ts`. The six events (SessionStart,
  UserPromptSubmit, Stop, StopFailure, Notification, PreToolUse:Bash) map to `session.start`,
  `prompt.submit`, `turn.complete`, `classic.StopFailure`, `tool.check`/AskUserQuestion, and
  `tool.call`. Stop's transcript re-read and the trailing-`?` question heuristic go away:
  `turn.complete` carries `e.answer` ([ev]), and AskUserQuestion/`orch_ask` are real tool calls.
  `--settings` stays for the compaction env, and spawn adds `--plugin-dir <mod dir>`.
- **Typed prompts.** For dispatch, the plexer typing into the pane is replaced by
  `$.prompt.submit`. Steer keeps the typed path until gap 3 closes.
- **Prompt-echo RPC.** `report-prompt` and `packages/orch/src/control/echo.ts`
  (`expectEcho`/`takeEcho` text matching) exist only to ack typed text. A pushed delivery is acked
  by id once `$.prompt.submit` resolves. A `prompt.submit` hook can still report human-typed
  prompts, with `e.origin.kind` telling them apart ([dts]).
- **Adapter roles.** `hooks: { reports: ["start", "prompt"] }` becomes null and `bridge` becomes
  non-null. `steer()` keeps returning undefined for the plexer fallback.

## Cost

- Today: every matched hook event starts a runtime process (node/deno/bun) running the shim,
  which dials orchd once. That is six event kinds, and PreToolUse fires on every Bash call.
- Mod: the module loads once, on the shared worker at session start. Events are in-process
  function calls. Each report is one host-mediated `$.http.fetch`, or one `$.process.run` under
  option B, which costs a process like today. `session.start` delays the first prompt until it
  returns ([api]), so the attach must not be awaited there.
- No primary source gives load-time or per-event numbers: **not verified**. Measure before
  claiming a win.

## Sources

- [ov]: https://code.claude.com/docs/en/plugins/mods/overview
- [ref]: https://code.claude.com/docs/en/plugins/mods/reference (states "as of v2.1.290")
- [api]: https://code.claude.com/docs/en/plugins/mods/api
- [ev]: https://code.claude.com/docs/en/plugins/mods/events
- [ts]: https://code.claude.com/docs/en/plugins/mods/troubleshoot
- [dts]: https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts (header: "Written by Claude Code 2.1.277"; [ref] says the repo copy can lag the installed build)
- [cl]: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md (2.1.287 through 2.1.295)
- [blog]: https://claude.com/blog/claude-code-mods (2026-10-01)
- [gh91870]: https://github.com/anthropics/claude-code/issues/91870 (design discussion linked from [blog])
- [xs]: https://code.claude.com/docs/en/cross-session-messaging (delivery timing, inbox socket)
- [ch]: https://code.claude.com/docs/en/channels (the other official push mechanism: an MCP server opted in per session with `--channels`, research preview, allowlisted plugins only)
- [npm]: https://www.npmjs.com/package/@anthropic-ai/claude-code (registry times: 2.1.286 2026-09-30, 2.1.287 2026-10-01, 2.1.295 2026-10-08; the package ships a native binary and no mod types)

[ov]: https://code.claude.com/docs/en/plugins/mods/overview
[ref]: https://code.claude.com/docs/en/plugins/mods/reference
[api]: https://code.claude.com/docs/en/plugins/mods/api
[ev]: https://code.claude.com/docs/en/plugins/mods/events
[ts]: https://code.claude.com/docs/en/plugins/mods/troubleshoot
[dts]: https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts
[cl]: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
[blog]: https://claude.com/blog/claude-code-mods
[gh91870]: https://github.com/anthropics/claude-code/issues/91870
[xs]: https://code.claude.com/docs/en/cross-session-messaging
[ch]: https://code.claude.com/docs/en/channels
[npm]: https://www.npmjs.com/package/@anthropic-ai/claude-code
