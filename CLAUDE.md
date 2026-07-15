# CLAUDE.md — working rules for this repo (NON-NEGOTIABLE)

## Rule 1 — The user's file/output IS ground truth. Never argue with it.
When the user hands you a file or output — ESPECIALLY one named `current-errors.md` or anything "current" — it is the CURRENT state, full stop. NEVER say it is "stale", "cached", "a snapshot", "outdated", or "predates the fixes". NEVER re-characterize what's in it ("it's just warnings", "only fallow", "the count is small"). Open it, read what it says, and FIX every item in it. If you think reality differs, you are wrong — trust the file.

## Rule 2 — Do not argue. Do not explain why something isn't a problem. Fix it.
No debating counts, severity, "warnings vs errors", or whether something matters. If it's in the file or the user says fix it, fix it. Zero pushback, zero caveats, zero "actually…". The user's instruction is the spec.

## Rule 3 — Be fast. Delegate immediately, dispatch in ONE shot.
This work should take minutes, not half an hour. The moment work splits, spawn the orch fleet and dispatch EVERY slice in one message. No serial setup, no analysis paralysis, no re-reading state you already have. Verify on disk with `bun run check`, then report done.

## Rule 4 — Fleet discipline (see the `orch` skill).
- Model ladder: `luna:medium` default → escalate luna high/xhigh → `sol:low`→`sol:high` (cap). NEVER terra. `luna:low` for trivially mechanical slices.
- MAX 4 agents per tab, tiled. Split bigger fleets across tabs.
- Lifecycle verbs: `reload` = live-reload code in place; `reset` = new session/context; `restart` = full close + relaunch. Use `reload`, never `restart`, to pick up code changes.

## Rule 5 — Green means `bun run check` clean + `bun test` passing.
Don't declare done until you've run them and they pass. Report the real result, never a claim.
