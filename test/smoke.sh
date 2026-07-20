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
# Keep herdr unavailable for the read-only checks.  Spawn precedence checks
# opt into the deterministic fake below, so no live herdr server is needed.
export PATH="$BIN_DIR:/usr/bin:/bin"
export ORCH_DIR="$ORCH_FIXTURE"
unset ORCH_ADAPTER ORCH_BACKEND ORCH_MODEL ORCH_SPAWN_CAP ORCH_WORKTREE

cat > "$BIN_DIR/herdr" <<'EOF_HERDR'
#!/usr/bin/env bash
set -euo pipefail
[[ ${ORCH_SMOKE_FAKE_HERDR:-0} == 1 ]] || exit 1
case "${1:-}" in
  pane)
    case "${2:-}" in
      list) printf '%s\n' '{"panes":[{"pane_id":"w0:p2","workspace_id":"ws-smoke","tab_id":"t-smoke"}]}' ;;
      layout) printf '%s\n' '{"layout":{"tab_id":"t-smoke","panes":[{"pane_id":"w0:p2","rect":{"width":80,"height":24,"x":0,"y":0}}]}}' ;;
      run|send-keys|process-info) printf '%s\n' '{}' ;;
      split) printf '%s\n' '{"pane":{"pane_id":"w0:p3"}}' ;;
      *) exit 1 ;;
    esac
    ;;
  tab)
    [[ ${2:-} == create ]] && printf '%s\n' '{"tab":{"label":"work"},"root_pane":{"pane_id":"w0:p2"}}' || exit 1
    ;;
  agent)
    case "${2:-}" in
      list) printf '%s\n' '{"agents":[{"pane_id":"w0:p2","name":"work-1"}]}' ;;
      rename) printf '%s\n' '{}' ;;
      *) exit 1 ;;
    esac
    ;;
  *) exit 1 ;;
esac
EOF_HERDR
chmod +x "$BIN_DIR/herdr"

cat > "$ORCH_FIXTURE/settings.json" <<'EOF_CONFIG'
{"schemaVersion":1,"runtime":"node","installed":{"adapters":["pi"],"backends":[]},"defaults":{"adapter":"pi"},"fleet":{"spawn_cap":1}}
EOF_CONFIG

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
check status-all.json "$BUN" "$ROOT/bin/orch.ts" status --all --json
# cmdQuestions currently has no --json mode; plain output is intentional.
check questions.txt "$BUN" "$ROOT/bin/orch.ts" questions
check questions-all.txt "$BUN" "$ROOT/bin/orch.ts" questions --all
check help.txt "$BUN" "$ROOT/bin/orch.ts" help
# With herdr unreachable, current code still renders presence-only entries.
# If this command later becomes an explicit no-herdr failure, its message and
# exit status should be captured deliberately rather than requiring herdr.
check panes.txt "$BUN" "$ROOT/bin/orch.ts" panes
check panes-all.txt "$BUN" "$ROOT/bin/orch.ts" panes --all
check tabs-all.txt "$BUN" "$ROOT/bin/orch.ts" tabs --all
check review-list.json "$BUN" "$ROOT/bin/orch.ts" review list --json
check queue-list.json "$BUN" "$ROOT/bin/orch.ts" queue list --json

# Registry entries provide the adapter fallback when presence status predates
# the adapter field. Keep this separate from status --json's existing golden.
printf '%s\n' '{"pane":"w0:p1","ts":"2020-01-01T00:00:00.000Z","adapter":"codex"}' > "$ORCH_FIXTURE/spawned.jsonl"
check status-adapter.txt "$BUN" "$ROOT/bin/orch.ts" status --local

check_fail() {
  local name=$1; shift
  local raw="$TMP/$name.raw" actual="$TMP/$name.actual" expected="$GOLDEN_DIR/$name"
  if "$@" >"$raw" 2>"$TMP/$name.stderr"; then
    printf 'FAIL %s: command unexpectedly succeeded\n' "$name" >&2
    failures=$((failures + 1))
    return
  fi
  sanitize <"$TMP/$name.stderr" >"$actual"
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

# Config precedence is observable through spawn's cap guard and the fake herdr
# lifecycle. Successful launches use a custom command so they do not wait for
# a real pi bridge.
check_fail spawn-cap-config.txt "$BUN" "$ROOT/bin/orch.ts" spawn 2 --workspace ws-smoke
check spawn-cap-flag-config.txt env ORCH_SMOKE_FAKE_HERDR=1 "$BUN" "$ROOT/bin/orch.ts" spawn 2 --workspace ws-smoke --spawn-cap 2 --cmd claude
check spawn-cap-env.txt env ORCH_SMOKE_FAKE_HERDR=1 ORCH_SPAWN_CAP=2 "$BUN" "$ROOT/bin/orch.ts" spawn 2 --workspace ws-smoke --cmd claude
check_fail spawn-cap-flag-env.txt env ORCH_SMOKE_FAKE_HERDR=1 ORCH_SPAWN_CAP=2 "$BUN" "$ROOT/bin/orch.ts" spawn 2 --workspace ws-smoke --spawn-cap 1

# With no config file, the built-in cap (8) is observable too.
mv "$ORCH_FIXTURE/config.toml" "$ORCH_FIXTURE/config.toml.saved"
check_fail spawn-cap-default.txt "$BUN" "$ROOT/bin/orch.ts" spawn 9 --workspace ws-smoke
mv "$ORCH_FIXTURE/config.toml.saved" "$ORCH_FIXTURE/config.toml"

if (( failures )); then
  printf 'FAIL smoke (%d check(s) failed)\n' "$failures" >&2
  exit 1
fi
printf 'PASS smoke: status, questions, help, panes, review, queue, adapter, config precedence\n'
