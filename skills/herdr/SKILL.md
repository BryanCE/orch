---
name: herdr
description: Drive herdr (terminal agent multiplexer) to spawn and steer pi/codex/claude agents in visible panes with zero Claude-wrapper cost. Use when HERDR_ENV=1 for any agent dispatch, when the user says "spawn in herdr", "pane", "watch it run", or asks about herdr keybindings.
allowed-tools: Bash, Read
---

# herdr — direct agent orchestration in panes

herdr multiplexes AI agents in terminal panes over a socket API. When
`HERDR_ENV=1`, dispatch pi/codex work into PANES instead of Claude wrapper
agents: zero wrapper tokens, Bryan watches live, you steer mid-flight.
If `HERDR_ENV` is unset, do NOT control panes (guardrail); fall back to the
pi-agent skill's wrapper model.

## The dispatch loop (replaces pi-dispatch wrappers)

```bash
# 1. Spawn (never steals focus). Returns JSON with result.agent.pane_id — PARSE IT.
herdr agent start <name> --cwd <repo> --no-focus -- pif -p --no-session --tools read --thinking <level> "PROMPT"

# 2. Wait WITHOUT polling: background Bash (run_in_background: true), chained read.
# TUI agents (pi/codex panes) finish on --status done, NOT idle. idle = at
# prompt with no completed turn (fresh/cleared session). Waiting on idle for a
# finished turn TIMES OUT while the answer sits there (verified 2026-07-08).
herdr wait agent-status <pane_id> --status done --timeout 300000 && herdr agent read <pane_id> --source recent-unwrapped --lines 80

# 3. Steer mid-flight anytime (literal text; pane run = command + Enter):
herdr agent send <pane_id> "also check src/worker/jobs/"

# 4. Peek at progress between your own work steps (cheap, incremental feedback):
herdr agent read <pane_id> --source recent --lines 15

# 5. Done with the pane:
herdr pane close <pane_id>
```

Fan out N slices = N `agent start` calls in one message, then ONE background
wait per pane. Keep working while they run; read tails between steps and
relay interim findings to Bryan (constant feedback is the point).

## Hard rules

- **Session hygiene: clear the agent's session BEFORE each new assignment.**
  Send `/new` (pi and codex TUIs both), press Enter, THEN send the task.
  Round 2 in a polluted context = degraded output + wasted agent context.
  Exception: a follow-up that NEEDS the prior context ("apply what you
  designed") stays in-session; that's the only case.
- **TUI composer race: `agent send` + immediate Enter often leaves the prompt
  UNSUBMITTED (codex especially).** After sending a task, verify the pane went
  `working` (`herdr pane list`); if still idle, `pane send-keys <id> Enter`
  again. Never trust a wait that fires seconds after a send — that's the
  status race, re-check and re-arm.

- **Timebox**: grunt ~5 min, investigation ~10. Past budget: `pane close`,
  re-scope smaller, redispatch. Never sit waiting.
- **IDs compact when panes close — never reuse remembered IDs.** Re-query
  with `herdr pane list` or parse the spawn response (`result.agent.pane_id`,
  format `w1:p4`). Targets also accept unique agent names.
- Always `--no-focus` on start/split so Bryan's focused pane is untouched.
- `agent read` outputs text; everything else outputs JSON.
- `--source recent-unwrapped` for matching/parsing (no soft wraps);
  `recent` for eyeballing.
- NEVER run bare `herdr` (opens TUI) or `herdr agent attach` from a tool.
- pi flag rules still come from the pi-agent skill (tier matrix, --tools
  read for repo work, grep-shaped prompts at low thinking).
- Codex works the same way: `herdr agent start codex-review --no-focus --
  codex exec review --base main` etc.

## Discovery / state

```bash
herdr pane list            # all panes + agent_status (idle|working|blocked|done|unknown)
herdr agent list           # detected agents
herdr agent get <target>   # one agent's state
herdr wait output <pane_id> --match "## Answer" --timeout 300000   # wait on text instead of status
```

## Bryan's keybindings (HIS config: prefix = ctrl+x, NOT the ctrl+b default)

READ `~/.config/herdr/config.toml` [keys] BEFORE quoting hotkeys — his prefix
is `ctrl+x` and he has custom command panes. After ctrl+x:
n/p next/prev tab · 1-9 jump tab · c new tab · h/j/k/l move panes ·
tab cycle panes · v split · w workspace picker · ? help overlay · q detach ·
shift+c Claude temp pane · shift+p pi temp pane · shift+i rename pane.
Server: `herdr server` headless; `herdr status` health.
