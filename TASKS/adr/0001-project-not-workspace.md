# 0001 — "Project" for orch's grouping of work; "workspace" belongs to the plexer

## Status

Accepted — 2026-08-26

## Context

orch needed a name for the user's grouping of related work: any number of orchestrators and
their agents, consolidated into one effort. A website's server repo and client repo are one
such thing.

"Workspace" was used for it. That word is already taken, several times over, by the layer
underneath: herdr has workspaces (`wF`), tmux has sessions, editors have workspaces. In every
one of those it means **a place things are arranged on a screen**.

The collision was not cosmetic. Design conversations kept sliding off: a grouping of *work*
was repeatedly pulled toward directories, roots, cwd derivation, and per-path uniqueness —
because that is what the word means everywhere else in this system. Two concepts wearing one
name produced questions that were consistently slightly beside the point.

It also produced a visible bug: the web displayed `wF` — herdr's own generated id — as though
it were a name the user had chosen, because one field was being asked to mean both things.

## Decision

Two words, two concepts, and neither is ever used for the other.

- **Project** — orch's grouping of work. User-created, optional, identified by name. Not a
  path, covers no directories, says nothing about where anything runs. Nothing owns it.
- **Workspace** — the physical working location on disk: the directory, the worktree, or the
  plexer's own grouping of it. Recorded by orch as *placement*, never shown as a name the
  user chose.

## Consequences

- The grouping is `projects`, and agents carry `project_id`.
- `workspace` survives only inside placement, alongside `handle` — where it is honestly the
  plexer's fact.
- Existing uses of "workspace" for orch's own grouping — the store column, the CLI flag
  `--workspace`, `orch ws`, the workspace-wall policy, the event field — all name the wrong
  concept and are renamed, not aliased.
- The rename is mechanical but wide. It is worth it: the alternative is a word that will keep
  bending every future conversation toward the plexer.

## Alternatives considered

- **Keep "workspace" for orch and qualify the other one** ("plexer workspace"). Rejected: the
  unqualified word would still be ambiguous in every log line, column name, and conversation,
  and the qualifier would be dropped in speech immediately.
- **Reuse the plexer's workspace as orch's grouping.** Rejected: it makes orch's organisation
  of work depend on which plexer is running, and headless has no such concept at all — which
  is exactly how `"local"` came to be written as a workspace value.
