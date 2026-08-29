#!/usr/bin/env bash
# Stop hook: refuses to let the turn end while the goal is unmet.
#
# Exit 2 with the reason on stderr = stopping is BLOCKED and the reason is fed
# straight back to the model, which then has to act on it. This is the whole
# enforcement: not a reminder, but an inability to stop.
#
# It checks THREE things against reality, none of which a claim can satisfy:
#   1. types    - bunx tsc --noEmit
#   2. lint     - bunx oxlint
#   3. tests    - bun test
#   4. TASKS    - every row in TASKS/02-scope.md is BUILT
# `bun run check` is deliberately NOT used: that gate is the user's alone
# (CLAUDE.md Rule 5), so the same ground is covered by calling tsc and oxlint
# directly.

cd "${CLAUDE_PROJECT_DIR:-/home/bryan/orch}" || exit 0

fail() { printf '%s\n' "$1" >&2; exit 2; }

# --- 1. types ---------------------------------------------------------------
types="$(bunx tsc --noEmit 2>&1)"
if [ -n "$types" ]; then
  count="$(printf '%s\n' "$types" | grep -c 'error TS')"
  fail "NOT DONE — $count TYPE ERRORS. Fix these before anything else:

$(printf '%s\n' "$types" | head -20)"
fi

# --- 2. lint ----------------------------------------------------------------
lint="$(bunx oxlint 2>&1 | grep -E '^\S+:[0-9]+:[0-9]+: error' | head -20)"
if [ -n "$lint" ]; then
  fail "NOT DONE — LINT ERRORS. Fix these before anything else:

$lint"
fi

# --- 3. tests ---------------------------------------------------------------
tests="$(bun test 2>&1 | tail -40)"
failed="$(printf '%s\n' "$tests" | grep -oP '^\s*\K[0-9]+(?= fail)' | head -1)"
if [ -n "$failed" ] && [ "$failed" != "0" ]; then
  fail "NOT DONE — $failed FAILING TESTS. Fix them before marking anything built:

$(printf '%s\n' "$tests" | grep -E '^\(fail\)' | head -20)"
fi
if ! printf '%s\n' "$tests" | grep -q ' pass'; then
  fail "NOT DONE — the test suite did not report a summary, so it did not finish.
A truncated run is indistinguishable from a passing one. Find what killed the
runner (a process.exit() inside a command does exactly this) and fix it."
fi

# --- 4. progress must be MARKED, not just made ------------------------------
# Code moved but no row flipped means finished work is sitting unmarked, and the
# scope file then under-reports the tree. Checked against the working tree and
# against the last commit, so it cannot be dodged by committing first.
code_now="$(git diff --name-only HEAD -- src test packages scripts 2>/dev/null | head -1)"
tasks_now="$(git diff --name-only HEAD -- TASKS/ 2>/dev/null | head -1)"
code_last="$(git diff --name-only HEAD~1 HEAD -- src test packages scripts 2>/dev/null | head -1)"
tasks_last="$(git diff --name-only HEAD~1 HEAD -- TASKS/ 2>/dev/null | head -1)"

if { [ -n "$code_now" ] && [ -z "$tasks_now" ]; } || { [ -n "$code_last" ] && [ -z "$tasks_last" ]; }; then
  fail "NOT DONE — YOU CHANGED CODE AND MARKED NOTHING OFF.

Types are clean, lint is clean, tests are green, and TASKS/ was not touched.
Finished work that is not marked makes the scope file lie about the tree.

Go through TASKS/02-scope.md NOW and, for every row the tree already satisfies:
  - set it to \`BUILT\` with the exact file:line that satisfies it, and
  - name the test that proves it.
Mark nothing you have not run the test for. Then stop."
fi

# --- 5. TASKS ---------------------------------------------------------------
report="$(python3 - <<'PY'
import re, sys

rows, section = [], "?"
for line in open("TASKS/02-scope.md", encoding="utf-8"):
    if line.startswith("## "):
        section = line.strip("# \n")
    if not line.startswith("|"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 3 or not re.match(r"^[A-Z][a-z]?[0-9]+[a-z]?$", cells[0]):
        continue
    status = re.match(r"^`([A-Z]+)`", cells[-1])
    rows.append((cells[0], section, cells[1], status.group(1) if status else "OTHER"))

unbuilt = [r for r in rows if r[3] in ("DECIDED", "BUILD", "DESIGN", "OTHER")]
broken = [r for r in rows if r[3] == "BROKEN"]
built = [r for r in rows if r[3] in ("BUILT", "FIXED")]

if not unbuilt and not broken:
    sys.exit(0)

# The next row is the FIRST unbuilt one in file order. Order is the rule: a
# later row started before an earlier one is drift, not progress.
nxt = (unbuilt or broken)[0]
print(f"""NOT DONE. Types clean, lint clean, tests green — but {len(built)} of {len(rows)} rows built; {len(unbuilt)} unbuilt, {len(broken)} broken.

NEXT ROW, IN ORDER — {nxt[0]} ({nxt[1]}), status {nxt[3]}:
  {nxt[2][:400]}

Do this now, and do not stop until it is green:
  1. Write the test that DEFINES {nxt[0]}'s required behaviour — not merely a test
     that fails. It must assert what the row REQUIRES, in the row's own terms, so
     that passing it means the row is satisfied and failing it means the row is
     not. A test that fails for an unrelated reason, or that asserts less than the
     row demands, is not the row's test. Run it. Paste the red output.
  2. Write the smallest code that passes it. Run it. Paste the green output.
  3. Mark {nxt[0]} BUILT in TASKS/02-scope.md with the file:line that satisfies it.
  4. Then, and only then, move to the next row.

Never mark a row built without running its test. Never revert or kill running work.""")
PY
)"

if [ -n "$report" ]; then
  # --- 6. ORDER LOCK -------------------------------------------------------
  # The row this hook named last time must be BUILT before any other row is
  # accepted as progress. Without this, the four checks above are all satisfied
  # by building whichever row is easiest, which is exactly how a scope file ends
  # up 40% built with the hard rows untouched.
  marker=".claude/.next-row"
  named="$(printf '%s\n' "$report" | grep -oP 'NEXT ROW, IN ORDER — \K[A-Za-z0-9]+' | head -1)"
  previous="$(cat "$marker" 2>/dev/null)"

  if [ -n "$previous" ] && [ "$previous" = "$named" ]; then
    report="$report

ORDER LOCK: $previous was named as the next row on the LAST check too, and it is
still not built. Do not touch any other row. Build $previous now — its failing
test first — or say plainly, in one line, what is blocking it."
  fi

  printf '%s' "$named" > "$marker" 2>/dev/null
  fail "$report"
fi

rm -f ".claude/.next-row" 2>/dev/null
exit 0
