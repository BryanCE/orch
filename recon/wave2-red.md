# Wave 2 RED verification

Against `/tmp/orch-red` at HEAD (`13c3830`), each changed/new test file was run with `orch lock run -- bun test ...`.

| Test | File | RED against HEAD? |
|---|---|---|
| starts an authority-bearing herdr agent with the adapter command | test/backend-herdr.test.ts | yes |
| agent_not_ready keeps the pane and does not close it | test/backend-herdr.test.ts | yes |
| pane and tab creation always preserves focus | test/backend-herdr.test.ts | no |
| a handed-over pane is launched into directly, never split or closed | test/backend-herdr.test.ts | yes |
| a grouped spawn with no planned target splits a pane already in that tab, never the caller | test/backend-herdr.test.ts | yes |
| a same-tab re-seat bounces through a throwaway tab so herdr executes it | test/backend-herdr.test.ts | yes |
| adopts herdr's replacement pane id after move | test/backend-herdr.test.ts | yes |
| refuses a live herdr agent name before start | test/backend-herdr.test.ts | yes |
| reads recent unwrapped pane output | test/backend-herdr.test.ts | yes |
| paneHost.open splits the requested target with cwd and environment | test/backend-tmux.test.ts | yes |
| includes an unleased agent spawned by this session | test/commands-events.test.ts | yes |
| excludes an agent spawned by a different session | test/commands-events.test.ts | yes |
| --any-agent passes agents from both sessions | test/commands-events.test.ts | yes |
| abort proceeds with a foreign live-holder lease | test/commands-lease.test.ts | no |
| close proceeds with a foreign live-holder lease | test/commands-lease.test.ts | no |
| refuses an invalid name before resolving or creating a workspace | test/commands-spawn.test.ts | yes |
| collects repeated prompts in agent order | test/commands-spawn.test.ts | yes |
| presence transitions resolve the human name before emission | test/daemon-events.test.ts | no |
| presence transitions use the normalized agent name after rename | test/daemon-events.test.ts | yes |
| doctor distinguishes registered-but-dead from live-and-registered | test/daemon-registration.test.ts | yes |
| evicts a registration whose process instance no longer matches | test/daemon-registration.test.ts | yes |
| routes a different orch dir to its own runtime files | test/daemon-registration.test.ts | yes |
| warns when a notifier omits done from its on list | test/doctor-checks.test.ts | yes |
| yes mode leaves existing settings.json byte-identical | test/doctor-settings-preservation.test.ts | no |
| uses a non-empty agent name and preserves shell command as one argv value | test/herdr-notify-hardening.test.ts | yes |
| falls back to a valid name when the identity key contains herdr-invalid separators | test/herdr-notify-hardening.test.ts | yes |
| resubscribes and receives events after the daemon restarts | test/orchd-rpc-reconnect.test.ts | yes |
| close --all closes all managed records regardless of owner | test/owner-scoping.test.ts | no |
| an orch-spawned orchestrator is named by its own agent name and harness | test/peer-identity.test.ts | no |
| --build dry-run never names a path inside ORCH_DIR | test/reset-build-safety.test.ts | no |
| reaps expired agents with no presence dir and releases registry/name reservation | test/retention.test.ts | no |
| identity is an opaque minted id — never the name, never the pane handle | test/spawn-identity.test.ts | no |
| a name freed by a dead agent is reusable, and the two agents differ in identity | test/spawn-identity.test.ts | no |
| a dead agent frees its name and its index | test/spawn-names.test.ts | yes |
| continues past the highest live index so a live fleet is grown, not collided with | test/spawn-names.test.ts | yes |
| rejects names outside herdr's naming rule | test/spawn-names.test.ts | yes |
| accepts lowercase names with hyphens and underscores | test/spawn-names.test.ts | yes |
| a refused cmdSpawn makes no name, worktree, registry, or queue mutation | test/spawn-policy.test.ts | no |
| selectSpawnedRecords joins every row to its owner in one query | test/store-spawned.test.ts | no |
| a lone pane anchors the split to the only pane | test/tiling.test.ts | yes |
| pi worker header permits only locked heavy commands through orch | test/worker-prompt.test.ts | yes |

## Not-red tests (13)

- `pane and tab creation always preserves focus` — asserts an unchanged focus-preservation path; smallest rewrite: assert the newly required launch ordering/target contract instead.
- `abort proceeds with a foreign live-holder lease` — pre-existing unconditional abort behavior; smallest rewrite: assert the lease is foreign and the command still bypasses the gate while recording cleanup.
- `close proceeds with a foreign live-holder lease` — pre-existing unconditional close behavior; smallest rewrite: assert foreign ownership plus pane/process cleanup, not merely success.
- `presence transitions resolve the human name before emission` — existing name resolution already passed; smallest rewrite: assert the normalized post-rename value (the adjacent changed test).
- `yes mode leaves existing settings.json byte-identical` — safety invariant already held on HEAD; smallest rewrite: assert diagnostic mode never invokes a settings writer (spy on the writer).
- `close --all closes all managed records regardless of owner` — existing close-all semantics; smallest rewrite: include mixed owners and assert every record is removed, including foreign-owned rows.
- `an orch-spawned orchestrator is named by its own agent name and harness` — identity behavior already present; smallest rewrite: assert the new provenance/reply-address distinction.
- `--build dry-run never names a path inside ORCH_DIR` — existing dry-run guard; smallest rewrite: inject an ORCH_DIR path and assert no deletion target is emitted.
- `reaps expired agents with no presence dir and releases registry/name reservation` — retention behavior already present; smallest rewrite: assert both spawned-row deletion and name reuse after the sweep.
- `identity is an opaque minted id — never the name, never the pane handle` — identity invariant already present; smallest rewrite: assert the same minted key is propagated to pane env, backend spawn, and registry.
- `a name freed by a dead agent is reusable, and the two agents differ in identity` — existing reaping behavior; smallest rewrite: assert the old key is absent from every ownership/registry table.
- `a refused cmdSpawn makes no name, worktree, registry, or queue mutation` — refusal atomicity already held; smallest rewrite: assert no mutation after the new cap/depth refusal path specifically.
- `selectSpawnedRecords joins every row to its owner in one query` — query shape passed on HEAD; smallest rewrite: add a second owner and assert per-row owner scoping (not just join presence).

**Totals: 41 new/changed tests, 28 RED, 13 not-red.**
