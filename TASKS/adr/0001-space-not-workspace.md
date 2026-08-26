# 0001 — "Space" for orch's grouping of work; where things are is "environment"

## Status

Accepted — 2026-08-26

## Context

orch needed a name for the user's grouping of related work: any number of orchs and their
slaves, consolidated into one effort. A website's server repo and client repo are one such
thing.

**"Workspace" was used for it, and the word is taken several times over.** herdr has
workspaces, tmux has sessions, editors have workspaces — in every case it means *a physical
place things are arranged*. The collision was not cosmetic: design conversations kept sliding
off, because a grouping of *work* was repeatedly pulled toward directories, roots, cwd
derivation and per-path uniqueness. That is what the word means everywhere else in this
system.

It also produced a visible bug. The web displayed `wF` — herdr's own generated id — as though
it were a name the user had chosen, because one field was being asked to mean both things.

**"Project" was considered and rejected.** Users are working on *their* project using orch; a
second, orch-owned meaning of the word forces them to hold two ideas at once and distinguish
them constantly.

## Decision

**Space** is orch's grouping of work. Where anything *is* — including a plexer's own grouping —
is **environment**, and "workspace" is not one of orch's words at all.

- **Space** — user-created, optional, identified by name. Not a path, covers no directories,
  says nothing about where anything runs. Nothing owns it. It is also the **reachability
  boundary**: orchs in one space may coordinate, across spaces they may not. With no space
  set, the boundary is the repo root.
- **Environment** — where a thing is: its `cwd`, repo root, `worktree`, `branch`, harness,
  plexer, whatever that plexer groups by, and its handle. **Everything has one** — an agent, a
  pack, a space. Never shown as a name the user chose.

The split that failed was "space vs workspace", because the second half had no content of its
own: every physical fact it was carrying already had a precise name and its own column. Naming
the whole side **environment** is what made the two concepts stop bleeding into each other.

## Consequences

- The grouping is `spaces`, and agents carry `space_id`.
- "Workspace" is a **plexer's** word — herdr's grouping, tmux's session. It lives inside an
  environment as the plexer's own coordinate and appears nowhere in orch's model, CLI, or UI.
- Every existing use of "workspace" for orch's own grouping — the store column, the
  `--workspace` flag, `orch ws`, the workspace-wall policy, the event field — names the wrong
  concept and is renamed, not aliased.
- A space gains a real job beyond filing: it is what widens the coordination wall past a
  single repo. Creating one *is* the statement "these belong together."
- The rename is mechanical but wide. Worth it: the alternative is a word that keeps bending
  every future conversation toward the plexer.

## Alternatives considered

- **Keep "workspace" for orch, qualify the other one** ("plexer workspace"). Rejected: the
  unqualified word stays ambiguous in every log line, column and conversation, and the
  qualifier gets dropped in speech immediately.
- **"Project".** Rejected: collides with the user's actual project, forcing them to hold "the
  orch project" as a separate idea from the thing they are building.
- **Reuse the plexer's workspace as orch's grouping.** Rejected: it makes orch's organisation
  of work depend on which plexer is running, and headless has no such concept at all — which
  is exactly how `"local"` came to be written as a workspace value.
