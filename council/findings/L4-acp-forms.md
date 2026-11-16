## 1. Forms, stdio, and compatible backends
- `FormId` is the four-value union `"tui" | "oneshot" | "acp" | "server"`; `FORM_STDIO` maps them to terminal, none, pipes, pipes respectively. Matching is by stdio offer alone. (`packages/orch/src/types/form.ts:5-9`, `:19-21`, `:33-35`)
- `tui` needs a terminal; held, herdr, tmux, and orca offer terminal. (`packages/orch/src/types/form.ts:21`, `packages/orch/src/backends/held/index.ts:109-112`, `packages/orch/src/backends/herdr/index.ts:143`, `packages/orch/src/backends/tmux/index.ts:68`, `packages/orch/src/backends/orca/index.ts:97`)
- `oneshot` needs no stdio; headless offers `none`. (`packages/orch/src/types/form.ts:21`, `packages/orch/src/backends/headless/index.ts:85-87`)
- `acp` and `server` need pipes; held offers pipes. Headless does not offer pipes, and the plexer backends offer terminal only. (`packages/orch/src/types/form.ts:21`, `packages/orch/src/backends/held/index.ts:109-112`, `packages/orch/src/backends/headless/index.ts:85-87`, `packages/orch/src/backends/herdr/index.ts:143`, `packages/orch/src/backends/tmux/index.ts:68`, `packages/orch/src/backends/orca/index.ts:97`)
- Exact stdio mapping:
  ```ts
  export const FORM_STDIO: Readonly<Record<FormId, StdioKind>> = {
    tui: "terminal", oneshot: "none", acp: "pipes", server: "pipes"
  };
  ```
  (`packages/orch/src/types/form.ts:19-21`)

## 2. ACP launch argv/env per harness
- pi: no ACP role; `acp = null`. (`packages/orch/src/adapters/pi.ts:353-354`)
- omp: no ACP role; inherited through the pi bridge adapter. (`packages/orch/src/adapters/pi.ts:353-354`, `packages/orch/src/adapters/omp.ts:56-57`)
- claude: no ACP role. (`packages/orch/src/adapters/claude.ts:230-234`)
- codex: argv `codex-acp`; env `{}`; session sharing is false. (`packages/orch/src/adapters/codex.ts:116-120`)
- opencode: argv `opencode acp`; env `{}`; session sharing is true. (`packages/orch/src/adapters/opencode.ts:260-264`)
- The ACP role is nullable and provides `argv(opts)`, `env(opts)`, session-sharing, and install prerequisite fields. (`packages/orch/src/types/adapter.ts:245-255`)

## 3. ACP prompt-to-result path
- `deliverControl(...)` routes run/steer to `deliverPrompt(...)`; if the declared link takes the action it pushes a `BridgeDelivery`. (`packages/orch/src/control/dispatch.ts:104-117`, `:250-262`)
- `AgentLink.push(delivery)` is the shared link interface. ACP link `push` queues dispatch/steer text, then `nextPrompt()` calls the ACP session. (`packages/orch/src/control/agent-links.ts:6-14`, `packages/orch/src/acp/link.ts:76-88`, `:98-110`)
- Ordered call signatures:
  ```ts
  deliverControl(orchDir: OrchDir, settings: OrchSettings, catalogue: ModelCatalogue,
    agent: HereAgent, action: ControlAction): Promise<ControlBoundaryOutcome>
  deliverPrompt(orchDir: OrchDir, agent: HereAgent, adapter: AgentAdapter,
    action: PromptAction, timeouts: OrchSettings["timeouts"]): Promise<ControlBoundaryOutcome>
  push(delivery: BridgeDelivery): void
  nextPrompt(): Promise<void>
  prompt(text: string): Promise<StopReason>
  ```
  (`packages/orch/src/control/dispatch.ts:104-117`, `:250-262`; `packages/orch/src/control/agent-links.ts:7-14`; `packages/orch/src/acp/link.ts:76-88`; `packages/orch/src/acp/session.ts:54-60`)
- `AcpSession.prompt` sends `session/prompt`; ACP message updates are received in `openAcpLink.onUpdate`, where assistant text chunks are accumulated by message id. (`packages/orch/src/acp/session.ts:260-275`, `packages/orch/src/acp/link.ts:51-65`)
- Final path: `outcomeOf(stopReason)` maps `end_turn` to done; `nextPrompt` calls `events.onTurnEnded(outcome, text)`; `sessionEvents.onTurnEnded(...)` writes status and calls `acceptResultReport(...)`; that persists the text result. (`packages/orch/src/acp/entries.ts:82-95`, `packages/orch/src/acp/link.ts:85-95`, `packages/orch/src/daemon/server/session-agents.ts:116-120`, `packages/orch/src/daemon/server/status-report.ts:127-144`)

## 4. ACP log and `orch result`
- orchd converts ACP updates to normalized session entries, appends entries to the agent log, and paints them on the held screen. It also logs binding stderr as `held-session.stderr`. (`packages/orch/src/daemon/server/session-agents.ts:83-89`, `:108-114`, `:197`)
- The assistant answer is accumulated separately as turn text; when done, orchd calls `acceptResultReport({ text, dispatchId, finishedAt })`. (`packages/orch/src/acp/link.ts:55-64`, `:81-94`, `packages/orch/src/daemon/server/session-agents.ts:116-120`)
- `orch result <agent>` reads through `readAgentThroughOrchd` (not by opening the log); it prints the reported result, with a host line when applicable. If no current agent resolves, it can fall back to the latest run-history result. (`packages/orch/src/commands/results.ts:28-45`, `:74-89`)

## 5. Session reuse and dispatch reset
- Yes: one live ACP connection/session takes subsequent prompts, preserving the conversation. `AcpSession.prompt` reuses its current `sessionId`; `nextPrompt` serializes queued prompts through that same session. (`packages/orch/src/acp/session.ts:54-60`, `:260-275`, `packages/orch/src/acp/link.ts:76-95`)
- A fresh conversation is an explicit `link.reset()`, which calls `session.renew()`; renew creates a new session on the same connection and carries selected options. (`packages/orch/src/acp/link.ts:131-145`, `packages/orch/src/acp/session.ts:295-313`)
- `orch dispatch` does not clear conversation: ACP `push` handles dispatch like steer by enqueueing text and invoking `nextPrompt`; reset is a separate action. (`packages/orch/src/acp/link.ts:102-110`, `:131-145`)

## 6. Oneshot form
- `oneshot` is the harness-owned form requiring `none` stdio; every supported harness provides a `headlessCmd(prompt, opts)` implementation: pi, omp, claude, codex, opencode. (`packages/orch/src/types/form.ts:5-7`, `:13`, `:21`; `packages/orch/src/adapters/pi.ts:440`, `packages/orch/src/adapters/omp.ts:99`, `packages/orch/src/adapters/claude.ts:261`, `packages/orch/src/adapters/codex.ts:142`, `packages/orch/src/adapters/opencode.ts:78`)
- Headless launch passes the initial prompt as the final argv entry and requires a nonblank prompt. stdout and stderr both go to the agent log; stdin is ignored/closed. (`packages/orch/src/backends/headless/index.ts:178-205`)

## 7. `spawn --form acp --prompt` without a plexer
- `selectBackend` falls back to headless when no configured/available placing backend is selected; `selectSpawnForm` validates the harness ACP role, then substitutes held because headless lacks pipes and held offers them. (`packages/orch/src/daemon/server/spawn/plan.ts:67-89`, `packages/orch/src/backends/registry.ts:54-58`)
- Held has no group/home role, so `spawnPartition` routes to `executeHeadlessSpawn`; the initial prompt satisfies its requirement. The resulting held session is started by the server-side form driver and held PTY/screen machinery. (`packages/orch/src/daemon/server/spawn/index.ts:350-357`, `:102-109`, `packages/orch/src/daemon/server/session-agents.ts:174-188`)
- No pane or terminal is needed: ACP requires pipes; held starts the binding process, and the session transcript is held by orchd. (`packages/orch/src/types/form.ts:19-21`, `packages/orch/src/daemon/server/acp-driver.ts:13-29`, `packages/orch/src/daemon/server/session-agents.ts:174-188`)

## 8. Control channel selection
- Channel interface:
  ```ts
  export interface AgentLink {
    readonly takes: readonly BridgeAction[];
    push(delivery: BridgeDelivery): void;
    readonly abort: (() => void) | null;
    readonly reset: (() => Promise<void>) | null;
    close(): void;
  }
  ```
  (`packages/orch/src/control/agent-links.ts:6-15`)
- ACP form uses its ACP link for prompt/steer/answer/model and abort. TUI with bridge uses bridge for prompts; abort uses keys. TUI without bridge uses adapter steer command or keys; abort uses keys. (`acp/MODEL.md:107-115`, `packages/orch/src/control/dispatch.ts:100-117`, `:232-247`)
- Code selection branches on declared action capability, not harness/backend id: `takesLinkAction` checks the attached link's `takes` list, falling back to adapter bridge `takes`; `deliverPrompt` then uses that link, adapter command, or backend input. (`packages/orch/src/control/dispatch.ts:100-117`)

## 9. ACP permission requests
- They reach the user as pending questions, not auto-approved or silently refused: ACP `onPermission` invokes `events.onAsk`; orchd records the question with its available options and changes status to asking. (`packages/orch/src/acp/link.ts:66-71`, `packages/orch/src/daemon/server/session-agents.ts:121-125`)
- `orch questions` reads pending questions from orchd and prints their options. Answering sends the selected option back through the ACP link to resolve that permission request. (`packages/orch/src/commands/results.ts:128-157`, `packages/orch/src/acp/link.ts:111-120`)
- The ACP session maps request option kinds, races user handling against cancellation, and replies cancelled only when the request/session is cancelled or closed. (`packages/orch/src/acp/session.ts:78-90`, `:156-180`)
