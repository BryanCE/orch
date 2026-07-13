# Tasks: fix-orch-steering-bugs

## 1. Rebase and events keep-alive

- [ ] 1.1 Confirm the `make-orch-general-purpose` notifications work has landed its `cmdEvents` edits (`--notify`, `unref` removal); if the `unref` removal landed there, verify it, else remove `safety.unref?.()` — then prove the spec scenario: start `orch events --all` against an empty fake `$ORCH_DIR`, create an agent dir 5s later, flip its state, observe the emitted line

## 2. Tab-label resolution

- [ ] 2.1 Add a `resolveTab(target)` helper (tab-id regex → unique label match from `herdr tab list` → fall through to `resolveTarget()`; ambiguous label dies listing candidate tab ids) and use it in `cmdTile`, `cmdTab`, `cmdMove`; update help text and verify `orch tile <label>` + ambiguous-label failure by hand

## 3. Bridge readiness wait and honest model acks

- [ ] 3.1 Add `waitForBridge(paneKey, timeoutMs = 10_000)` (250ms poll for presence dir + readable status.json; timeout error names the wait) and wire into `cmdModel` with a `--no-wait` opt-out
- [ ] 3.2 Rework `cmdModel` acks: read current model first — equal → `already <model>` exit 0; after write poll for reflection — reflected → `old → new` exit 0; unreflected → exit 1 naming requested and still-current model; update help text and changelog note (exit-code change)
- [ ] 3.3 Verify by hand: spawn a pane and run `orch model` within 1s (no sleep, succeeds); repeat with the same value (no-op wording); point at a pane with pi closed (exit 1 after wait)

## 4. Spawn-time model pinning

- [ ] 4.1 Add `--model` to `cmdSpawn` and `cmdTile`: after pane creation, concurrently `waitForBridge` each pane and apply the model via the `cmdModel` core; per-pane warning on failure, nonzero exit if any pin failed; update help text
- [ ] 4.2 Verify by hand: `orch spawn 2 --model openai-codex/gpt-5.6-terra:medium` shows both panes on the model in `orch status`; kill pi in one pane mid-boot to see the warning + nonzero exit; bump patch version
