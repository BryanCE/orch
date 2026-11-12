# The model

ACP looks like a plexer because a backend does three jobs today and ACP does two of them. This
file splits the jobs, names each part, and says where ACP sits. Every later task builds
against these words.

## The parts

| Part | What it is | Stored | Where it lives |
|---|---|---|---|
| Harness | The coding agent program: pi, omp, claude, codex. | `agents.harness_id` | `src/adapters/`, `extensions/<harness>/` |
| Form | One way a harness runs. | `agent_forms`, an interval | `src/types/form.ts` |
| Backend | What holds the agent's process and its stdio. | `agent_plexers` | `src/backends/<id>/` |
| Channel | A live link orchd drives the agent through. | never | `src/control/` |
| Viewer | A pane that runs `orch attach`. | never | `src/daemon/server/spawn/viewers.ts` |
| Protocol | A wire format several harnesses speak. | never | `src/acp/` |

"Backend" is the word in code and settings. "Plexer" is the word in the CLI and the store.
They name the same slot. A plexer in the narrow sense is a backend with panes: herdr, tmux, orca.

### Form

A form states the stdio it needs. A backend states the stdio it offers. Spawn and restart match
the two. Nothing else decides which backend can run which form.

| Form | Needs | Who reports state | Who writes the transcript |
|---|---|---|---|
| `tui` | a terminal | the harness, through its bridge or hooks | the harness |
| `oneshot` | nothing | the harness, through its notify shim or exit code | the harness |
| `acp` | pipes | orchd, from the ACP session | orchd |

| Backend | Offers | Has panes |
|---|---|---|
| herdr, tmux, orca | a terminal | yes |
| held | a terminal, pipes | no |
| headless | nothing | no |

`held` means orchd holds the process. `headless` means nothing holds it: it runs detached with
a log.

Every adapter has a `tui` and a `oneshot` form today, as `interactiveCmd` and `headlessCmd`.
The `acp` form is a nullable role on the adapter, like `bridge` and `hooks`. It carries the
binding's argv, its environment, and whether the binding shares sessions with the TUI.

### Choosing form and backend at spawn

1. The form is the `--form` flag, else `defaults.forms[harness]` in settings, else unset.
2. The backend is chosen as today.
3. With no form set, the form is the one the backend runs: `tui` on a terminal, `oneshot` on
   `headless`. This is today's behavior.
4. With a form set, the chosen backend is used when it offers what the form needs. When it
   does not, orchd holds the agent in `held`.
5. A form the adapter does not have is refused with exit 1.

A linked host runs the same steps. Its chosen backend is `held`, as it is today.

### Viewers

An agent whose backend has no panes gets a viewer pane in the spawner's plexer when the spawner
is in one. Far spawns do this today. The rule moves from "the agent is far" to "the agent's
backend has no placement role", so a local `held` agent gets one too.

Every held agent has a screen. For a `tui` form the harness draws it through the PTY. For an
`acp` form orchd draws the transcript onto the same kind of screen. `orch attach`, the viewer
pane and the host link carry both through the existing screen stream.

### Channels

The dispatcher picks a channel per action from what the agent's form declares.

| Form | Prompt, steer, answer, model | Abort |
|---|---|---|
| `acp` | the ACP link | the ACP link |
| `tui` with a bridge | the bridge link | keys |
| `tui` without one | the adapter's steer command, else keys | keys |

The bridge link and the ACP link sit in one registry, keyed by agent, behind one interface.
Both take the same `BridgeMessage`. A message for a link that is not attached stays in the
outbox and is delivered when the link attaches, as bridge messages are today.

Abort becomes a control action in the one dispatcher. It is never queued and never gated by a
lease.

Steer on an ACP agent never cancels. The ACP link holds a steer until the turn ends and sends
it as the next prompt.

### What the ACP session reports

The ACP link calls the same server functions the report RPCs call. No new ingest path.

| From the agent | orch does | Through |
|---|---|---|
| a prompt is accepted | state `working` | `acceptStatusReport` |
| turn ends, `end_turn` | state `done`, result text stored | `acceptStatusReport`, `acceptResultReport` |
| turn ends, `cancelled` | state `aborted` | `acceptStatusReport` |
| turn ends, `refusal`, `max_tokens`, `max_turn_requests` | state `error`, the stop reason as the error | `acceptStatusReport` |
| `session/request_permission` | state `asking`, a question with its options | `recordQuestion`, `acceptStatusReport` |
| message, thought, tool call, plan | appended to the agent's log, drawn on its screen | the session log |
| the process exits | state `exited` | the liveness tick |

One presence owner per form. In `acp` form the owner is the ACP session. A hook or shim report
for an agent in `acp` form is not a second owner: the launch environment for the `acp` form
does not enable status reports from the harness shim.

### Questions

A permission request is a question with options. Two can be open at once, since an agent can
run tool calls in parallel and each request waits for its own answer.

- A question may carry options: an id, a label and a kind, in order.
- An agent may have several open questions. `orch answer <agent> <n>` answers the oldest.
- A free-text ask from a bridge still supersedes that agent's earlier ask. The asker decides.

### Transcript and events

Fleet events are unchanged: `transition`, `asking`, `message`, `closed`, `task`. They are few,
durable and replayed to linked hosts.

Transcript traffic never enters the event log. orchd appends each normalized entry to the
agent's log on the agent's host. The one log reader of Rule 20 reads it, so `orch tail`,
`orch peek` and `orch result` work from any host and name the host.

### Switching form

A change of form is the same agent. This applies to form only: an agent keeps its backend for
life.

`orch restart <agent> --form tui|acp` relaunches the same agent in the other form under the
same backend. It keeps the agent id, the lease and the conversation. It closes the open
`agent_forms` row and opens a new one.

- To `tui`: orchd ends the ACP session and starts the harness TUI in a PTY with the session id.
- To `acp`: orchd ends the TUI and loads the session id over ACP.

The switch needs a binding that shares sessions with its TUI and offers session load. Without
both, the verb refuses with exit 1 and says which is missing.

## Worked examples

| Agent | Backend | Form | Channels | Seen in |
|---|---|---|---|---|
| claude in a herdr pane | herdr | tui | keys, hooks | its own pane |
| pi in a tmux pane | tmux | tui | bridge | its own pane |
| an agent on a linked host today | held | tui | bridge or keys | a viewer pane |
| a headless run today | headless | oneshot | none | its log |
| codex over ACP | held | acp | the ACP link | a viewer pane |

## Where the ACP code goes

| Code | Place |
|---|---|
| JSON-RPC, method names, ACP types, the SDK import | `src/acp/` only |
| Translating `session/update` into orch's session entries | `src/acp/` |
| A binding's argv, environment and session sharing | that harness's adapter, in its `acp` role |
| Starting the process on pipes | the `held` backend and orchd |
| Wiring a session to presence, questions, the log and the screen | `src/daemon/server/` |
| Choosing the channel | `src/control/dispatch.ts` |

`src/acp/` imports core types only. It knows no harness and no backend. A static check fails
on an ACP method name or an SDK import anywhere else.

## After the MVP

- **Threads.** A thread is the conversation an agent holds. `threads` has a minted id, a
  harness, a host and a created-at. `agent_threads` is an interval. The session id and path
  move off `agent_status` onto the thread. A thread carries no state, takes no control verb,
  and never crosses a host or a harness.
- **A structured session stream.** A streaming RPC built like the screen stream, carrying
  session entries, for the feed view and the web UI.
- **Harnesses with no TUI.** `interactiveCmd` becomes nullable and the three forms become one
  map on the adapter.
