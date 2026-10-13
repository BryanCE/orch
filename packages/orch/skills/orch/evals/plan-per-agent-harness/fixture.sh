#!/usr/bin/env bash
# Unpack the orch source at the commit before per-agent --harness landed into the run's
# workspace. The skill itself stays out, so the baseline arm cannot read it from the fixture.
set -euo pipefail
case_dir=$(dirname "$(readlink -f "$0")")
repo_root=$(git -C "$case_dir" rev-parse --show-toplevel)
git -C "$repo_root" archive 0004d9bf2c4bad7573c4c02e703a0985da41080f -- CLAUDE.md packages/orch/src packages/orch/test | tar -x
