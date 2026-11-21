# Agent prompts

An idea, recorded for discussion. Nothing here is decided and nothing is built.

## The idea

orch writes text that agents read: the worker header on every dispatch, the clauses it adds for
a worktree, a spawner or a gated command, the refusals a tool call gets, and the prompt a
council member gets. The agents that read it are mostly small, fast models. They need more
guidance than a large model, and every token of it is paid on every dispatch.

Two things follow:

1. **Write every prompt to the `writing-for-agents` standard.** Each one says what the agent
   needs to act and nothing else, in the fewest tokens that still work on a small model. This
   is ongoing work: the prompts get better as we see what agents do with them.
2. **Let a user set them.** A user may know their models and their project better than orch's
   defaults do. Settings could carry the prompt text, or parts of it.

## Where the text lives today

- `packages/orch/src/worker-prompt.ts`. The worker header and its clauses.
- `packages/orch/src/policy/read-only.ts`. What a read-only agent's refused tool call says.
- `packages/orch/src/council/`. The round-file layout a council member is told to write, and
  the member prompt when it lands.
- `packages/orch/skills/`. The skills orch installs, which an orchestrator reads.

## To discuss

- Which prompts a user may change: all of the header, or named clauses only? Some clauses
  carry rules orch relies on, such as never running an orch verb.
- How a setting holds a prompt: text in `settings.json`, or a path to a file?
- Whether a prompt varies by harness or by model, since a small model needs more than a large
  one.
- How we know a rewrite is better: token count is easy to measure, and what agents do with the
  text is not.
- Whether this belongs in the install settings or the project settings the `project-settings/`
  job adds.
