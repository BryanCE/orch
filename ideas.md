Good context to have — orch is further along than I realized: presence dir, heartbeats, steer/answer inbox,
  result.json, spawn registry. That's a real control plane. Here's my take on both questions.

  What would make orch genuinely good for everyone

  The pattern in orch today: it's a great remote control for your exact stack (pi + herdr + bun + one machine).
  The features that turn personal software into a real tool are the ones that remove each hard-coded assumption,
  roughly in this order of payoff:

  1. Agent adapters — decouple from pi. Herdr itself multiplexes 15+ agents, but orch can only drive pi. Define
  a small adapter interface (spawn command, state detection, steer/answer mechanism, result extraction) and ship
  adapters for Claude Code and Codex CLI alongside pi. This is the single biggest jump in addressable audience,
  because right now your audience is "people who use pi," which is a small circle.
  2. Make herdr optional — a headless backend. You already have pif for headless dispatch; extend that so the
  whole fleet can run as plain background processes (or tmux panes as a second backend). Two reasons: people
  won't adopt orch if it requires installing a specific multiplexer first, and a headless mode is what unlocks
  CI/server/cron use — which is where "orchestrator" tools actually earn their keep.
  3. A task queue, not just named-pane dispatch. orch dispatch pi1 "fix the tests" requires you to know who's
  idle. orch run "fix the tests" that picks an idle agent, queues if none, retries on error, and records the
  result in a history turns orch from a remote control into an orchestrator. Dependencies/parallelism ("run
  these 5, then this one") can come later — the queue is the foundation.
  4. Git worktree isolation + a review flow. This is the killer usability feature in every multi-agent tool
  people actually like (Claude Squad, vibe-kanban, etc.): each agent works in its own worktree, and you get orch
  review — a queue of finished diffs you approve/merge or reject/re-dispatch. Without it, N agents in one
  working tree stomp each other and multi-agent coding stays a demo.
  5. Notifications on blocked/done/error. You have orch events streaming; add hooks — desktop notification,
  webhook, whatever — so a blocked agent finds you instead of you polling orch status. The whole value
  proposition of a fleet is not babysitting it.
  6. orch doctor + config file. Setup is already good; a doctor command that diagnoses the usual breakage
  (extension not symlinked, stale presence dir, herdr version mismatch) and a ~/.orch/config.toml for defaults
  (model, spawn count, adapter) is what makes strangers' bug reports tractable instead of "works on my machine."

  If I had to pick two: adapters (1) widens who can use it, worktrees + review (4) widens what it's safe to use
  it for. The rest is compounding polish.

  One strategic note: your mouse-based dashboard itch from earlier fits here too — but as an orch ui (a little
  local web page reading ~/.orch/) rather than a terminal. That gets you clickable fleet control for a weekend
  of work instead of a terminal-emulator project.


- BUG (2026-07-13): herdr pane move across workspaces orphans the bridge key — pane env HERDR_PANE_ID is frozen at spawn, so after a move the bridge writes ~/.orch/agents/<old-id> while the CLI resolves the name to the new pane id and misses. Fix: entities resolution should correlate stale agent dirs by pid (status.json pid ↔ herdr pane process-info) and adopt the dir under the live pane id.
