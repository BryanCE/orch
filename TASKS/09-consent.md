# 09 — Consent: actions an agent may not take on its own

Status: **BUILT** (L2). L3 and the shared daemon are DESIGN.

## The problem

`orch spawn` run from outside a plexer pane opened a herdr workspace on the
user's screen without asking. That is not a bug in `resolveSpawnWorkspace` —
it is doing what it was told — it is a missing gate: orch had no notion of an
action that requires a human.

The general case is bigger than workspaces. An agent drives orch; orch acts on
the human's machine and screen. Some of those actions are the human's to allow.

## Why a flag is not consent

`--new-workspace` was the first attempt and it is worthless: whoever runs the
command types the flag, and that is the agent. Enforcement can only rest on
something an agent provably cannot do.

| Human can | Agent cannot | Fakeable |
|---|---|---|
| type at a real TTY | agents shell out through pipes | yes, via a pty wrapper — deliberate, not accidental |
| touch a FIDO2 key | the capacitive sensor is not software-addressable | **no** |
| hold a secret never shown to the agent | cannot read the human's mind | no |
| be reached out-of-band (phone, toast) | does not own that channel | no, if the token never reaches the agent's stdout |

## The two properties that make consent mean anything

Consent mechanisms fail to *narration* long before they fail to bypass. The
agent writes what the human reads, so a human approving "what the agent says it
will do" is approving text. (Checkmarx, *Lies-in-the-Loop*; arXiv 2606.02668,
*Consent Integrity for Black-Box LLM Agents*.) Both fixes are non-negotiable
and are in `src/policy/grant.ts` from the start:

1. **Render from ground truth.** The approval text is generated from the
   recorded params and nothing else. No caller passes a description; there is
   no field for one. The requester names itself on its own line and never gets
   to describe the action.
2. **Bind to execution.** A grant carries the hash of the canonicalized action.
   Execution recomputes it and refuses on mismatch, so approval earned for a
   small action cannot be spent on a larger one.

A grant is additionally one-use and expires in 10 minutes.

**The request id is not a secret and is not what makes this safe.** It is printed
to the agent as well, so the agent could quote it back. Its job is *binding*:
tying an answer to one exact action so an approval cannot be misfiled. The gate
is the terminal. The id becomes a real secret only at L4, where orch delivers it
through a channel the agent never reads.

## The ladder

- **L0 flag** — no enforcement. Rejected.
- **L1 TTY confirm** — the floor. Stops drift, not a pty wrapper.
- **L2 one-shot bound grant** — BUILT. Refuse and record the action, the human
  runs `orch grant <id>` in a second terminal, the agent retries the exact command.
- **L3 hardware attestation** — DESIGN. `orch grant` signs `canonicalAction()`
  with a touch-required key: `ssh-keygen -Y sign -f ~/.orch/approval_sk -n
  orch-grant`, verified with `ssh-keygen -Y verify` against an allowed-signers
  file. No library, no browser. Unfakeable by any software agent. It lands as a
  `signature` column on `grant_approvals` — attestation is deliberately the only
  pluggable part of `src/store/grant-rows.ts`.
- **L4 out-of-band** — DESIGN. Deliver the approval through the existing notify
  sinks with a token that is only ever sent to the sink, never printed to the
  agent's stdout.

## Shape

```
src/store/schema.ts      the five tables below (STORE_SCHEMA 7)
src/store/grant-rows.ts  canonicalAction, actionHash, record/approve/deny/spend, render
src/commands/grant.ts    orch grant [<id>|--list]   — refuses without a TTY
```

The orchestrator's terminal is already busy running its session, so approval
happens in a **second terminal**: the refusal prints an id to quote back, and
`orch grant <id>` answers that one request and no other.

### Tables

```sql
grant_requests        id (the id quoted back), action_hash, kind, requested_by, requested_at
grant_request_params  (request_id, name) -> value
grant_approvals       request_id PK, approved_at, expires_at, host_id
grant_denials         request_id PK, denied_at
grant_spends          request_id PK, spent_at, spent_by
grant_states          derived view: pending | approved | denied | spent
```

Params are their own table because they are a multivalued fact, and because the
rendering and the hash must read the same rows rather than two copies of them.

Approval, denial and spend are separate tables under `06-schema.md`'s rule —
6NF only where the split deletes a constraint. Here it deletes three:
**`grant_spends.request_id` as a primary key makes "one use, never again" a key
violation rather than a check a caller must remember**; the same holds for
double approval and for approving something already denied. The four timestamped
tables are also the audit log, so there is no second place to write one.

`grant_states` omits expiry on purpose: expiry depends on the clock, and a view
that reads the clock answers differently for unchanged rows. Callers compare
`expires_at` at the instant they spend.

`GrantKind` is a union and `ACTION_SENTENCE` a total record over it, so adding
an action fails to compile until it has a sentence a human can read.

Today's one member is `spawn.new-workspace`. Candidates as they come up: writing
outside the agent's `--cwd`, closing panes orch did not spawn, anything that
touches the installed tree (Rule 12).

## Wider than orch

The reusable primitive is a **local, tool-agnostic consent daemon**: one socket
any agent CLI can ask, with mandatory action-hash binding, ground-truth
rendering, pluggable attestation (TTY → FIDO touch → push), and one audit log.
Nothing ships this today — `sudo` has tickets but no action binding, polkit is
Linux-desktop-only, and MCP's elicitation URL-mode (SEP-1036) is browser and
server bound. If it gets built, orch is its first consumer, never its owner.
