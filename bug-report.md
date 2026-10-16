
## 1. `workers.verify_commands` runs on read-only agents

2026-10-16, herdr backend. With `workers.verify_commands = ["bunx oxlint"]`, a luna reader whose task edited no file still ran oxlint before reporting, failed on the project's type-aware config (`Failed to find tsgolint executable`) and reported `blocked` instead of its finding. Verify should run only when the agent edited files, and only over those files.

## 2. `dispatch` to a busy agent fails with only a timeout

`orch dispatch d-paytype "<task>"` returned `Reset d-paytype failed: it did not become ready within 75s.` The agent showed `working`, busy on a background-task notification from its own previous turn after it had already reported `blocked`. The error names no cause and gives no next step; `orch close` then a fresh spawn worked. Dispatch could say the agent is mid-turn and offer `orch abort`.

## 3. `spawn` prints `all spawns failed` with no reason

`orch spawn d-paytype2 --tab ded-mod-02 --with <file> --harness claude --model haiku --prompt "<task>"` printed only `all spawns failed`. The identical command a few seconds later succeeded. The failure line should carry the cause (cap, tab, bridge).

## 4. `--model` on dispatch is checked against the agent's harness without a hint

`orch dispatch <pi agent> --model claude/haiku ...` refused with the pi model list. Switching an idle pi agent to a claude model is not possible through dispatch; the error could say so and suggest close and spawn with `--harness claude`.

## 5. Queue tasks scoped with `--agent` work well

`orch queue add "<task>" --agent <name>` then `orch work --pass` assigned each task to the named idle agent within seconds. Suggestion: `--model`/`--harness` scoping (any idle haiku agent) would let one queue feed a mixed fleet without naming agents.

## 6. Many live agents exhaust the host

Fifteen live agents (eleven haiku, four luna) on one WSL host drove load to 100 and memory to 0 free of 17 GB. A per-machine cap tied to free memory, or a warning in `orch status --capacity`, would catch it before the host thrashes.
