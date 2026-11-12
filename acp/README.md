# ACP in orch

Everything for the job of making the Agent Client Protocol a first-class way orch runs and
drives an agent. This directory goes when the job lands.

Read in this order:

1. `PRD.md`. What the job delivers, the ten-line MVP it stops at, what it leaves out, and the
   four checks only Bryan can run.
2. `MODEL.md`. The words every task builds against: harness, form, backend, channel, viewer,
   protocol. Where ACP sits and where its code goes.
3. `RULES.md`. The wording changed in `CLAUDE.md` and the architecture law, and why.
4. `TASKS.md`. The waves, their checkpoints and Bryan's hand-offs.

Working material:

- `tasks/`. One markdown file per wave, one section per agent, indexed in `TASKS.md`.
  `L1-map.md` and `L2-wiring-lookup.md` are lookup files that produced findings.
- `findings/`. Markdown. Maps of today's code with `path:line` for every fact, one file per
  area, and the `review-*.md` reports on landed work.
- `reference/`. The published protocol as fetched: the v1 JSON schema, the docs pages, the
  binding READMEs and their npm metadata, as `.md`, `.json` and `.txt` files. Data, never run.

## Where it stands

`TASKS.md` carries the checkboxes. In short:

- [x] Findings, PRD, model, rules, task index.
- [x] Wave 1, and waves 3, 4 and 5 typed.
- [ ] Wave 2: typed and `bun check` clean. Waiting on Bryan's `bun db:gen` and `bun db:reset`.
- [ ] Waves 6, 7 and 8, and the MVP run.

`ACP-LAYER-PLAN.md` at the repo root is the plan this directory replaces.
