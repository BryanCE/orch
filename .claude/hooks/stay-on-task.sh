#!/usr/bin/env bash
# Blocks the moves that have actually cost Bryan time in this repo.
#
# A cron ASKS. This DENIES. Exit 2 with a reason on stderr = the tool call is
# refused and the reason is fed back to the model.
#
# Reads the PreToolUse hook payload on stdin: {"tool_name":..,"tool_input":{..}}

payload="$(cat)"

tool="$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_name",""))' 2>/dev/null)"

deny() { printf '%s\n' "$1" >&2; exit 2; }

# --- Never discard running work ---------------------------------------------
if [ "$tool" = "TaskStop" ]; then
  deny "BLOCKED: killing a running agent wastes usage and discards its work. Let it finish. (CLAUDE.md: never stop or revert work to 'clean up'.)"
fi

if [ "$tool" != "Bash" ]; then
  exit 0
fi

full="$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"

# Only the INVOCATION is policed, never the text it carries. A commit message or
# a heredoc that quotes a blocked command is prose, not a call — matching on it
# is how an earlier version of this hook blocked the very commit that added it.
# Everything from the first quote or heredoc marker onward is data.
cmd="$(printf '%s' "$full" | python3 -c '
import re, sys
text = sys.stdin.read()
cut = len(text)
for marker in ["\"", "'"'"'", "<<"]:
    found = text.find(marker)
    if found != -1:
        cut = min(cut, found)
print(text[:cut])
' 2>/dev/null)"

case "$cmd" in
  # --- Never revert, discard, or rewrite history ----------------------------
  *"git checkout --"*|*"git restore"*|*"git stash"*|*"git reset --hard"*|*"git revert"*|*"git clean -"*)
    deny "BLOCKED: that discards work. Nothing in this tree is reverted to 'clean up' — fix forward instead." ;;

  # --- The gate is the user's, never mine ----------------------------------
  *"bun run check"*|*"bun check"*)
    deny "BLOCKED: the check gate is USER-ONLY (CLAUDE.md Rule 5). Ask Bryan to run it and read the result file." ;;

  # --- Database commands are the user's ------------------------------------
  *"db:gen"*|*"db:reset"*|*"db:mig"*|*"drizzle-kit"*)
    deny "BLOCKED: db commands are USER-ONLY. Never run generation, reset or migrate." ;;

  # --- Publishing is the user's (Rule 12) ----------------------------------
  *"build:dev"*|*"npm pack"*|*"npm install -g"*|*"npm i -g"*)
    deny "BLOCKED: building/installing is USER-ONLY (CLAUDE.md Rule 12). Builds never leave the checkout's dist/." ;;

  # --- Never write outside the repo ----------------------------------------
  *".orch"*|*".pi/agent/extensions"*|*".local/lib/node_modules"*)
    case "$cmd" in
      cat*|less*|head*|tail*|grep*|ls*|stat*|wc*|find*|diff*) ;;
      *) deny "BLOCKED: that writes outside the repo. ~/.orch and every installed tree are Bryan's alone." ;;
    esac ;;

  # --- Hand-written migrations ---------------------------------------------
  *"migration.sql"*)
    case "$cmd" in
      cat*|less*|head*|tail*|grep*|ls*|wc*) ;;
      *) deny "BLOCKED: migrations are never hand-written or hand-edited. Change src/db/schema.ts and let Bryan regenerate." ;;
    esac ;;
esac

exit 0
