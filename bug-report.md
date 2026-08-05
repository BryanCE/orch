# orch bug reports / strange behavior

Running log. Newest entries at the bottom. Format: date, command, expected vs actual, impact.

## 2026-07-31 — `orch status --json` emits a null-name row for non-orch panes

- **Command:** `orch status --json`
- **Actual:** Output includes the orchestrator's own pane (tab `Fable`, agent `claude`, not orch-spawned) as `{"name": null, "model": "-", "state": "idle", "stateFallback": true, ...}`.
- **Expected:** Exclude panes orch didn't spawn (opt in via `--all-panes`), or mark them `"managed": false` so scripts can filter.
- **Impact:** Low — every scripted parse special-cases a null name; idle-agent counts are wrong.

## 2026-07-31 — pane transitioned to `error` with a fresh 0-turn session after completing its work

- **Sequence:** `review-3` was mid-task, got steered, kept working — then the monitor reported `error` and `orch tail review-3` showed a brand-new session (turns: 0, no entries, $0). The real session's result was unreachable via `orch result`; the work HAD landed on disk (verified via git diff).
- **Expected:** Steering shouldn't bounce the session; if a pane dies after finishing, `error` should reference the session that did the work.
- **Impact:** Medium — completion state had to be reconstructed from git diff; a mid-task crash would look identical.

## 2026-07-31 — daemon bounce deafens pane bridges; dispatch times out with panes stuck `idle`

- **Sequence:** Daemon restarted underneath a live fleet. `orch reset <pane>` still worked, but every `orch dispatch` returned `RPC request timed out` and panes stayed `idle` with no task.
- **Expected:** Bridges reconnect, or dispatch fails fast with "bridge disconnected — respawn required" instead of a long generic timeout. Reset-works-dispatch-fails misleads.
- **Impact:** High confusion cost mid-incident; workaround (respawn fleet) only obvious if you notice the daemon uptime.

## 2026-07-31 — `orch close --all` aborts on ambiguous target instead of skipping it

- **Command:** `orch close --all`
- **Actual:** Failed on `Ambiguous target "wE:p3"` and closed nothing; the stale registrations then made `orch spawn --name review` fail with `agent_name_taken`.
- **Expected:** `--all` should enumerate concrete pane IDs, skip ambiguous ones with a warning, close the rest; failed bulk close must not hold name reservations.
- **Impact:** Medium — broke daemon-bounce recovery exactly when it was needed; had to close by pane ID and use fresh names.

## 2026-07-31 — `orch spawn` reports success + tiling but panes never register (persists after CLI rebuild + daemon restart)

- **Sequence:** `orch spawn 3 --name triage` printed pane IDs and a tiling layout; `orch status`/`orch panes` showed nothing; `orch dispatch triage-1` → `No target matches`. Reproduced after CLI rebuild AND a fresh daemon pid with `orch spawn 1 --name breakup` (still ghost 16s later).
- **Expected:** Spawn is transactional — pane exists and is addressable, or the command fails loudly. Success output for nonexistent panes is the worst case.
- **Impact:** High — fleet delegation fully blocked; fell back to built-in subagents during a critical fire.

## 2026-07-31 — stale `orch questions` entries from dead panes never expire

- **Command:** `orch questions`
- **Actual:** Questions from panes closed ~19-20h earlier (no longer in `orch status`) still list alongside live ones.
- **Expected:** Dismiss on pane close/reset, or flag `(pane gone)`.
- **Impact:** Low — clutters triage; scripted answer-all loops would steer nonexistent panes.

## 2026-07-31 — post-rebuild spawn now registers the pane but bridge never comes up (`STALLED ... no bridge dir`)

- **Command:** `orch spawn 1 --name review` (after CLI rebuild; new failure mode vs the earlier silent ghost)
- **Actual:** Pane spawns and tiles, then `STALLED wE:p4H review-1 — no bridge dir; try: orch restart review-1`, and the model pin fails with `no presence dir for pi inbox delivery`.
- **Expected:** Bridge dir/presence created before spawn reports success; pin retried once bridge registers.
- **Impact:** High — fleet delegation still blocked; progressed from silent ghost to loud stall, but still unusable.

## 2026-07-31 — fresh-daemon spawn still stalls; pane untargetable so the suggested fix can't run

- **Sequence:** Daemon freshly restarted (23s uptime, RPC answering). `orch spawn 1 --name review` → pane tiles, then `STALLED wE:p4K review-1 — no bridge dir`, pin fails with `control target herdr~wE~8gvfjl4yy6 does not resolve to a presence identity`, `orch status --json` returns `[]`, and the suggested `orch restart review-1` fails `No target matches "review-1"` — the stall message recommends a command that cannot address the pane it names.
- **Expected:** Spawn transactional; if stalled, the pane must still be addressable by the name the error itself prints.
- **Impact:** High — delegation via orch fully blocked even on a clean daemon; visible pane exists on screen but is orphaned from the registry.

## 2026-07-31 — `orch doctor -y` reports every check OK while spawn registration is fully broken

- **Sequence:** Immediately after the untargetable-stall above, `orch doctor -y` → all OK/SKIP (runtime, spawn limits, orchd presence/code/lock/socket). Yet every spawn stalls with no bridge dir and `orch status --json` is `[]`.
- **Expected:** Doctor should include a spawn round-trip smoke test (spawn → bridge dir appears → addressable → close). Health checks that don't exercise the one broken path give false confidence.
- **Impact:** Medium — doctor can't be trusted as a "fleet is usable" signal.

## 2026-07-31 — this bug report file was found truncated to 0 bytes

- **Sequence:** This file held the first five entries above (written via normal file edits, confirmed on disk). After the orch CLI rebuild + daemon restart window, it was 0 bytes.
- **Expected:** Nothing in the orch toolchain should touch repo files.
- **Impact:** Unknown cause — noting the timing correlation only; entries reconstructed from session context.

## 2026-08-05 — `orch spawn --model sol:high` rejects the pin but fuzzy-selects `upstage/solar-pro-3` anyway

- **Command:** `orch spawn 1 --name planrev --model sol:high`
- **Actual:** Spawn printed `warning: could not pin planrev-1 (wE:p6A) to sol:high: model must be a provider/id string: sol:high` — correct rejection — yet the pane came up on `openrouter/upstage/solar-pro-3:high`, a completely unrelated model that fuzzy-matched the substring "sol". The thinking level from the rejected spec ("high") WAS applied to the wrong model, so the string was partially honored by a second resolution path even after the first path rejected it.
- **Expected:** One resolver, one outcome. An invalid model spec should hard-fail the whole `--model` request and leave the pane on the settings default — never a fuzzy/substring match onto a random provider model. If fuzzy matching is ever wanted, it must be behind an explicit flag and print what it matched.
- **Also:** `settings.json` `models.allowed` was `[]` (empty = allow anything), so no allowlist backstop caught the bad resolution. An empty allowlist that means "everything" turns any resolver bug into a silent random-model dispatch — consider empty = "defaults only", or at minimum warn loudly when a resolved model isn't the settings default.
- **Recovery:** `orch model planrev-1 openrouter/openai/gpt-5.6-sol:high` → `openrouter/upstage/solar-pro-3:high → openrouter/openai/gpt-5.6-sol:high (accepted)` — so the pin path validates correctly; only the spawn-time path fuzzy-matches.
- **Impact:** Medium-high — silent wrong-model dispatch: work runs on an unintended (possibly weak or expensive) model with no error, discovered only by reading `orch status` MODEL column.
- **Operator rule until fixed (Bryan, 2026-08-05):** never hand orch a shorthand/alias model string. The orchestrator resolves the exact `provider/id:thinking` spec BEFORE spawn/model commands (source of truth: `~/.pi/agent/models-store.json`, e.g. sol → `openrouter/openai/gpt-5.6-sol`), and verifies the MODEL column in `orch status` after every spawn. Fuzzy resolution must never be relied on.

## 2026-08-05 — orchestrators are not scoped to their own agents: cross-session dispatch hijacked another orchestrator's panes

- **Sequence:** Session A (Claude Code) spawned tab `docrev` (4 panes, docrev-1..4) and dispatched doc-review prompts. Session B's orchestrator (herdr `n0k0t31lnb`, running a `merge` tab for a UI wording rename) dispatched INTO Session A's panes by name/visibility: docrev-1's TASK became `[from herdr~wE~n0k0t31lnb] What exact U…` after it finished A's task, and docrev-2 executed B's TL UI string-rename EDITS (4 repo files modified) instead of A's read-only review. Later the whole `docrev` tab was closed by something other than Session A. Additionally `orch result docrev-2` returned B's task result to A, and A's monitor got double `done` transitions from B's traffic.
- **Actual:** Any orchestrator can dispatch to, steer, collect results from, and (apparently) close any pane in the fleet. Pane names are a global flat namespace; `orch result <name>` resolves across owners.
- **Expected:** Each orchestrator session owns the agents it spawned. Scope dispatch/steer/reset/close/result to the owning session by default (owner id recorded at spawn); cross-owner control requires an explicit flag (e.g. `--other-owner`/`--all`). `orch status` should show an OWNER column so collisions are visible.
- **Impact:** High — a read-only review pane performed another session's WRITE task (repo files edited under the wrong orchestrator's watch), results were cross-delivered, and a live fleet was torn down out from under its owner. Untrustworthy delegation whenever two sessions run at once.







NEWEST BUGS 

# orch bug report

## 1. `spawn --model <bad spec>` silently boots the fleet on a model nobody asked for

**Date:** 2026-08-04
**Command:** `orch spawn 2 --name rmfilter --model luna:high`

**What happened**

```
warning: could not pin rmfilter-1 (wE:p5Z) to luna:high: model must be a provider/id string: luna:high
warning: could not pin rmfilter-2 (wE:p50) to luna:high: model must be a provider/id string: luna:high
```

Both panes then ran on `openrouter/openai/gpt-5.6-luna-pro:high` — the **Pro** model, which was
never requested and is not the configured default.

**Why that's a bug, not just a bad flag**

- `~/.pi/agent/settings.json` → `defaultModel: "openai/gpt-5.6-luna"`, `defaultThinkingLevel: "high"`.
  The non-Pro model. So the fallback did NOT come from pi's default.
- `~/.orch/settings.json` has no `defaults.model` and an empty `models.allowed`.
- The spawn command line carried no model flag at all:
  `pi --no-extensions -e .../orchestrator-bridge.js ...`
- Yet the session transcript shows orch pushing a model change 16s after session start —
  `~/.pi/agent/sessions/--mnt-c-Users-Bryan-Documents-NewReports-t3reports--/2026-08-04T18-39-53-672Z_*.jsonl`:

```json
{"type":"model_change","timestamp":"2026-08-04T18:40:09.379Z","provider":"openrouter","modelId":"openai/gpt-5.6-luna-pro"}
{"type":"thinking_level_change","timestamp":"2026-08-04T18:40:09.379Z","thinkingLevel":"high"}
```

So after printing "could not pin", orch went ahead and pinned a **different, more expensive
model** it was never given. `luna` and `luna-pro` are separate registry ids
(`~/.pi/agent/models-store.json`), so this looks like a loose/prefix match on "luna" resolving to
the wrong entry.

**Expected**

Invalid `--model` should abort the spawn — the same hard failure you get when `--model` is
omitted entirely (`no model selected — pass --model <provider/model[:thinking]> ...`). A spec
orch refuses to pin must never fall through to some other model, and never to a pricier tier.

**Also**

- `assertModelAllowed` (dist/daemon/orchd.js:18224) rejects any spec without a `/`, but the orch
  skill doc's model ladder is written as bare `luna:high` / `sol:medium`. The doc and the CLI
  disagree; one of them should change (shorthand resolution, or doc uses full ids).
- `orch model <target> ...` against a pane that is mid-turn returns `RPC request timed out` with
  no indication of whether the change was queued or dropped.

**Root design issue: the model default lives in the wrong place**

The only reason a fallback model was reachable at all is that orch leaves model selection to
whatever harness it launched. `defaultModel` sitting in `~/.pi/agent/settings.json` means orch's
behaviour changes when a pi setting changes — orch is coupled to one adapter's config, and every
other adapter (claude, codex, future ones) gets its own unrelated default. That is backwards.

**orch must own the model for every agent it spawns, for every adapter:**

- `defaults.model` belongs in `~/.orch/settings.json` (with per-adapter overrides), and orch
  resolves the effective model BEFORE spawn — flag > per-tab/per-agent config > `defaults.model`.
- If that resolution yields nothing or yields an invalid spec, **fail the spawn**. Never launch
  and let the harness pick.
- An adapter's own default (`pi`'s `defaultModel`, claude's configured model, etc.) should never
  be the fallback path. orch passes the model down explicitly every time; the harness default is
  dead code from orch's perspective.
- Same rule for thinking level — `defaultThinkingLevel: "high"` in pi settings is currently doing
  work that `defaults.model`'s `:thinking` suffix should be doing.

Net: model/tier is a fleet-level, cost-bearing decision. It has to be declared and enforced in
one place — orch — not inherited from whichever harness happens to be under it.

**Workaround:** always pass the full id — `--model openrouter/openai/gpt-5.6-luna:high` — and
verify with `orch status --json | jq '.[].model'` after spawning.
