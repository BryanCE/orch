#!/usr/bin/env bash
# Stop hook: refuses to let the turn end while TASKS/ is unfinished.
#
# Exit 2 with the reason on stderr = stopping is BLOCKED and the reason is fed
# straight back to the model, which then has to act on it. This is the whole
# enforcement: not a reminder to read TASKS, but an inability to stop until the
# rows are actually built.
#
# It reads TASKS/02-scope.md itself, so it cannot be satisfied by a claim.

cd "${CLAUDE_PROJECT_DIR:-/home/bryan/orch}" || exit 0

report="$(python3 - <<'PY'
import re, subprocess, sys

SCOPE = "TASKS/02-scope.md"

rows = []
section = "?"
for line in open(SCOPE, encoding="utf-8"):
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
    sys.exit(0)  # everything is built; stopping is allowed

# The next row to work is the FIRST unbuilt one in file order. Order is the
# rule: a later row started before an earlier one is drift, not progress.
nxt = unbuilt[0] if unbuilt else broken[0]

out = []
out.append(f"NOT DONE. {len(built)} of {len(rows)} rows built; {len(unbuilt)} unbuilt, {len(broken)} broken.")
out.append("")
out.append(f"NEXT ROW, IN ORDER — {nxt[0]} ({nxt[1]}), status {nxt[3]}:")
out.append(f"  {nxt[2][:400]}")
out.append("")
out.append("Do this now, in this order, and do not stop until it is green:")
out.append(f"  1. Write the FAILING test for {nxt[0]} and run it. Paste the red output.")
out.append("  2. Write the smallest code that passes it. Run the test. Paste the green output.")
out.append(f"  3. Mark {nxt[0]} BUILT in TASKS/02-scope.md with the file:line that satisfies it.")
out.append("  4. Then, and only then, move to the next row.")
out.append("")
out.append("Never mark a row built without running its test. Never revert or kill running work.")
print("\n".join(out))
PY
)"

if [ -n "$report" ]; then
  printf '%s\n' "$report" >&2
  exit 2
fi

exit 0
