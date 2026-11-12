# ACP layer: plan

Add the Agent Client Protocol (ACP) as a control layer on top of what orch already does.
Panes, hooks, the bridge and live TUIs all stay. ACP adds rich, structured control for every
harness that has an ACP binding, Claude included, and one feed that renders every agent from
every subscription in the terminal.

Mark items `[x]` as they land. Each step ends with `bun check` clean and the touched tests
green. Steps marked **Bryan** are yours (build, migrate, live checks, anything that opens a pane).

## The model

- **ACP is a capability, not a replacement.** An agent can be driven through its native TUI in
  a pane (hooks, bridge, keys), through ACP, or switch between the two. Live pane viewing keeps
  working exactly as it does now, across host links included.
- **orchd is the only ACP client.** orchd spawns the ACP binding, speaks JSON-RPC over its stdio,
  and turns `session/update` traffic into orch's own domain events. Nothing else in orch speaks
  ACP. The TUI feed, the web app and the CLI verbs only see orchd's events (Rule 9, law 2: the
  wire format lives in one module).
- **One owner per session.** A Claude session cannot be the native TUI and an ACP session at the
  same moment. Each one is its own process holding the session. orchd hands a session back and
  forth by its session id; it never runs both at once.
- **Every host works the same.** ACP agents run on the host orchd puts them on. Their events
  reach the spawner through the existing link subscriptions from the multi-host plan. Nothing new
  on the wire between orchds beyond the new event types.
- **Branch on capabilities.** Adapters declare an `acp` role. The control dispatcher uses the
  richest channel the agent has right now (ACP, then bridge, then keys). Never `if adapter.id`.

## Bindings

| Harness | ACP binding | Notes |
|---|---|---|
| claude | `claude-agent-acp` (`@agentclientprotocol/claude-agent-acp`) | Agent SDK under it. See usage pools below. |
| codex | `codex-acp` (`@agentclientprotocol/codex-acp`) | OpenAI allows subscription use in third-party tools. |
| gemini | `gemini --acp` (native) | New harness for orch, ACP-only at first. |
| opencode, qwen, others | native ACP | Free once the role exists: one adapter file each. |
| pi, omp | none confirmed | Stay on bridge and hooks until a binding exists. The role is simply null. |

## 0. Confirm before building (Bryan)

- [ ] **Usage pool.** On the Ultra login, run one `claude-agent-acp` session with the default
      entrypoint and a few turns, then check Settings → Usage (or `/usage` in a normal `claude`).
      Record whether it counted against the weekly subscription limit or the Agent SDK credit.
      This decides how hard the handoff in step 5 leans toward the native TUI for long runs.
- [ ] **Hooks under ACP.** With orch's Claude hook shim installed, run a `claude-agent-acp`
      session and check whether SessionStart, UserPromptSubmit, Stop and PreToolUse still fire
      (presence rows update, `orch lock` rewrite still applies). If they do, presence and the
      command gate carry over unchanged. If not, the ACP backend reports presence itself
      from `session/update`.
- [ ] **Session sharing.** Start a session over ACP, end it, then `claude --resume <id>` in a
      pane and confirm the conversation is there. Then the reverse with `session/load`. This is
      what makes the handoff possible.

Entrypoint: leave `CLAUDE_CODE_ENTRYPOINT` at the SDK default, or set an honest `orch`. Never
another product's identifier.

## 1. The `acp` role on adapters

- [ ] `AcpRole` in `src/types/adapter.ts`: `argv(opts): readonly string[]` for the binding,
      `env(opts)`, and `sessionShared: boolean` (the binding and the native TUI read the same
      session store, so a handoff is possible).
- [ ] `readonly acp: AcpRole | null` on `AgentAdapter`. Null everywhere first.
- [ ] Fill it in `src/adapters/claude.ts` and `src/adapters/codex.ts`. pi and omp stay null.
- [ ] `orch doctor`: for every installed adapter with an `acp` role, check the binding is on
      PATH and answers `initialize` with a protocol version orch accepts.
- [ ] Setup offers to install the bindings for installed harnesses (multi-select, as today).

## 2. The ACP backend

- [ ] `src/backends/acp/`: spawns `adapter.acp.argv`, owns the stdio JSON-RPC connection, runs
      `initialize`, `session/new` or `session/load`, `session/prompt`, `session/cancel`,
      `session/set_mode`, and model selection where the binding offers it.
- [ ] Records what the agent offered at `initialize` (load session, image input, modes, models)
      on the agent's spawn record, so the dispatcher gates on it.
- [ ] Answers the binding's client-side requests. `session/request_permission` goes to orch's
      `asking` state (see step 3). File read/write and terminal requests are declined at first:
      the agent uses its own tools.
- [ ] Process place and host types as for every other backend (`HostedProcess`, `LocalProcess`).
- [ ] `orch spawn --backend acp` and `defaults.backend` accept it; `settings.json` lists it among
      installed backends.
- [ ] Static check: no `session/` method name or ACP type outside `src/backends/acp/`.

## 3. ACP traffic as orch events

- [ ] Map `session/update` into orch domain events, sequenced like every other event:
      `agent-text` (message chunks, coalesced), `agent-thought`, `tool-call` (start, update,
      done, with diffs and locations), `plan`, `mode-changed`, `turn-ended {stopReason}`.
- [ ] `turn-ended` with `end_turn` settles the run as `done` and stores the final text as the
      result, the same record hooks write today. `cancelled` and `refusal` map to their own states.
      No more guessing turn ends from transcripts for ACP agents.
- [ ] `session/request_permission` becomes a `question` notice and the `asking` state, carrying
      the options the agent offered. `orch answer` picks one and orchd sends it back.
- [ ] Transcript-scale events stay on the agent's host; the spawner gets them through the link
      subscription and the one resolver (Rule 20), as tail and peek do now.

## 4. Control through the one dispatcher

- [ ] `deliverControl` (`src/control/dispatch.ts`) gains the ACP channel: `dispatch` and `steer`
      become `session/prompt` (steer cancels the running turn first when the binding cannot queue),
      `abort` becomes `session/cancel`, `model` uses the binding's model selection, `answer`
      resolves a pending permission request.
- [ ] Channel order per action, decided by roles: ACP when the agent is in ACP mode, else bridge,
      else keys. An action no channel supports fails loudly (exit 1), as now.
- [ ] Remote agents: the same verbs go over the link to the far orchd, which runs its own
      dispatcher (multi-host plan, step 5).

## 5. Handoff between ACP and the native TUI

- [ ] An agent's spawn record carries its current mode: `pane` or `acp`, plus the session id.
- [ ] `orch attach <agent>` on an ACP agent with `sessionShared`: wait for the turn to end (or
      ask to cancel it), close the ACP session, then open the native TUI in a pane with
      `--resume <id>`. Mode becomes `pane`; hooks take over presence.
- [ ] `orch detach <agent>` (or the pane closing): close the native TUI, `session/load` the same
      id over ACP. Mode becomes `acp`.
- [ ] The command lock guards the handoff, so a dispatch can't land halfway through.
- [ ] An ACP agent whose binding cannot share sessions attaches to orch's feed view of it instead
      (step 6), never a native TUI.
- [ ] Spawn-time default per adapter in `settings.json`: start in `pane` or `acp`.

## 6. The feed TUI

- [ ] One terminal view of every agent across every host, built on orchd's event stream. No
      ACP knowledge in it.
- [ ] ACP agents render fully inline: streamed text, tool calls with diffs, plan, permission
      prompts answerable in place.
- [ ] Pane agents render from their hook and bridge events (prompt, status, question, result),
      with one key to `orch attach` into the live TUI.
- [ ] `orch attach` on an ACP agent without a shared session opens this view, filtered to that
      agent, in a pane, so it reads like watching any other live pane.
- [ ] Renderer: pi-tui (differential rendering, node-compatible under Rule 6). Grow from
      `src/tui/screen.ts`.
- [ ] Read-only first, then interaction (steer, answer, abort, attach).

## 7. Web

- [ ] `packages/web` subscribes to the same event stream and renders the same feed. orchd serves
      it over the tailnet. No Electron.

## Order

0 (Bryan) → 1 → 2 with Codex as the first harness → 3 → 4 → 6 read-only → 5 → 6 interactive → 7.

Claude joins at step 2 once step 0 says how it bills and whether its hooks fire.

## Open questions

- Does `claude-agent-acp` pass the settings sources through so orch's hooks load? (step 0)
- Which bindings support `session/load`? It gates the handoff per harness.
- Steer while a turn runs: queue as the next prompt, or cancel and re-prompt? Per binding,
  decided by what `initialize` offers.
- Does a pi or omp ACP binding exist yet, and is it worth writing one in `extensions/`?
