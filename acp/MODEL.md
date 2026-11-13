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
| `server` | pipes | orchd, from the harness server's event stream | orchd |

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

The `server` form is the harness's own server, which orchd starts and drives over that server's
API. It is the nullable `server` role on the adapter: a `HeldSessionDriver`
(`src/types/held-session.ts`). opencode has one (`src/adapters/opencode-server.ts`): a private
`opencode serve` per agent on a loopback port, HTTP plus its event stream, the way t3code drives
opencode. `defaults.forms` makes `server` opencode's default.

Both forms whose session orchd holds run through one starter, `startSessionAgent` in
`src/daemon/server/session-agents.ts`. It owns the process, the screen, the log and presence for
every driver; the driver owns only its wire. `DRIVERS` there maps each form to the role it runs on.

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

An agent gets a viewer pane in the spawner's plexer when the spawner is in one, its backend has
no placement role, its backend offers a stdio other than `none`, and its form runs on a
terminal. A far `tui` agent and a local `held` `tui` agent get one. A `headless` agent offers
`none`, so it gets none. An `acp` agent is headless too: nothing opens a pane for it, and
`orch attach` shows it on demand. orch's own TUI, separate from the pi seat, is where a fleet
is watched; it is not built in this job.

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

A link states the actions it takes, and may have an abort role. Abort is a control action in the
one dispatcher. It calls the role when the attached link has one, else it sends the abort keys.
It is never queued and never gated by a lease.

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

One session owner per form. `FORM_SESSION_OWNER` in `src/types/form.ts` says who holds a
form's session: the harness for `tui` and `oneshot`, orchd for `acp` and `server`. The owner writes the
transcript and reports the agent's state. orchd ignores a `report-status` or `report-result`
from the harness of an agent whose form's owner is `orchd`.

### Questions

A permission request is a question with options. Two can be open at once, since an agent can
run tool calls in parallel and each request waits for its own answer.

- A question may carry options: an id, a label and a kind, in order. `orch answer` then takes a
  whole number from 1 to the count, and anything else is refused with `answer with a number from 1 to <count>`.
- An agent may have several open questions. `orch answer <agent> <n>` answers the oldest.
- A free-text ask from a bridge still supersedes that agent's earlier ask. The asker decides.

### Transcript and events

Fleet events are unchanged: `transition`, `asking`, `message`, `closed`, `task`. They are few,
durable and replayed to linked hosts.

A thought chunk writes no entry. A plan writes one assistant message with one line per item.
An agent's session log exists from the moment it starts.

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
- To `acp`: orchd ends the TUI and opens the session id over ACP. It loads the session when the
  binding offers load, else resumes it.

The switch needs a binding that shares sessions with its TUI and offers session load or resume.
Every refusal is thrown before anything of the running agent is ended. The refusals are:

- `cannot restart <agent> in a form and on another harness, model or command at once`
- `harness <harness> has no <form> form`
- `cannot switch <agent> to <form>: its backend <backend> does not run that form`
- `cannot switch <agent> to <form>: no session id is recorded`
- `cannot switch <agent> to <form>: the <harness> binding does not share sessions with its TUI`
- `cannot switch <agent> to <form>: the <harness> binding does not offer session load`

Before it ends anything, orchd probes the binding. A probe that fails or times out refuses the
switch.

A restart of an agent whose form needs pipes, with a session id recorded, makes the same probe.

The form row changes only after the new form has started. A start that fails leaves the agent
recorded in its old form.

A restart starts the agent with its worktree. The store does not hold the spawn's `env`, `tools`
or `workers`, so a restart carries none of them.

A restart with no form on an agent that runs on pipes is refused with
`<agent> records no form to restart in` when no form is recorded.

A load sets the session log aside and writes the replay into a new one. A load that fails puts
the old log back. A resume keeps the log.

## Worked examples

| Agent | Backend | Form | Channels | Seen in |
|---|---|---|---|---|
| claude in a herdr pane | herdr | tui | keys, hooks | its own pane |
| pi in a tmux pane | tmux | tui | bridge | its own pane |
| an agent on a linked host today | held | tui | bridge or keys | a viewer pane |
| a headless run today | headless | oneshot | none | its log |
| codex over ACP | held | acp | the ACP link | `orch attach`, `orch tail` |
| opencode on its own server | held | server | the opencode link | `orch attach`, `orch tail` |

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
