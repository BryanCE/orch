# P3-6 `skill` — the published skill says what orch does now

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root. Paths are inside
`packages/orch/`.

## You own exactly these files

- `skills/orch/SKILL.md`
- `skills/orch/reference/commands.md`, `skills/orch/reference/fleet.md`,
  `skills/orch/reference/troubleshooting.md`

Touch nothing else. Every verb, flag and setting you name must exist: flags are parsed in
`src/commands/` (grep each), settings are in `src/settings/registry.ts` (grep each), output
strings are in `src/commands/control.ts` and `src/commands/spawn/report.ts` (copy, do not
paraphrase). scratch.md item 20 exists because this skill drifted once already.

## The task

- `SKILL.md` Rules block: add ONE rule in the house style of the ones around it:
  **`orch spawn` already waited.** It returns only after each agent's bridge attached to
  orchd (or prints STALLED and exits 1). Never `sleep` after a spawn. A dispatch sent before
  attach is queued, not dropped: orchd re-pushes it the moment the bridge attaches.
- `reference/commands.md`:
  - Dispatch: the delivered / queued outcomes and what each means for the caller
    (delivered = the agent applied the prompt; queued = durable, retried on
    `daemon.outbox_drain_ms`, watch `orch events` for the state change).
  - Answer: no `--force`; an answer to an agent that is not asking is refused by name.
  - ~185: "accepted by the inbox and then lost inside the harness's blocked turn" → a steer
    at an asking agent is refused; use `orch answer`.
  - Spawn: the attach wait, one sentence.
- `reference/troubleshooting.md`: one entry for `Queued for <agent> (dispatch <id>): no
  bridge ack within Nms` — the agent is live but its bridge holds no link (the harness is
  still starting, or the bridge is redialing on `daemon.bridge_reconnect_ms`); the write is
  safe in the outbox; `orch status --json` shows `bridgeAttached` per agent. One entry for
  `STALLED … bridge never attached` on spawn.
- `reference/fleet.md`: `grep -n -i "inbox\|sleep" skills/orch/reference/fleet.md`; fix or
  delete each hit.
- `grep -rn -i "inbox\|ack\.jsonl\|answer\.json\|question\.json\|--force" skills/orch` → only
  `--force` hits that belong to `result` / `clean` remain.

## Done means

Paste the grep above. Paste the final Rules block from `SKILL.md` and the Dispatch section
of `commands.md` verbatim. List every flag and setting you named with the file:line that
defines it.
