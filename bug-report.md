# orch — bug report

One session driving orch from Claude Code's Bash tool in a plain WSL shell, on
2026-09-11 from about 10:35 to 11:30 local. orch 0.1.0 (`@bryance/orch`),
herdr 0.9.0, `orch doctor` all OK throughout. Every command was an `orch`
command; herdr was never driven directly.

## 1. `orch spawn` places zero panes after the first two

The first spawn worked: `orch spawn t2-audit pg-tree-audit --tab bitemporal
--dir <repo>` placed two panes. Every later spawn into the same tab, on the
same daemon, placed nothing:

```
warning: could not place agent cursor-readers: herdr agent start cursor-readers --kind pi --pane wF:pEX --timeout 30000 -- ... failed: exit status 1; stderr: {"error":{"code":"timeout","message":"timed out waiting for agent startup"},"id":"cli:agent:start"}
placed 0 of 1 requested agent(s)
```

Reproduced five times: four names at once, one name, one name with
`--agent claude`, two names again. Same timeout each time. The two panes
that already existed kept working the whole time (dispatch, steer, result).

Workaround that worked: `--backend headless --file <spec>`. Eight headless
agents started instantly on the same machine while herdr could not place one,
so it is not machine load and not the pi harness.

## 2. The daemon retries dispatches to dead agents forever

Before this session's first spawn, `orchd.log` already held about 1,800
`dispatch.delivering` lines for ten agents from an earlier session. Each was
on attempt 400 to 600. Two failure shapes:

```
cannot reach erlrw4ls0m: pi bridge is disconnected (pid 15731 is gone) - respawn required
herdr pane run wF:pD3 [orch worker] No human watches this pane. Run your own tests and typechecks ...
```

While these retries run, every orch command from this session intermittently
fails with:

```
orchd pid 277323 did not answer within 2000ms; it was NOT stopped
```

`orch dispatch`, `orch reap --dead`, `orch status` all hit it; retrying two
or three times eventually got through. `orch reap --dead` swept fifteen dead
agents, but the ten targets above were not among them, and their retries
continued (attempt 611 on `cem0jy3n31` at the time of writing). There is no
command that cancels a queued dispatch for an agent that is gone.

What would fix both from the user's side: a retry cap on dispatch delivery
(a bridge whose pid is gone is not coming back), and `orch reap` treating
"pid is gone" as provably dead.

## 3. Multi-name spawn reports success on partial failure

`orch spawn a b c d` that placed 0 of 4 exited 0 and printed
`'orch status' shows the fleet.` The warnings are on stderr above it. A
non-zero exit when fewer agents were placed than requested would let a caller
notice.

## 4. `--cwd` is documented, `--dir` is the flag

The skill text says pass `--cwd "$(git rev-parse --show-toplevel)"` on every
spawn. `orch spawn` rejects it (`Unknown flag --cwd.`); the flag is `--dir`.
