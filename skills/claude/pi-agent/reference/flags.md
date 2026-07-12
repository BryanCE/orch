# pi flags reference

Only the flags that matter for driving pi from Claude Code. Full list: `pi --help`.
Every pif dispatch MUST pass an explicit `--model` from the GPT-5.6 family with
its effort suffix. Never rely on the saved pi default.

## Core

| Flag | Meaning |
|---|---|
| `-p`, `--print` | Non-interactive: process prompt and exit. Almost always want this. |
| `--no-session` | Ephemeral, don't write a session file. |
| `@file` / `@img.png` | Attach a file/image (before the prompt). Also accepts stdin via pipe. |
| `--model <provider/id:effort>` | REQUIRED on every pif dispatch. Pin `openai-codex/gpt-5.6-sol`, `terra`, or `luna` plus `:off|low|medium|high|xhigh|max`. Pi `off` maps to native effort `none`. |
| `--provider <name>` | Provider. Ours is `openai-codex`, but provider alone is not enough; always pin the family model. |
| `--thinking <level>` | Standalone override accepted by pi, but do not use it for pif dispatches. Put effort in the required `--model ...:<effort>` flag. See `thinking-levels.md`. |
| `--name "..."` | Label the run. |

## Tool scoping (what pi is allowed to do)

pi has its own `read, bash, edit, write` tools and WILL act on the repo. Scope it.

| Flag | Meaning |
|---|---|
| `--no-tools`, `-nt` | Disable all tools. Read-only advice. Safest default for a second opinion. |
| `--no-builtin-tools`, `-nbt` | Disable built-ins, keep extension/custom tools. |
| `--tools`, `-t <list>` | Allowlist, comma-separated: `read,bash,edit,write` (also grep/find/ls). |
| `--exclude-tools`, `-xt <list>` | Denylist specific tools. |
| `--approve`, `-a` | Auto-trust project so `-p` mode doesn't stall on the trust prompt. Needed if pi must edit. |

Same repo rules apply to pi as to you: no mutating DB scripts, no script runner.
Don't hand pi a task you couldn't do yourself here.

## Steering / shaping

| Flag | Meaning |
|---|---|
| `--append-system-prompt <text\|file>` | Append guidance to pi's system prompt (repeatable). e.g. "Be terse, cite file:line". |
| `--system-prompt <text>` | Replace the whole system prompt (rare). |
| `--no-context-files`, `-nc` | Skip AGENTS.md / CLAUDE.md so pi isn't biased by this repo when you just want a clean opinion. |

## Sessions (only for back-and-forth)

Default to `--no-session`. For continuity across calls:

| Flag | Meaning |
|---|---|
| `-c`, `--continue` | Continue the last session. |
| `-r`, `--resume` | Pick a session to resume (interactive). |
| `--session-id <id>` | Use/create an exact session id — drive one named conversation across several Bash calls. |

Sessions live in `~/.pi/agent/sessions/`.

## Output modes (only if plain text isn't enough)

Default is plain `text` — fine for reading answers. For structured parsing:
`--mode json` (JSONL event stream) or `--mode rpc` (persistent JSON-over-stdio
process). RPC framing is strict LF-delimited JSONL — split only on `\n`, never a
Unicode-aware line reader.

## Config on disk

- `~/.pi/agent/settings.json`: defaults may be stale. Ignore them and pin sol, terra, or luna plus effort on every dispatch.
- `~/.pi/agent/auth.json` — providers: `openai-codex` (oauth, the subscription),
  `openrouter` (api_key — do NOT use for our calls).
- `~/.pi/agent/sessions/` — session history.
