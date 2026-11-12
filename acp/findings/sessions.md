# Sessions

## Session facts

| Name | Type | Schema | Meaning |
|---|---|---|---|
| `agents.session_token` (`sessionToken`) | nullable `text` | `packages/orch/src/db/schema.ts:189` | Harness-native session identity; null for a spawned worker. Its unique index is `one_agent_per_session` (`packages/orch/src/db/schema.ts:196`). |
| `agent_status.session_path` (`sessionPath`) | nullable `text` | `packages/orch/src/db/schema.ts:252` | Native session/transcript path, or recorded headless output log path. |
| `agent_status.session_id` (`sessionId`) | nullable `text` | `packages/orch/src/db/schema.ts:253` | Harness-reported session id, separate from orch's agent id and from the registration token. |

These are the schema's only persisted session-naming fields (`packages/orch/src/db/schema.ts:185-196,252-253`).

## Writers

| Fact | `path:line` | Function | Value source |
|---|---|---|---|
| `agents.session_token` | `packages/orch/src/daemon/server/session-registry.ts:87-99`; `packages/orch/src/store/agent-rows.ts:324-365` | `registerSession` → `getOrCreateSessionAgent` | `claimedEnvironment` takes `SessionClaim.sessionToken` (`packages/orch/src/daemon/server/session-registry.ts:48-53`); session registration inserts it on a new row, or finds/updates an existing row by it (`packages/orch/src/store/agent-rows.ts:332-365`). |
| `agents.session_token` | `packages/orch/src/store/agent-rows.ts:69-80` | `claimAgent` | Token from the `claim-identity` request; verifies or writes the spawned agent's launch session claim. |
| `agent_status.session_path` | `packages/orch/src/agent/presence.ts:178-182,143-173`; `packages/orch/src/store/status-rows.ts:22-25,84` | `updateSessionRef` → `writeStatus` → status merge | Harness session manager's `getSessionFile()` converted by `sessionFilePath`; also `ORCH_AGENT_LOG` in headless launch env is captured as the child's status session path (`packages/orch/src/backends/headless/index.ts:190-198`). |
| `agent_status.session_path` | `packages/orch/extensions/claude/index.ts:79-80`; `packages/orch/extensions/codex/index.ts:36-43`; `packages/orch/src/backends/headless/index.ts:190-198` | Claude/Codex status reporting; headless launch environment | Claude hook reports its transcript path; Codex reads `ORCH_AGENT_LOG` and includes it in its status report; headless sets `ORCH_AGENT_LOG` to the backend log path. Claude's separate result report at `claude/index.ts:127` does not write the status row. |
| `agent_status.session_id` | `packages/orch/src/agent/presence.ts:178-185,143-173`; `packages/orch/src/store/status-rows.ts:22-25,85` | `updateSessionRef` → `writeStatus` → status merge | Harness session manager's `getSessionId()`, when nonempty. |

## Readers

| Fact | `path:line` | Function | Use |
|---|---|---|---|
| `agents.session_token` | `packages/orch/src/store/agent-rows.ts:260-266` | `agentIdBySessionToken` | Resolves a session credential to its agent row. |
| `agents.session_token` | `packages/orch/src/identity/self.ts:20-25` | `selfIdentityOf` | Uses the caller's harness session id as the lookup token for identity. |
| `agents.session_token` | `packages/orch/src/store/agent-rows.ts:69-80` | `claimAgent` | Compares the existing claim token to the presented token. |
| `agents.session_token` | `packages/orch/src/store/agent-rows.ts:243-245,260-266` | session lookup helpers | Selects session agents by a non-null token and queries by exact token. |
| `agents.session_token` | `packages/orch/src/policy/caller.ts:17-21` | `callerKindOf` | Matches caller session token to stored session token to classify the caller. |
| `agents.session_token` | `packages/orch/src/daemon/server/handlers/lease.ts:210` | orphan/lease target filtering | Excludes session agents (non-null token) from the candidate set. |
| `agents.session_token` | `packages/orch/src/daemon/server/handlers/self.ts:32`; `packages/orch/src/commands/whoami.ts:43` | `self` handler / whoami rendering | Returns and displays the stored token. |
| `agent_status.session_path` | `packages/orch/src/store/status-rows.ts:22-25,84`; `packages/orch/src/entities/inventory.ts:105-115` | status merge / `presenceStatusFields` | Persists and projects the status path into an entity. |
| `agent_status.session_path` | `packages/orch/src/daemon/server/peer-view.ts:42`; `packages/orch/src/types/daemon.ts:191` | peer view | Copies the status path into peer status data. |
| `agent_status.session_path` | `packages/orch/src/agent/read.ts:50-62,68,131-150` | `subjectOf`, session/result/tail reads | Chooses the local file for adapter result extraction, session view, tail, and session lookup. |
| `agent_status.session_path` | `packages/orch/src/daemon/server/fleet-rows.ts:99-101,223` | `sessionViewFor` / fleet row construction | Reads adapter session metadata when presence status is absent. |
| `agent_status.session_path` | `packages/orch/src/adapters/claude.ts:279-286` | `extractResult` | Uses the stored transcript path if the input has none. |
| `agent_status.session_path` | `packages/orch/src/entities/inventory.ts:62,105-109`; `packages/orch/src/commands/panes.ts:66,78` | inventory / `cmdPane` | Carries and displays the path. |
| `agent_status.session_id` | `packages/orch/src/store/status-rows.ts:22-25,85`; `packages/orch/src/daemon/client/fleet-schemas.ts:60-61` | status persistence / fleet wire schema | Stores and validates the reported id in status data. |
| `agent_status.session_id` | `packages/orch/src/agent/presence.ts:178-185` | `updateSessionRef` | Reads from the harness session manager before writing status. |
| `agent_status.session_id` | `packages/orch/src/commands/whoami.ts:54`; `packages/orch/src/identity/self.ts:23` | whoami / `selfIdentityOf` | Displays the caller id and uses the caller-environment session id for identity resolution. |
| `agent_status.session_id` | `packages/orch/src/shared/session-env.ts:46-60`; `packages/orch/src/daemon/client/registration.ts:42-52` | `callerSession` / `sessionClaim` | Reads native harness environment for registration; the registration token is the harness session id when present. |

## Session view

`packages/orch/src/types/adapter.ts:97-103`:

```ts
export interface SessionViewToolCall {
  /** Tool name, or "tool" when the adapter cannot name it. */
  readonly name: string;
  /** The most descriptive argument value the adapter recovered, unformatted (commands own truncation/collapsing). */
  readonly arg: string;
}
```

`packages/orch/src/types/adapter.ts:110-124`:

```ts
/**
 * One content-bearing turn in a session view, normalized across harnesses so
 * `orch tail`/`orch session` can render per-turn rows without importing any
 * per-harness session parser. Adapters emit only renderable turns; commands own
 * all layout (columns, role labels, timestamps, truncation, collapsing).
 */
export interface SessionViewEntry {
  /** Turn role, normalized to orch's three tail rows. */
  readonly role: "user" | "assistant" | "tool";
  /** Flattened turn text, when the turn carries any. */
  readonly text?: string;
  /** Tool calls for an assistant turn that only invoked tools; omitted otherwise. */
  readonly toolCalls?: readonly SessionViewToolCall[];
  /** Tool name for a tool-result turn. */
  readonly tool?: string;
  /** Whether a tool-result turn reported an error. */
  readonly isError?: boolean;
  /** ISO timestamp of the turn, when the session records one. */
  readonly timestamp?: string;
}
```

`packages/orch/src/types/adapter.ts:126-151`:

```ts
/** Supplementary display data an adapter can recover from its native session output. */
export interface SessionView {
  /** Presence-protocol state inferred from session content, when the adapter derives one. */
  readonly state?: AgentState;
  /** Active model identifier, when the session records one. */
  readonly model?: string;
  /** Model provider, when the session records one. */
  readonly provider?: string;
  /** Active thinking/reasoning level, when the session records one. */
  readonly thinking?: string;
  /** Most recent user task/prompt text, when the session records one. */
  readonly task?: string;
  /** Most recent assistant text, when the session records one. */
  readonly lastText?: string;
  /** Accumulated cost, when the session records one. */
  readonly cost?: number;
  /** Token usage totals, when the session records them. */
  readonly tokens?: TokenTotals;
  /** Completed turn count, when the session records one. */
  readonly turns?: number;
  /**
   * Per-turn items for rich tailing, populated by adapters whose parser can
   * produce them. Commands render the header+last-text fallback when omitted;
   * an empty array means the session was read but had no content-bearing turns.
   */
  readonly entries?: readonly SessionViewEntry[];
}
```

`SessionViewInput` is `sessionPath?: string` and `output?: string` (`packages/orch/src/types/adapter.ts:154-158`); the `SessionViewRole` method is `readSessionView(input: SessionViewInput): SessionView | undefined` (`packages/orch/src/types/adapter.ts:198-200`).

| Adapter | Implementation | Input format |
|---|---|---|
| pi | `packages/orch/src/adapters/pi.ts:309-327,380-381` | pi-native session file parsed by `parseSession`; normalizes model/provider/thinking/task/result/usage and content-bearing entries. |
| omp | `packages/orch/src/adapters/pi.ts:346-348` and `packages/orch/src/adapters/omp.ts:65-69` | Inherits `PiBridgeAdapter`'s pi session-file parser and view. |
| Claude | `packages/orch/src/adapters/claude.ts:220,299-301` | Claude transcript JSONL, extracting last assistant text only. |
| Codex | `packages/orch/src/adapters/codex.ts:103,160-161`; `packages/orch/extensions/codex/events.ts:197-200` | Recorded headless `--json` JSONL log; returns detected state and last text. |

Consumers: `readAgentTail` feeds `orch tail` (`packages/orch/src/agent/read.ts:131-140`; `packages/orch/src/commands/results.ts:213-243`); session lookup feeds `orch session` (`packages/orch/src/agent/read.ts:143-150`; `packages/orch/src/commands/results.ts:274-283`); session-derived fallback result feeds `orch result` (`packages/orch/src/agent/read.ts:68-80,114-128`; `packages/orch/src/commands/results.ts:27-30,105-115`); fleet rows can use a session view for status summary (`packages/orch/src/daemon/server/fleet-rows.ts:99-116,223-233`). `orch peek` reads the screen, not `SessionView` (`packages/orch/src/commands/panes.ts:109-124`; `packages/orch/src/agent/read.ts:155-167`). `orch pipe` reads result through the reader, not the view (`packages/orch/src/commands/control.ts:177-196`).

## Resume and reset

| Adapter | Resume of an existing session | Fresh session/reset |
|---|---|---|
| pi | No adapter resume-by-id argv is defined; normal dispatch uses the running bridge. | `reset` lifecycle text is `/new` (`packages/orch/src/adapters/pi.ts:170-178,370-377`). |
| omp | No adapter resume-by-id argv is defined; uses the shared pi bridge. | Inherits `/new` from `PiBridgeAdapter` (`packages/orch/src/adapters/pi.ts:170-178,370-377`; `packages/orch/src/adapters/omp.ts:65-69`). |
| Claude | No adapter resume-by-id argv is defined; steering uses the running session. | `reset` lifecycle text is `/clear`; Claude's SessionStart on clear reports idle (`packages/orch/src/adapters/claude.ts:120,218-220`). |
| Codex | `steer` uses `CODEX_SESSION_ID` from request env or falls back to the agent key; argv is `codex resume <id> <text>` for interactive and `codex exec resume <id> <text>` otherwise (`packages/orch/src/adapters/codex.ts:139-147`). | `lifecycleControl` is null; no in-session reset command (`codex.ts:102`). A new Codex launch uses the normal interactive/headless command (`codex.ts:112-128`). |

`orch reset` calls `clear-session` (`packages/orch/src/commands/lifecycle/reset.ts:20-29`); server refuses a working session, records the time, calls `reclaimAgent`, then delivers the adapter's reset lifecycle verb and awaits a newer idle status (`packages/orch/src/daemon/server/handlers/lifecycle.ts:218-239`). `reclaimAgent` clears `agents.session_token`/claim time, not `agent_status.session_id` (`packages/orch/src/store/agent-rows.ts:95-96`). The harness's subsequent status updates its session id/path (`packages/orch/src/agent/presence.ts:178-185`). `orch dispatch` clears first unless `--keep-context`, then dispatches the prompt (`packages/orch/src/commands/control.ts:317-345`); it does not itself assign the status session id.

## Session token

`agents.session_token` holds the harness session's stable native identity, not orch's agent id; null means the row is not a harness session (`packages/orch/src/db/schema.ts:181-190`). The harness supplies/mints its native session id; orch reads the configured environment names (`packages/orch/src/shared/session-env.ts:22-32,55-60`) and adapters declare those names (pi `packages/orch/src/adapters/pi.ts:398-399`, omp `omp.ts:68-69`, Claude `claude.ts:236-239`; Codex identifies by session pid and has no session-id env field, `codex.ts:96-97`). The column has `uniqueIndex("one_agent_per_session")` (`schema.ts:196`).

`register-session` validates the daemon credential and caller process/environment, then supplies the token to `getOrCreateSessionAgent`; the store reuses a live row by token, or writes it when creating/repointing the session row (`packages/orch/src/daemon/server/session-registry.ts:48-53,87-99`; `packages/orch/src/store/agent-rows.ts:332-365`). `register-session` dispatches to `registerSession` in the identity RPC branch (`packages/orch/src/daemon/server/rpc.ts:169-173`). Spawned agents instead claim their minted agent id through `claim-identity`, which calls `claimAgent` with the presented token (`session-registry.ts:108-123`; `agent-rows.ts:69-80`).

## The one log reader

The in-daemon reader is `readAgent(reader: AgentReader, agent: HereAgent, read: AgentRead): AgentReading` (`packages/orch/src/agent/read.ts:169-187`). It handles result, tail, session, screen, and log reads in one switch (`read.ts:169-187`); log records are loaded there via `readLogRecords` (`read.ts:3-6,179-181`). Local placement is read by `readAgentAnywhere`; a remote placement is read through its host link's `peer-read`, and the response names the host (`packages/orch/src/daemon/server/handlers/host.ts:97-108`). `peer-read` verifies the requesting origin and invokes the same `readAgent` (`packages/orch/src/daemon/server/handlers/peer.ts:42-50`).

The CLI gateway is `readAgentThroughOrchd(services: DaemonClient, key: string, read: Extract<AgentRead, { kind: K }>): Promise<{ readonly host: string | null; readonly reading: Extract<AgentReading, { kind: K }> }>` (`packages/orch/src/commands/agent-read.ts:13-18`); it calls the local daemon's `agent-read` RPC and validates the returned kind. Callers: `orch result`, `tail`, and `session` (`packages/orch/src/commands/results.ts:27-30,213-217,274-283`); `peek` (`packages/orch/src/commands/panes.ts:109-114`); `logs` (`packages/orch/src/commands/logs.ts:48-53`); and `pipe` for its source result (`packages/orch/src/commands/control.ts:177-190`). The setup smoke check also calls `agent-read` for a result (`packages/orch/src/setup/smoke.ts:32`).

## Does not fit

Codex has no `sessionIdEnv`; it identifies a session registration from `CODEX_PID` and therefore may have a null `agents.session_token` (`packages/orch/src/shared/session-env.ts:29-32,55-60`; `packages/orch/src/adapters/codex.ts:96-97`).
