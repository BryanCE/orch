# Claude Code mods: refresh since 2.1.290

Outside research, 2026-11-23. Baseline: `learnings/2026-10-09-claude-code-mods.md` (v2.1.290).
This file holds only what changed since then and what is now settled. Latest release is
**2.1.330** (npm `latest`, published 2026-11-20; `stable` is 2.1.323) ([npm]). The type file
read here is the GitHub copy at commit `db6aabc591`, 2026-11-23 ([dts]). The reference page
still says "as of v2.1.290" for the CLI, but its entries now carry notes up to v2.1.326 ([ref]).

Primary sources only. Link keys are expanded under Sources. "Not verified" means no primary
source states it.

## 1. `$.http.fetch({ socketPath })`

- Settled: `socketPath` is "the absolute path of a Unix domain socket the request goes over
  instead of TCP (near 100 B at most)". No relative path, no NUL. The URL still gives path,
  query and Host. Redirects stay on the socket. No proxy ([dts] `HttpInit.socketPath`).
- Settled: **timeout is 30 s per call, redirects and body included.** Request and response
  bodies are capped at 4 MiB ([ref] Limits). A long-poll must re-arm at least every 30 s.
- Still **not verified**: whether a path outside "one per session, in a private directory"
  (for example `$ORCH_DIR/orchd.sock`) is refused. The type doc still uses that phrase and
  names no rule that enforces it ([dts]).
- New: `claude plugin validate` cannot name the host of a `socketPath` fetch. It lists the
  call under `unread`, and the mod loads all the same ([dts] `hosts.unread`).
- New: where the organization's policy disallows WebFetch, every mod's `$.http.fetch` is
  refused ([adm]).
- Unchanged: it speaks HTTP only. orchd's JSON-line socket still needs an HTTP framing.

## 2. `$.process.spawn`

- Settled signature: `$.process.spawn({ argv, cwd?, env?, input? })` returns an async stream
  of `{ stream: 'stdout' | 'stderr', text }` pieces, then `{ code, signal }` ([dts]
  `ProcessSpawnRequest`, `ProcessSpawnChunk`, `ProcessSpawnResult`).
- Settled: **stdin cannot stay open.** `input` is "text written to the child's standard input,
  which is then closed; absent, standard input is closed from the start". The type adds "A
  string today; a later form may take the text in pieces" ([dts]).
- Settled: no timeout. The child lives as long as the `for await` loop. Leaving the loop,
  `next.signal` aborting, or the module unloading kills it, "and nothing else does, a hook's
  return included". A loop started inside `session.start` and not awaited runs for the
  session ([dts] examples).
- Settled: backpressure. Once 1,048,576 characters wait unread, the child blocks on its next
  write ([dts]). The `$.process` namespace is marked "CLI only" ([dts]).
- New in 2.1.326: `$.process.hookEnv()` returns `CLAUDE_CODE_SESSION_ID`, `CLAUDE_PID`,
  `CLAUDE_PLUGIN_ROOT` and others to pass as a child's `env` ([dts], [ref]).
- Effect on option B: a spawned helper can push orchd's deliveries to the mod over stdout. The
  mod cannot write to that helper. Reports go out by `$.process.run` or `$.http.fetch`.

## 3. Mid-turn steer

- Settled: **yes, through `$.session.append`.** The method existed at the baseline (a 2.1.293
  fix mentions it) and the baseline missed it ([cl] 2.1.293).
  `$.session.append({ message: { type: 'user', content: [textBlock] }, agentId? })` adds a row
  the model reads. "A `user` row waits for the next request of its loop … never between a
  call and its result" ([dts] `SessionAppendArgs`).
- How the model reads it: "It goes out as a reminder under a line naming the plugin." Right
  behind tool results it is a system message on models that take one. Otherwise it is folded
  into the result or fenced in the user turn. "It is never the person's words … A prompt is
  `$.prompt.submit`" ([dts]).
- Limits: on an idle session it waits for the next turn and does not start one. It is lost if
  the process dies while its loop runs and before a request carries it ([dts]). Content is
  text blocks only ([dts]).
- A second route: a `tool.call` hook's `context` rides with the tool result the same way
  ([dts] `SessionAppendArgs`, `PromptAttachmentOrigin`).
- Unchanged: `$.prompt.submit` still waits for idle and resolves when its turn starts ([api]).

## 4. Changing the model

- Settled: there is no setter. `$.session` lists `messages, cwd, root, model, turns, id, repo,
  surfaces, usage, version, info, compact, send, append, authorize`, and `model()` only reads
  ([ref], [dts]).
- Works: a `turn.step` hook can return `next({ ...e, model })` on every request. Since 2.1.309
  an alias such as `haiku` resolves ([cl] 2.1.309, [ev]). No source says this changes the
  session's model or what `$.session.model()` returns.
- `$.command.run({ command: "model", args })`: the method "runs a slash command as if the
  person typed" it, and the type's own example runs the built-in `/status` ([dts]). No source
  names `/model`. **Not verified.**
- `$.config.set`: the `/config` menu has a Model row ([dts] `PostModelSwitchHookInput.source`).
  No source gives its key. `set` returns `{ deny }` where "only its dialog changes" a row
  ([dts]). **Not verified.**
- Confirmation: the settings hook event `PostModelSwitch` (`from_model`, `to_model`,
  `source`) is reachable as `classic.PostModelSwitch` ([hk], [dts]). See the guard caveat in 8.

## 5. `$.command.run({ command: "clear" })`

- **Not verified.** No source names `/clear` for `$.command.run`. The general contract covers
  built-ins, as in 4.
- Settled limits on the call: it is queued and runs once the session is idle. It rejects
  inside a hook that the turn or session start waits on, and past a Stop or a host's limit
  ([dts]). After the user stops a turn, it rejects until the user's next input ([api]).
- Unchanged: `session.start` does not refire after `/clear`, and `session.end` fires with
  `reason: "clear"` ([ref]).

## 6. "Early access" label

- **Not gone.** Line 3 of the type file still reads "EARLY ACCESS: this surface may change
  between releases without notice" at commit `db6aabc591` ([dts]).
- The docs pages carry no such label. The overview mentions early access only for the
  `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` variable, which 2.1.287+ ignores ([ov]).

## 7. Hook budget and worker thread

- **Unchanged:** 10 s of a hook's own execution per event. Time inside `next` and `$` calls
  does not count, except `$.clock.sleep` ([ref] Limits). Awaiting your own promise counts
  ([ev]).
- **Unchanged:** "Installed mods share one worker thread." Three crashes that cannot be traced
  to one mod unload every non-built-in mod for the session ([ts]).
- Limits [ref] now states that the baseline did not list: `prompt.edit` 50 ms. A `.catch`
  handler 1 s. A `ui.render` hook may wait 30 s on `$` calls and `plugin.register` 10 s (both
  v2.1.326). All `session.end` hooks share the SessionEnd budget, 1.5 s by default.
  `next.budget.ms` and `next.budget.remainingMs` expose the limit to the hook ([ref]).
- A `tool.list` hook's `$` calls are aborted past 30 s in all ([dts]).

## 8. Hiding tools, skills or context from the model

Settled: **yes**, on these events ([ref], [dts]):
- `tool.list`: leaving a tool out of the answer removes it "for the model, every agent",
  MCP tools included. Since 2.1.323 removals apply to the model and every agent ([cl]). The
  event fires before a thread's first request and again on changes, never per turn. A tool a
  thread already declared stays declared until compaction, and calls to it are refused
  ([dts]). `tool.list` is missing from the reference event tables ([ref]).
- `tool.describe`: can rewrite a description or set `isDeferred` to move a tool behind tool
  search. It cannot remove a tool ([ref]).
- `prompt.attachment` with `type: "skill_listing"`: returning `{ text: null }` leaves the skill
  listing out of the request ([dts] `UndeclaredAttachmentInput`, `PromptAttachmentResult`).
- `prompt.section`: `{ text: null }` omits a system-prompt section. `prompt.compose` returns
  the section list, and `prompt.context` returns the first-message context blocks ([ref]).
- `agent.offer`: `{ isOffered: false }` withholds a subagent type ([ref]).
  `command.describe`: `isHidden` hides a command from the list ([ref]).

Guard caveat: the built-in guard `sec-default@builtin` loads when the machine has managed
settings or `managed-mcp.json`, or the session uses a Team or Enterprise `/login`. Where it
loads, a user's mod hooks on `prompt.compose`, `prompt.section`, `prompt.context`,
`prompt.attachment`, `skill.prompt`, `session.compact`, `settings.read` and every `classic.*`
event never run ([adm]). A user's `tool.list` hook cannot remove a managed MCP server's tools
([dts]). A mod installed as the organization's own, through managed `prependPlugins`, is exempt
([adm]).

## 9. Flags and settings

- `--disallowedTools Skill`: "A bare tool name removes the matching tools from Claude's
  context" ([cli]). Whether the skill listing is still injected once the Skill tool is gone is
  **not verified**. The skills and permissions pages say only that denying `Skill` disables all
  skills ([sk], [perm]). The type file ties the listing to the tool ("`skills`: the Skill tool
  has commands to list") but says nothing about removal ([dts]).
- `--disable-slash-commands`: "Disable all skills and commands for this session" ([cli]).
  Whether that blocks built-ins such as `/clear` is **not verified**. 2.1.304 corrected its
  `--help` text without quoting it ([cl]).
- `skillOverrides`: per skill, `"off"` or `"user-invocable-only"` hides it from Claude, and
  `"name-only"` drops its description. It does not apply to plugin skills ([set], [sk]).
- `skillListingBudgetFraction`: must be greater than 0 (default 0.01). Over budget, the
  listing "keeps every skill's name" ([set]). It cannot remove the listing.
  `skillListingMaxDescChars` (default 1536) and `SLASH_COMMAND_TOOL_CHAR_BUDGET` only size it
  ([set], [env]).
- `disableBundledSkills`: removes bundled skills and hides built-in commands such as `/init`
  from the model ([set]). Frontmatter `disable-model-invocation: true` takes one skill out of
  context entirely ([sk]).
- No settings-reference entry removes the whole listing. The one documented way to remove all
  of it is the `prompt.attachment` hook in 8.

## Other changes that touch the bridge

- Dispatch after an interrupt: once the user stops a turn, `$.prompt.submit`
  resolves `{ drop: 'the session was stopped and nobody has sent input since' }`, and queued
  prompts are dropped, until the user's next input. Headless runs refuse past `--max-turns`
  and `--max-budget-usd` ([api]). A dispatch ack must read `drop`.
- `turn.start` also fires for subagents and teammates since 2.1.299. Tell them apart by
  `e.agentId` ([cl] 2.1.299).
- `session.stop` fires when the user stops Claude (2.1.326). `tool.run` fires for an allowed
  call about to run (2.1.326) ([ref]).
- A mod turned off remotely now unloads between turns (2.1.299) ([cl]).
- The guard skips `classic.*` hooks on managed or Team/Enterprise machines ([adm]). The
  baseline's plan to use `classic.StopFailure` and `classic.SessionStart` fails there. Use
  `turn.complete` (`isAborted`) and `session.end` (`reason`) instead.
- Unchanged: plugins do not run in Desktop WSL sessions ([ov]).

## Verdict

What a Claude mod can now carry, on documented APIs:

| Bridge part | Route | Status |
| :- | :- | :- |
| dispatch | `$.prompt.submit({ text, asUser: true })` | Works when idle. Dropped after a user stop |
| steer | `$.session.append` user row | Works mid-turn. The model reads it as a plugin reminder, not user words. Idle needs a dispatch |
| answer | `tool.call` hook on `orch_ask` or `AskUserQuestion`, waiting in re-armed 30 s fetches or on helper stdout | Works |
| model | `turn.step` per-request rewrite | Works per request. `/model` through `$.command.run` is not verified |
| reset | `$.command.run({ command: "clear" })` | Not verified |
| tool registration | `$.tool.register` + `tool.call`; `tool.list` to strip | Works |
| presence reports | `$.http.fetch` POST, or `$.process.run` one-shot | Works once orchd has an HTTP framing |

What still blocks the rest:
1. orchd speaks JSON lines. The mod needs HTTP over the socket (30 s per call), or a spawned
   helper. The helper gets no stdin from the mod, so it only carries inbound deliveries.
2. Whether `socketPath` may name orchd's own socket is not verified.
3. `/model` and `/clear` through `$.command.run` are not verified. One live run by Bryan
   settles both.
4. The shared bridge code imports Node modules, and the mod worker has none (Rule 6/9 boundary,
   unchanged).
5. Fragility: the API is still marked early access. Where the guard loads, it removes
   `classic.*` and prompt-shaping hooks. The worker is shared, and Desktop WSL sessions load no
   plugins.

## Sources

- [ov]: https://code.claude.com/docs/en/plugins/mods/overview
- [ref]: https://code.claude.com/docs/en/plugins/mods/reference (Limits, Events, Mods API methods)
- [api]: https://code.claude.com/docs/en/plugins/mods/api
- [ev]: https://code.claude.com/docs/en/plugins/mods/events
- [ts]: https://code.claude.com/docs/en/plugins/mods/troubleshoot
- [adm]: https://code.claude.com/docs/en/plugins/mods/admin (Know what happens by default; Know which hooks of a user's mod don't run)
- [dts]: https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts (commit db6aabc591, 2026-11-23)
- [cl]: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md (2.1.291 through 2.1.330)
- [npm]: https://registry.npmjs.org/@anthropic-ai/claude-code (dist-tags latest 2.1.330, stable 2.1.323)
- [cli]: https://code.claude.com/docs/en/cli-reference
- [sk]: https://code.claude.com/docs/en/skills
- [set]: https://code.claude.com/docs/en/settings-reference
- [perm]: https://code.claude.com/docs/en/permissions
- [env]: https://code.claude.com/docs/en/env-vars
- [hk]: https://code.claude.com/docs/en/hooks (PreModelSwitch, PostModelSwitch)

[ov]: https://code.claude.com/docs/en/plugins/mods/overview
[ref]: https://code.claude.com/docs/en/plugins/mods/reference
[api]: https://code.claude.com/docs/en/plugins/mods/api
[ev]: https://code.claude.com/docs/en/plugins/mods/events
[ts]: https://code.claude.com/docs/en/plugins/mods/troubleshoot
[adm]: https://code.claude.com/docs/en/plugins/mods/admin
[dts]: https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts
[cl]: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
[npm]: https://registry.npmjs.org/@anthropic-ai/claude-code
[cli]: https://code.claude.com/docs/en/cli-reference
[sk]: https://code.claude.com/docs/en/skills
[set]: https://code.claude.com/docs/en/settings-reference
[perm]: https://code.claude.com/docs/en/permissions
[env]: https://code.claude.com/docs/en/env-vars
[hk]: https://code.claude.com/docs/en/hooks
