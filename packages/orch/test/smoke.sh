#!/usr/bin/env bash
# Refactor-safety smoke test: exercise the public read-only commands against a
# self-contained fixture. No plexer and no daemon are required: the fixture is
# one live agent seeded through the store and presence writers a real spawn uses
# (test/smoke-seed.ts), and every check reads offline.
#
#   bash packages/orch/test/smoke.sh            compare against test/golden
#   UPDATE=1 bash packages/orch/test/smoke.sh   rewrite the goldens
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
GOLDEN_DIR=${GOLDEN_DIR:-$ROOT/test/golden}
TMP=$(mktemp -d "${TMPDIR:-/tmp}/orch-smoke.XXXXXX")
ORCH_FIXTURE="$TMP/orch"
BUN=$(command -v bun)
UPDATE=${UPDATE:-0}
AGENT_ID=smoke00001

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

mkdir -p "$ORCH_FIXTURE"
# No plexer on PATH, no launch credential, no ambient orch: every command sees
# exactly the fixture and nothing from the operator's own fleet. Every ORCH_*
# variable goes, so the launch env is spelled in src and nowhere here.
export PATH=/usr/bin:/bin
for name in $(compgen -e | grep '^ORCH_'); do unset "$name"; done
unset HERDR_ENV HERDR_SOCKET_PATH TMUX
export ORCH_DIR="$ORCH_FIXTURE"
# The caller must read as the OPERATOR. A harness session marker inherited from
# the shell that launched this script (src/adapters/session-env.ts) would make
# orch scope every command to a driving session that holds nothing.
unset PI_CODING_AGENT PI_SESSION_ID OMP_SESSION_ID CODEX_PID CLAUDECODE CLAUDE_CODE_SESSION_ID CLAUDE_PID

cat > "$ORCH_FIXTURE/settings.json" <<'EOF_CONFIG'
{"schemaVersion":1,"runtime":"node","enabled":{"adapters":["pi"],"backends":[]},"defaults":{"adapter":"pi"}}
EOF_CONFIG

# The smoke shell's own pid is the agent's recorded process: alive for exactly
# as long as the checks run, dead the moment the script exits.
"$BUN" "$ROOT/test/smoke-seed.ts" "$AGENT_ID" "$$"

sanitize() {
  # Normalize fields that vary between runs and machines. Some are absent from a
  # given command today; one sanitizer keeps additions safe.
  sed -E \
    -e 's#"pid"[[:space:]]*:[[:space:]]*[0-9]+#"pid": <PID>#g' \
    -e 's#"(ts|updatedAt|createdAt|startedAt|finishedAt|since|until)"[[:space:]]*:[[:space:]]*"[^"]+"#"\1": "<TIMESTAMP>"#g' \
    -e 's#\$[0-9]+(\.[0-9]+)?#\$0#g' \
    -e 's#"cost"[[:space:]]*:[[:space:]]*[0-9]+(\.[0-9]+)?#"cost": 0#g' \
    -e "s#${ORCH_FIXTURE//\//\\/}#<ORCH_DIR>#g" \
    -e 's#  [0-9]+[smhd]( |$)#  <AGE>\1#g'
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
  compare "$name" "$expected" "$actual"
}

# A command that must refuse: what it printed is the golden, and success is the failure.
check_fail() {
  local name=$1; shift
  local raw="$TMP/$name.raw" actual="$TMP/$name.actual" expected="$GOLDEN_DIR/$name"
  if "$@" >"$raw" 2>&1; then
    printf 'FAIL %s: command unexpectedly succeeded\n' "$name" >&2
    failures=$((failures + 1))
    return
  fi
  sanitize <"$raw" >"$actual"
  compare "$name" "$expected" "$actual"
}

compare() {
  local name=$1 expected=$2 actual=$3
  if [[ $UPDATE == 1 ]]; then
    mkdir -p "$(dirname "$expected")"
    cp "$actual" "$expected"
    printf 'UPDATED %s\n' "$name"
  elif ! diff -u "$expected" "$actual"; then
    printf 'FAIL %s: golden mismatch\n' "$name" >&2
    failures=$((failures + 1))
  else
    printf 'PASS %s\n' "$name"
  fi
}

ORCH=("$BUN" "$ROOT/bin/orch.ts")

check status.json "${ORCH[@]}" status --offline --json
check status.txt "${ORCH[@]}" status --offline
check help.txt "${ORCH[@]}" help
check panes.txt "${ORCH[@]}" panes
check tabs.txt "${ORCH[@]}" tabs
check runs.json "${ORCH[@]}" runs --json
check result.json "${ORCH[@]}" result "$AGENT_ID" --json
check review-list.json "${ORCH[@]}" review list --json
check queue-list.json "${ORCH[@]}" queue list --json
check space-list.txt "${ORCH[@]}" space list
# questions reads through orchd; with no daemon it must say so and exit non-zero.
check_fail questions.txt "${ORCH[@]}" questions

if (( failures )); then
  printf 'FAIL smoke (%d check(s) failed)\n' "$failures" >&2
  exit 1
fi
printf 'PASS smoke: status, help, panes, tabs, runs, result, review, queue, space, questions\n'
