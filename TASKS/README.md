# TASKS — the orch rebuild

**This directory is the only place plans, designs, and task lists live.** Nothing about this
refactor goes in `docs/`, in `learnings/`, or in a comment somewhere. One location.

## The goal

Clean up this codebase and rebuild it from solid fundamentals — the database design, the
mental models, and the primitives — so that orch is an application we can both **maintain**
and **extend** into the future.

The current tree has good parts and good ideas buried in a lot of slop: concepts split across
four documents, one idea named three ways, invariants written in prose and enforced by
nothing, and a schema that mixes two representations of the same thing. This rebuild fixes the
foundations rather than patching around them.

## The non-negotiables

These are settled. Work that violates one is wrong regardless of how well it works.

1. **orch owns every agent.** An environment — herdr, tmux, headless, whatever comes next — is
   *where* an agent runs. It is **environment**: recorded, queryable, displayed. It is never
   identity.
2. **orch owns naming.** Not herdr, not any plexer, not any harness. A plexer's generated id
   is never shown as a name you chose.
3. **An orch is an agent.** Spawner and spawnee are the same entity, pointing at each
   other. There is no second id space and no second liveness mechanism.
4. **One source of truth, and it is the daemon.** One orchd per machine. Every client — the
   CLI on either OS, the web, a harness bridge — dials it and reads nothing else: never herdr,
   never a multiplexer, never a harness, never the store or the presence files directly.
   `$ORCH_DIR` is orchd's private backing, not an address. Two homes must never mean two
   daemons.
5. **orch is decoupled from every harness and every plexer.** Branch on what the environment provides,
   never on an environment's id. Adding an environment edits zero renderers, commands, or
   policy.
6. **An orch drives what it leases; it never owns its life.** If the orch dies, the human
   can still kill what it left behind, from the CLI or the web, always.
7. **Spawn and walk away is not a mode — it is what happens.** Work survives its spawner,
   always. Losing an orch costs a driver, never a life.
8. **It has to be obvious what is going on.** A user should be able to tell live work from
   dead leftovers at a glance, and handle both without reading the source.
9. **No back-compat.** Pre-publish, there is exactly one live shape for every record. Old data
   is malformed: reap it or error. Never accept two shapes at once.
10. **Normalize properly, and pick the right type for the purpose.** No wide tables that
    become dead ends. No type inherited by copying what is already there.

## What is in here

| file | what it is |
|---|---|
| `00-glossary.md` | The index: one line per term, pointing at the detail. |
| `03-vocabulary.md` | The long-form definitions. Definitions only, no decisions. |
| `01-agent-model.md` | The entity model and the schema. Identity, provenance, lease, environment — what an agent is and what keeps it alive. Data types are argued from purpose, not inherited. |
| `04-db-thinking.md` | Why the schema is shaped the way it is, claim by claim. |
| `05-db-research.md` | Those claims checked against published practice, with what changed. |
| `06-schema.md` | **The authoritative DDL.** |
| `adr/` | Decisions that were hard to reverse and had real alternatives. |
| `02-scope.md` | Everything this rebuild covers, grouped and status-marked. The inventory that stops work being forgotten because nobody wrote it down. |
| `NOTES.md` | **Scratchpad, not a document.** Working notes of the thinking. Nothing in it is settled, it goes stale on purpose, and it is never cited as a decision or implemented from. |

**What is authoritative:** `02-scope.md` for what is decided, `06-schema.md` for the DDL,
`03-vocabulary.md` for what words mean, `adr/` for the hard calls. Everything else supports
those. Where any other file disagrees with them, they win.

## How this proceeds

Design first, agreed, written down here — then code. Not the other way around. A plan that
gets discovered halfway through implementation was not a plan.
