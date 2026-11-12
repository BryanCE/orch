# ACP in orch: product requirements

## What this is

orch drives coding harnesses today by typing into a terminal, through a bridge extension, or
through hooks. The Agent Client Protocol is a JSON-RPC protocol over stdio that Codex, Claude,
Gemini and others speak through a binding. It gives structured control: a turn has a defined
end and a stop reason, a permission request arrives as a request with options, and tool calls
arrive as data instead of screen text.

This job makes an ACP session one more way orch runs and drives an agent. An ACP agent is an
ordinary orch agent. Every verb, every host, the lease rules, the outbox, the event log and
`orch status` treat it the same as an agent in a pane.

## Who it is for

Bryan, running a mixed fleet from one terminal across linked hosts, on his own subscriptions.

## What it must do

1. Start an agent in ACP form on this host or a linked host with one flag on `orch spawn`.
2. Drive it with the verbs that exist: `dispatch`, `steer`, `abort`, `answer`, `model`,
   `reset`, `restart`, `close`.
3. Report its state from the protocol: a turn end settles the run with its result text, a
   permission request becomes a question with the options the agent offered.
4. Show it: `orch attach` and a viewer pane show a live transcript, `orch tail`, `orch peek`
   and `orch result` read it through the one log reader and name the host.
5. Switch one agent between its TUI and ACP and keep the same agent id and the same
   conversation, for bindings that share sessions with their TUI.
6. Keep the ACP wire format in one module, proven by a static check.

## MVP: the stopping point

The job stops when Bryan runs this list on a build and every line passes. Nothing after the
list is part of this job.

1. `orch spawn a --harness codex --form acp --prompt "<task>"` prints `Spawned a`. `orch status`
   shows `a` with form `acp`, `working`, then `done`. `orch result a` prints the final text.
2. Inside a plexer the same spawn opens a pane that shows the transcript as it streams.
   Closing the pane leaves the agent running.
3. `orch dispatch a "<task>"` starts a new turn. `orch steer a "<text>"` during a turn lands
   as the next prompt when the turn ends. `orch abort a` moves it to `aborted` within a second.
4. A permission request shows in `orch questions` with numbered options. `orch answer a 2`
   resolves it. Two requests open at once both stay open until each is answered.
5. `orch tail a` and `orch peek a` print the transcript and name the host.
6. Lines 1 to 5 pass with `--host <linked host>`.
7. `orch restart a --form tui` keeps the agent id and the conversation and puts the harness
   TUI on the held screen. `orch attach a` types into it. `orch restart a --form acp` goes back.
8. Lines 1 to 7 pass with `--harness claude`, once the checks in "Bryan's checks" are recorded.
9. `orch doctor` names each installed binding, its version and the protocol version it answered.
10. `bun check` is clean, and the static check fails on any ACP method name or SDK import
    outside `src/acp/`.

## Not in this job

Each of these has a place in the model. None is built here.

- A feed view of every agent in one terminal.
- The web UI rendering transcripts.
- A structured per-agent session stream over RPC. The MVP shows an ACP agent through the
  screen stream, with orchd drawing the transcript.
- Adapters for Gemini, opencode and other ACP-native harnesses.
- Moving an agent out of a plexer pane into ACP. That is a change of backend, and only a
  change of form keeps the same agent. An agent that should switch is spawned held by orchd.
- The threads table. The design is in `MODEL.md`.
- Answering the agent's file and terminal requests. orch declares neither client capability,
  so the agent uses its own tools.
- ACP turns that survive an orchd reload. An agent orchd holds ends when orchd stops, as held
  agents do today. `orch restart` resumes its conversation.

## Decisions

- An ACP agent is the same kind of agent as any other. A form switch never mints a new agent.
  That holds for form only.
- ACP is neither a harness nor a backend. It is a form a harness runs in and a channel orch
  drives it through. `MODEL.md` defines both words.
- orchd is the only ACP client. The CLI and the web UI never see ACP.
- Codex is the first harness. Claude follows when Bryan's checks are recorded.
- orchd holds every ACP agent, on pipes it owns.
- Steer never cancels a turn. `orch abort <agent> "<text>"` is the verb that cancels and steers.
- The agent's permission mode comes from the worker policy in settings at session start.
- Transcript traffic never enters the durable event log. Fleet events stay as they are.
- This work does not wait for the open items in `PLAN.md`.

## Bindings

Checked against npm and each README on 2026-11-11. The raw files are in `reference/`.

| Harness | Binding | Version | Notes |
|---|---|---|---|
| codex | `codex-acp` from `@agentclientprotocol/codex-acp` | 2.6.0 | Ships its own `@openai/codex`. `CODEX_PATH` points it at another. ChatGPT login or an API key. `INITIAL_AGENT_MODE` sets the starting permission mode. |
| claude | `claude-agent-acp` from `@agentclientprotocol/claude-agent-acp` | 0.106.0 | Runs on the Claude Agent SDK. `CLAUDE_CODE_EXECUTABLE` points it at a CLI. Uses the existing Claude login. |
| gemini | `gemini --experimental-acp` | not checked | Its docs page was not reachable. Not in this job. |
| pi, omp | none | | The `acp` role stays null. They keep the bridge. |

The client library is `@agentclientprotocol/sdk` 2.6.0. The protocol version is the integer 1.

## Bryan's checks

These need an installed binding and a real login, so they are Bryan's. Codex needs none of
them to start. Record each answer in this file under the check.

- **Usage pool.** On the Ultra login, run one `claude-agent-acp` session with the default
  entrypoint for a few turns. Check Settings, Usage. Record whether it counted against the
  weekly subscription limit or the Agent SDK credit.
- **Hooks under ACP.** With orch's Claude hook shim installed, run a `claude-agent-acp`
  session. Record whether SessionStart, UserPromptSubmit, Stop and PreToolUse fire.
- **Session sharing, both ways.** Start a session over ACP, end it, run `claude --resume <id>`
  and confirm the conversation is there. Then the reverse with `session/load`. Record whether
  the ACP session id is the id `--resume` takes. Repeat for Codex.
- **Launch credential reach.** In an ACP session, have the agent run `orch whoami`. Record
  whether it names the agent. This shows whether `ORCH_AGENT_ID` reaches the agent's tools.

Entrypoint: leave `CLAUDE_CODE_ENTRYPOINT` at the SDK default, or set an honest `orch`. Never
another product's identifier.

## Risks

- **Two presence owners.** If Claude's hooks fire under ACP, hooks and the ACP session would
  both report state. The model gives each form one owner, and the ACP form's owner is the
  session. The hook check above decides whether the command gate still needs the hook.
- **Bindings differ.** Session load, model selection and modes are optional in the protocol.
  orch records what each agent offered at `initialize` and refuses a verb the agent cannot
  take, with exit 1.
- **Schema changes.** The store changes land in one wave, so `bun db:gen` runs once.
