# Review P6 R5: switching form

Checks a, c, d, f, g, h pass. Checks b, e, i, j have findings.

## Findings

1. `packages/orch/src/daemon/server/handlers/restart-form.ts:100` breaks T3 "closes the open row, opens the next, starts the new form". `swapProcess` calls `setForm` before `start()` at line 101. When `start()` throws, the store says the new form while nothing runs, and the old process is already ended at line 98.
   Fix: move `if (form !== null) setForm(...)` to after `await start()`, so a failed start leaves the old row.

2. `packages/orch/src/daemon/server/handlers/restart-form.ts:112-118` `restartPipes` with a recorded session id never probes. A binding that offers neither load nor resume throws in `openAcpSession` (`acp/session.ts:190`) after `endHeldProcess` already ended the agent. The agent is left with no process and no channel.
   Fix: in `restartPipes`, when `sessionId !== null`, call `probeBinding` before `swapProcess` and refuse with the refusal 5 text when `!load && !resume`.

3. `packages/orch/src/daemon/server/handlers/restart-form.ts:67` copies `state.pipes.spawn({ argv: acp.argv(opts), cwd: heldCwd(opts), env: heldLaunchEnv(opts, acp.env(opts)) })` from `acp-agents.ts:29`. Rule 16. The copy also gives the probe the agent's launch variables, since `agentLaunchEnv` sets the launch key from `opts.key` at `policy/spawner.ts:52`.
   Fix: export one `spawnBinding(state, acp, opts)` from `acp-agents.ts` and call it in both places.

4. `packages/orch/src/daemon/server/handlers/restart-form.ts:69` `probeAcpAgent` has no bound; `acp/session.ts` has no timeout. A binding that never answers `initialize` hangs `switchForm` forever. Rule 17.
   Fix: race the probe against a timeout read from settings, kill the child on expiry, and refuse with the refusal 5 text.

5. `packages/orch/src/backends/held/index.ts:180-185` `recordHeldAgent` now takes any existing key as a restart. Before, a spawn on a held key failed on the registration conflict, and `startHeldAgent` killed the PTY at line 207. Now a duplicate key silently records a new process and handle onto a live agent. Both spawn callers (`lifecycle.ts:113`) rely on the old failure.
   Fix: make the restart explicit. Add a `restart: boolean` to the `startHeldAgent` and `startAcpAgent` paths, and branch on that in `recordHeldAgent` instead of `agentById(...) === null`.

6. `packages/orch/src/daemon/server/handlers/restart-form.ts:51-63` `restartOpts` omits `env`, `tools`, `workers` and `worktree`, which the spawn passes at `handlers/lifecycle.ts:83-97`. `agentLaunchEnv` merges `opts.env` at `policy/spawner.ts:59`. A restarted agent starts without the env its spawn gave it. I did not find where spawn env is stored.
   Fix: build restart opts from the same stored facts the spawn used, or state in T3 that a restart drops them.

7. `packages/orch/test/restart-form.test.ts:142` T3 case 1 asserts `agentView(orchDir, key)?.id` equals `key`. That lookup is by `key`, so it can never fail. No test asserts the lease is held after a switch.
   Fix: assert `holdsLease` for the spawner or holder before and after, and drop the id assertion.

8. `packages/orch/test/restart-form.test.ts:186-197` the backend refusal test never asserts the old form still runs, which T3 asks of each refusal. The refusal 5 test at line 232 does not assert the probe process was killed.
   Fix: in refusal 5 assert `harness.spawned.at(-1)?.killed` is true. For refusal 2, launch a held agent whose backend row is changed to one without terminal, or assert nothing was spawned on `harness.ptys`.

Residual, not fixable by a one line edit: after a failed `session/load`, `acp-agents.ts:98` has already emptied the log (`acp/session.ts:199`). The log is lost on that failure path.

## Checks

- a pass. Order at `restart-form.ts:124-136` is role, backend, session id, shares, probe. Texts match T3 with no parentheses. Nothing is ended before line 146.
- b findings 1, 2, residual. Pipes release on a failed open at `acp-agents.ts:105-106`. A failed PTY start kills the PTY at `held/index.ts:207`. No pipes, PTY, screen or link leak found.
- c pass. `probeBinding` kills the child in `finally` at line 71. The probe is never held in `held-pipes`. Finding 4 concerns an unbounded wait.
- d pass. Only `FORM_STDIO`, `offersForm` and adapter roles decide. `request.form !== current` at `relaunch.ts` compares two values, not a literal id. No literal timeout or name.
- e finding 5.
- f pass. `startHeldAgent` default `program` at `held/index.ts:196` equals the old `shellRun(createInteractiveCommand(...))`. Callers: `lifecycle.ts:113`, `restart-form.ts:154`.
- g pass. Agent id: `restartOpts` uses `key: view.id` at line 55 and `heldKeyOf` reads it; the `existing` branch at `held/index.ts:180` skips `registerSpawnedAgent`. Lease: `reclaim` calls `reclaimAgent`, which clears only `claimedAt` and `sessionToken` at `store/agent-rows.ts:96`. No lease function is called in `restart-form.ts`.
- h pass. `acp/session.ts:187-201` prefers load, calls `onLoad` only when `mode === "load"`, and rejects with "Agent offers neither session/load nor session/resume".
- i finding 3.
- j partial. Every T3 case exists. Findings 7 and 8 name the weak assertions.

T3: 8 findings
