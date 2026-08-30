#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Refuses shell-side file mutation so every
# edit goes through the Edit/Write tools, where the diff is visible to Bryan.
#
# Blocked shapes:
#   sed -i / sed --in-place        perl -i / perl -pi / perl -ni
#   python|python3 - <<HEREDOC     python|python3 -c '...open(...).write(...)'
#   cat > file / cat >> file        tee [-a] file
#   > file / >> file with a heredoc (<<) on the same command
#   echo|printf ... > file
# Writes whose ONLY target is the session scratchpad (/tmp/claude-*) stay
# allowed — temp scripts are not edits to the tree.

set -euo pipefail
cmd="$(jq -r '.tool_input.command // empty')"
[ -n "$cmd" ] || exit 0

deny() {
  jq -cn --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# A command that only touches the scratchpad may write however it likes.
touches_tree() {
  grep -Eq '(^|[[:space:]"'"'"'])(src|test|tests|TASKS|extensions|scripts|docs|skills|learnings|bin|drizzle|web)/|\.(ts|tsx|js|md|json|sql|sh)([[:space:]"'"'"']|$)' <<<"$1"
}
only_scratchpad() {
  grep -q '/tmp/claude-' <<<"$1" && ! touches_tree "$1"
}

pattern=""
if grep -Eq '(^|[[:space:];&|])sed[[:space:]]+(-[a-zA-Z]*i|--in-place)' <<<"$cmd"; then
  pattern="sed -i"
elif grep -Eq '(^|[[:space:];&|])perl[[:space:]]+-[a-zA-Z]*i' <<<"$cmd"; then
  pattern="perl -i"
elif grep -Eq '(^|[[:space:];&|])(python3?|py|node|bun|perl|ruby)[[:space:]]+-[[:space:]]*<<' <<<"$cmd"; then
  pattern="interpreter heredoc"
elif grep -Eq '(^|[[:space:];&|])(python3?|py)[[:space:]]+-c[[:space:]]' <<<"$cmd"; then
  pattern="python -c"
elif grep -Eq '(^|[[:space:];&|])(node|bun)[[:space:]]+(-e|--eval|-p)[[:space:]]' <<<"$cmd"; then
  pattern="node/bun -e"
elif grep -Eq '(^|[[:space:];&|])(python3?|py)[[:space:]]' <<<"$cmd" && touches_tree "$cmd"; then
  pattern="python against tree files"
elif grep -Eq '(^|[[:space:];&|])cat[[:space:]]+>>?[[:space:]]*[^[:space:]]' <<<"$cmd"; then
  pattern="cat > file"
elif grep -Eq '(^|[[:space:];&|])tee[[:space:]]' <<<"$cmd"; then
  pattern="tee"
elif grep -Eq '<<-?[[:space:]]*['"'"'"]?[A-Za-z_]+' <<<"$cmd" && grep -Eq '>>?[[:space:]]*[^[:space:]&|]' <<<"$cmd"; then
  pattern="heredoc redirection"
elif grep -Eq '(^|[[:space:];&|])(echo|printf)[[:space:]].*[^&|]>>?[[:space:]]*[^[:space:]&|]' <<<"$cmd"; then
  pattern="echo/printf > file"
fi

[ -n "$pattern" ] || exit 0
only_scratchpad "$cmd" && exit 0

deny "Blocked shell file edit ($pattern). Bryan requires every file change to go through the Edit or Write tool so the diff is visible. Re-do this change with Edit/Write."
