#!/usr/bin/env bash
# Refactor-safety smoke test: exercise the public read-only commands against a
# self-contained presence-protocol fixture.  No herdr server is required.
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
GOLDEN_DIR="$ROOT/test/golden"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/orch-smoke.XXXXXX")
ORCH_FIXTURE="$TMP/orch"
BIN_DIR="$TMP/bin"
BUN=$(command -v bun)
UPDATE=${UPDATE:-0}

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

mkdir -p "$ORCH_FIXTURE/agents/w0:p1" "$BIN_DIR"
# Deliberately hide herdr: this proves status/questions/help work on a host
# without it, while panes is checked only against its current local fallback.
export PATH="$BIN_DIR:/usr/bin:/bin"
export ORCH_DIR="$ORCH_FIXTURE"

cat > "$ORCH_FIXTURE/agents/w0:p1/status.json" <<EOF_STATUS
{
  "schema": 1,
  "paneId": "w0:p1",
  "pid": $$,
  "state": "working",
  "model": { "provider": "openai-codex", "id": "gpt-5" },
  "thinking": "medium",
  "cost": 12.34,
  "context": { "percent": 42 },
  "task": "Exercise the smoke fixture",
  "lastText": "Fixture is healthy",
  "tokens": { "input": 10, "output": 20 },
  "turns": 3,
  "ts": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF_STATUS
cat > "$ORCH_FIXTURE/agents/w0:p1/result.json" <<'EOF_RESULT'
{"text":"Fixture result","ts":"2020-01-01T00:00:00.000Z"}
EOF_RESULT
cat > "$ORCH_FIXTURE/agents/w0:p1/question.json" <<EOF_QUESTION
{"question":"Proceed with the fixture?","ts":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF_QUESTION

sanitize() {
  # Normalize fields that may vary between runs/machines.  Some are absent
  # from a given command today, but keeping one sanitizer makes additions safe.
  sed -E \
    -e 's#"pid"[[:space:]]*:[[:space:]]*[0-9]+#"pid": <PID>#g' \
    -e 's#"ts"[[:space:]]*:[[:space:]]*"[^"]+"#"ts": "<TIMESTAMP>"#g' \
    -e 's#\$[0-9]+(\.[0-9]+)?#\$0#g' \
    -e 's#"cost"[[:space:]]*:[[:space:]]*[0-9]+(\.[0-9]+)?#"cost": 0#g' \
    -e "s#${ORCH_FIXTURE//\//\\/}#<ORCH_DIR>#g" \
    -e 's#(w[0-9A-Za-z_-]+:p[0-9A-Za-z_-]+)#<PANE_ID>#g' \
    -e 's#  [0-9]+[smhd]$#  <AGE>#g'
}

failures=0
check() {
  local name=$1; shift
  local raw="$TMP/$name.raw" actual="$TMP/$name.actual" expected="$GOLDEN_DIR/$name"
  if "$@" >"$raw" 2>"$TMP/$name.stderr"; then
    :
  else
    local rc=$?
    printf 'FAIL %s: command exited %s\n' "$name" "$rc" >&2
    cat "$TMP/$name.stderr" >&2
    failures=$((failures + 1))
    return
  fi
  sanitize <"$raw" >"$actual"
  if [[ $UPDATE == 1 ]]; then
    cp "$actual" "$expected"
    printf 'UPDATED %s\n' "$name"
  elif ! diff -u "$expected" "$actual"; then
    printf 'FAIL %s: golden mismatch\n' "$name" >&2
    failures=$((failures + 1))
  else
    printf 'PASS %s\n' "$name"
  fi
}

check status.json "$BUN" "$ROOT/bin/orch.ts" status --json
# cmdQuestions currently has no --json mode; plain output is intentional.
check questions.txt "$BUN" "$ROOT/bin/orch.ts" questions
check help.txt "$BUN" "$ROOT/bin/orch.ts" help
# With herdr unreachable, current code still renders presence-only entries.
# If this command later becomes an explicit no-herdr failure, its message and
# exit status should be captured deliberately rather than requiring herdr.
check panes.txt "$BUN" "$ROOT/bin/orch.ts" panes

if (( failures )); then
  printf 'FAIL smoke (%d check(s) failed)\n' "$failures" >&2
  exit 1
fi
printf 'PASS smoke: status, questions, help, panes\n'
