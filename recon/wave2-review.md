# Wave 2 review

## Verdict

**PASS: 8 · ISSUES: 3**

## Scoped test run — ISSUES

Command covered all 12 touched/added `test/*.test.ts` files.

```text
1 tests failed:
(fail) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.09ms]

 99 pass
 1 fail
 247 expect() calls
Ran 100 tests across 12 files. [6.81s]
```

Every `(fail)` block:

```text
test/herdr-notify-hardening.test.ts:
92 |     expect(handle).toBe("w6:p10");
93 |     expect(lastCall("pane", "rename")).toEqual(["pane", "rename", "w6:p10", "pi-agent"]);
94 |     // Canonical herdr launch: the harness kind is selected by herdr, the pane
95 |     // handle is passed as one argv value, and orch hands herdr the same start
96 |     // budget it outwaits, so neither side can decide alone who gave up first.
97 |     expect(lastCall("agent", "start")).toEqual([
                                            ^
error: expect(received).toEqual(expected)

  [
    "agent",
    "start",
-   "pi-",
+   "pi-agent",
    "--kind",
    "pi",
    "--pane",
    "w6:p10",
    "--timeout",
    "30000",
  ]

- Expected  - 1
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/herdr-notify-hardening.test.ts:97:40)
(fail) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.09ms]
```

Smallest fix: make the test's expected agent-start name agree with the canonical pane/agent name (`pi-agent`), unless the intended production contract is actually `pi-`.

## Spec review

### (a) One key per agent — PASS

`src/commands/spawn.ts:598-641,837-868` mints one key, places it in `ORCH_AGENT_KEY`, hands the same `env` to `groupHome.create`/`paneHost.open`, passes the same key to `backend.spawn`, and records/registers that key.

### (b) Fresh-tab phase ordering and no caller-pane split anchor — PASS

`src/commands/spawn.ts:835-868` performs group create, then attempts every pane open, then launches agents. `src/backends/herdr/index.ts:159-169,225-254` chooses an explicit target or a pane already in the requested group; `HERDR_PANE_ID` is not used as a split anchor in `spawn`, `openPane`, or `paneHost.open`.

### (c) Bare events daemon identity and empty fleet — ISSUES

Empty-fleet behavior passes at `src/commands/events.ts:195-199`: it no longer exits.

Daemon hello identity does not govern bare `orch events`: `src/commands/events.ts:61` calls `rpcHello` only for `--mine`, and lines 69-73 bypass identity scoping when `options.mine` is false. Smallest fix: obtain the daemon hello identity for the bare/default path too and apply that id to the default ownership/provenance scope; retain `--all` as the bypass.

### (d) Pin only registered agents — PASS

`src/commands/spawn.ts:742-750` passes only `registeredAgents` to `pinModels` and explicitly reports unregistered agents as not pinned.

### (e) Registration carries orchDir; endpoints do not cross stores — PASS

`src/daemon/lifecycle.ts:74-123` parses and writes resolved `orchDir`; `src/daemon/rpc.ts:163-167` requests only a live registration matching the requested store before using its endpoints.

### (f) Herdr move id, live-name refusal, agent_not_ready — PASS

`src/backends/herdr/index.ts:407-444` adopts `move_result.pane.pane_id`; lines 259-265 refuse a live herdr name; `src/backends/herdr/cli.ts:149-165` treats structured `agent_not_ready` as non-failure.

### (g) tmux paneHost.open — PASS

`src/backends/tmux/index.ts:109-126` implements pane opening with target/group, split orientation, cwd, and environment.

### (h) Reset build safety and doctor settings preservation — PASS

`scripts/reset.ts:65-73` blocks build-cleanup deletion within `ORCH_DIR`; `src/doctor/runner.ts:56-75` keeps doctor diagnostic-only and does not write settings. Both focused safety tests passed.

### (i) Rule 13 diff scan — ISSUES

New cast syntax:

- `src/commands/panes.ts:319`: `split as "down" | "right"`. Smallest fix: narrow/normalize `split` before constructing the request so its inferred type is already the union.
- `src/store/spawned-rows.ts:106`: `.all() as SpawnedRow[]`. Smallest fix: use the query API's generic/result typing or a row validator rather than casting.

Other literal ` as ` grep hit, not a cast:

- `src/commands/daemon.ts:2`: `import * as path`.

New `any` word hits are comments only, not the forbidden type:

- `scripts/reset.ts:68`: “any other ORCH_DIR state.”
- `src/commands/spawn.ts:812`: “before ... any tab.”
- `src/daemon/rpc.ts:793`: “shares the same socket as ...”.

No new explicit or implicit `any` declaration was visible in the diff.

## Plexer-environment policy grep — PASS

`grep -rn 'HERDR_PANE_ID\|TMUX_PANE' src/commands src/control src/daemon` returned no matches. No command/control/daemon policy code branches on a plexer environment variable.
