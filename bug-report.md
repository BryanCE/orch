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

## 5. Claude pane never reads as ready, so every dispatch fails at the reset step

After the rebuild, `orch dispatch <claude pane> --file spec.md` fails with
`reset did not become ready within 75s` on a freshly spawned `--agent claude
--model opus:high` pane, twice in a row on two different panes. `orch peek`
shows the pane sitting at an empty `❯` prompt with `auto mode on`, so the
harness is ready; the readiness probe is what fails. `--keep-context` skips
the reset and the same dispatch lands in seconds. Before the rebuild the same
spawn and dispatch worked first try. A dispatch to a claude pane spawned before
the rebuild hung for over a minute, exited 0, and never reached the pane.

## 7. A new `--tab` landed in a different herdr WORKSPACE

`orch spawn a b c d --tab tc-fix --dir <t3reports root>` created the `tc-fix`
tab inside herdr workspace `1`, next to the `socket-a` / `socket-b` tabs of an
unrelated project, not in the t3reports workspace where the orchestrator's own
pane and every earlier tab of this session live. `orch status` shows the four
as `wG:pA`..`wG:pD` while the rest of the session is `wF`. A later
`orch spawn e --tab tc-fix-2` from the same orchestrator went back into `wF`.
The agents run and report normally, so the user has no signal beyond looking
at the wrong workspace and seeing nothing. A spawn must never cross
workspaces: place the tab in the workspace of the caller's pane, and refuse
with a clear error rather than pick another workspace.

## 6. `--with` is a prompt line, not an ownership claim

`--with a.ts,b.ts` only prepends `Work with: a.ts,b.ts` to the task. Two panes
given overlapping `--with` paths get no warning and edit the same file. Making
it a claim (the daemon rejects or warns when a second live dispatch names a
path already held) would turn it into the slicing guard the fleet needs.
