# pi recipes

Copy-paste commands for common jobs. Every command pins sol, terra, or luna plus
effort explicitly; never rely on the saved pi default (see thinking-levels.md).

## Default grunt lookup / summary (terra low)

```bash
pif -p --no-session --no-tools --model "openai-codex/gpt-5.6-terra:low" \
  @src/some/file.ts "Summarize: exports, data flow, tRPC calls. Terse."
```

## Tiny extraction (luna high, trivial-only exception)

```bash
pif -p --no-session --no-tools --model "openai-codex/gpt-5.6-luna:high" \
  @data.json "Extract every field name as a bullet list."
```

## Small well-specified edit (terra low drafts, terra medium checks)

```bash
pif -p --no-session --approve --tools read,edit,grep \
  --model "openai-codex/gpt-5.6-terra:low" \
  "In src/x.ts change the button label 'Save' to 'Apply'. Touch nothing else."
```

## Second opinion, read-only (terra)

```bash
pif -p --no-session --no-tools --model "openai-codex/gpt-5.6-terra:high" \
  --append-system-prompt "Be terse. Cite file:line." \
  @src/server/services/rescan/loans.ts \
  "Does this correctly diff snapshot vs live? Any bug?"
```

## Cross-check a diff

```bash
git diff | pif -p --no-session --no-tools \
  --model "openai-codex/gpt-5.6-terra:medium" \
  "Review this diff for correctness bugs only."
```

## Load-bearing "take your time" cross-check (sol)

```bash
pif -p --no-session --no-tools --model "openai-codex/gpt-5.6-sol:xhigh" \
  @docs/rescan/FULL-RESCAN-SPEC.md \
  "Find edge cases this spec doesn't cover."
```

## Offload a contained fix (terra drafts, sol checks)

```bash
pif -p --no-session --approve --tools read,edit,grep \
  --model "openai-codex/gpt-5.6-terra:medium" \
  "Rename \`foo\` to \`bar\` in src/utils/x.ts and fix callers."
```

## Mechanical / formatting (fast)

```bash
pif -p --no-session --model "openai-codex/gpt-5.6-luna:high" \
  @data.json "Reformat this as a markdown table."
```
