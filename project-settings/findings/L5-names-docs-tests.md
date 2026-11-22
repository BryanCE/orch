## 1. `projectRoot` occurrences
- `packages/orch/src/policy/spawner.ts:3` — import of function `projectRoot()`.
- `packages/orch/src/policy/spawner.ts:33` — comment mentioning function.
- `packages/orch/src/policy/spawner.ts:54` — function call in environment assignment.
- `packages/orch/src/util.ts:249` — function definition.
- `packages/orch/src/daemon/client/protocol.ts:647` — field named `projectRoot`.
- `packages/orch/src/agent/presence.ts:10` — import of function.
- `packages/orch/src/agent/presence.ts:91` — function call initializing `project`.
- `packages/orch/src/agent/peers.ts:10` — import of function.
- `packages/orch/src/agent/peers.ts:29` — function call; `projectRoot` also appears as request field.
- `packages/orch/src/agent/peers.ts:35` — function call; `projectRoot` also appears as request field.
- `packages/orch/src/daemon/server/handlers/table.ts:110` — field read `params.projectRoot`.
- `packages/orch/extensions/claude/index.ts:20` — import of function.
- `packages/orch/extensions/claude/index.ts:74` — function call initializing `project`.
- `packages/orch/extensions/codex/index.ts:19` — import of function.
- `packages/orch/extensions/codex/index.ts:44` — function call initializing `project`.
- `packages/orch/test/helpers/daemon-client.ts:28` — field read `params.projectRoot`.
- `packages/orch/test/backend-herdr.test.ts:11` — import of function.
- `packages/orch/test/backend-herdr.test.ts:193` — call in `ORCH_PROJECT` test environment value.
- `packages/orch/test/backend-herdr.test.ts:223` — call in `ORCH_PROJECT` test environment value.
- `packages/orch/test/herdr-notify-hardening.test.ts:7` — import of function.
- `packages/orch/test/herdr-notify-hardening.test.ts:105` — call in assertion.
- `packages/orch/test/backend-tmux.test.ts:8` — import of function.
- `packages/orch/test/backend-tmux.test.ts:360` — call in expected environment.
- `packages/orch/test/backend-tmux.test.ts:461` — comment mentioning function.
- `packages/orch/test/peer-identity.test.ts:31` — field read `params.projectRoot`.
- `packages/orch/test/peer-identity.test.ts:51` — field read `params.projectRoot`.
- `packages/orch/test/peer-identity.test.ts:249` — field read `params.projectRoot`.

## 2. `ORCH_PROJECT` occurrences
- `packages/orch/src/policy/spawner.ts:15` — environment variable name in inherited-variable list.
- `packages/orch/src/policy/spawner.ts:31` — comment.
- `packages/orch/src/policy/spawner.ts:54` — object property set to `projectRoot()`.
- `packages/orch/src/util.ts:244` — comment.
- `packages/orch/src/util.ts:250` — environment variable read.
- `packages/orch/src/shared/session-env.ts:39` — environment variable name in shim allowlist.
- `packages/orch/test/backend-herdr.test.ts:193` — test environment.
- `packages/orch/test/backend-herdr.test.ts:223` — test environment.
- `packages/orch/test/herdr-notify-hardening.test.ts:105` — assertion.
- `packages/orch/test/backend-tmux.test.ts:360` — expected environment.
- `packages/orch/test/backend-tmux.test.ts:453` — environment read.
- `packages/orch/test/backend-tmux.test.ts:455` — environment set.
- `packages/orch/test/backend-tmux.test.ts:457` — environment deleted.
- `packages/orch/test/backend-tmux.test.ts:458` — environment restored.
- `packages/orch/test/backend-tmux.test.ts:461` — comment.
- `packages/orch/test/backend-tmux.test.ts:466` — assertion.
- `packages/orch/test/backend-tmux.test.ts:467` — assertion.
- `packages/orch/test/backend-tmux.test.ts:473` — assertion.

## 3. Presence `project`
```ts
// packages/orch/src/types/presence.ts:12-14, 83
export interface PresenceEntry {
  project?: string | null;
}
```
- `packages/orch/src/agent/presence.ts:91` — `createAgentPresence` initializes `project: projectRoot()`.
- `packages/orch/extensions/claude/index.ts:74` — presence object sets `project: projectRoot()`.
- `packages/orch/extensions/codex/index.ts:44` — presence object sets `project: projectRoot()`.

## 4. `sourceFor` and editor save chain
```ts
// packages/orch/src/settings/shell/state.ts:19
function sourceFor(spec: SettingSpec, raw: Record<string, unknown>): SettingSource {
  return rawValue(raw, spec.key) === undefined ? "default" : "settings.json";
}
```
- `packages/orch/src/settings/shell/edit.ts:100` — `browseOnce` registers `prompt.on("key", ...)` and handles key input; Enter opens the focused row.
- `packages/orch/src/settings/shell/edit.ts:147` — `editText` parses submitted text and calls `commitAndFlush`.
- `packages/orch/src/settings/shell/state.ts:173` — `commitAndFlush` applies reducer commit and iterates pending writes.
- `packages/orch/src/settings/shell/state.ts:177` — each pending key/value goes to `writeRegisteredSetting(manager, pending.key, pending.value)`.

## 5. Settings help lines
- `packages/orch/help/settings.md:10` — “An agent may write only the keys the user granted it: by default `workers.verify_commands`”
- `packages/orch/help/settings.md:11` — “and `locked_commands.commands`. A refusal names the keys it may set. To widen that, ask the”
- `packages/orch/help/settings.md:5` — “The file is `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON the user”
- `packages/orch/help/settings.md:6` — “may edit by hand. Every number orch uses is a setting there.”

## 6. README mentions
- `packages/orch/README.md:152` — “which commands verify its work (`workers.verify_commands`).”
- `packages/orch/README.md:235` — `"locked_commands": { "commands": ["npm test"], "applies_to": ["orch", "slave"] }`
- `packages/orch/README.md:261` — “- `workers.verify_commands`: the commands the worker header tells a worker to run to check”
- `packages/orch/README.md:263` — “- `locked_commands`: commands that only one agent on the machine may run at a time (for”

## 7. Skill reference `orch settings` lines
- `packages/orch/skills/orch/reference/fleet.md:5` — “Before the first wave, set the checks from the project's scripts. Keep what `orch settings`”
- `packages/orch/skills/orch/reference/fleet.md:9` — `orch settings workers.verify_commands '["bunx oxlint"]'`
- `packages/orch/skills/orch/reference/fleet.md:10` — `orch settings locked_commands.commands '["bun test", "bunx tsc"]'`
- `packages/orch/skills/orch/reference/commands.md` — not found; searched for `orch settings`.

## 8. `settings` command registry
- `packages/orch/src/commands/registry.ts:431-433` — command flags: `--harness`, `--plexer`.
- `packages/orch/src/commands/registry.ts:435-443` — `models`: `--harness`, model flag, `--refresh`.
- `packages/orch/src/commands/registry.ts:445-450` — `thinking`: `--harness`, `--clear`.
- `packages/orch/src/commands/registry.ts:452-466` — `skills`: flags not present in the captured registry excerpt.
- `packages/orch/src/commands/registry.ts:467-475` — `notify`: `list` (none), `add` (`--only`, open flags), `remove` (none); `add` also accepts declared open field flags.
- `packages/orch/src/commands/registry.ts:477-478` — `grant <key>` (none), `revoke <key>` (none).

## 9. Tests importing target modules / council files
- `broker-governance.test.ts` — `src/daemon/server/handlers/write.ts`.
- `hosts-link.test.ts` — `write.ts`, `drive.ts`.
- `helpers/far-orchd.ts` — `drive.ts`.
- `control-dispatch.test.ts` — `drive.ts`.
- `acp-far.test.ts` — `drive.ts`, `write.ts`.
- `lease-authority.test.ts` — `write.ts`.
- `command-paths.test.ts` — `src/worker-prompt.ts`.
- `held-lifecycle.test.ts` — `drive.ts`.
- `acp-agents.test.ts` — `write.ts`.
- `command-lock.test.ts` — `src/daemon/server/handlers/command-lock.ts`.
- `port-seam-channel.test.ts` — `write.ts`.
- `commands-spawn.test.ts` — `src/worker-prompt.ts`.
- `commands-lease.test.ts` — `write.ts`.
- `held-drive.test.ts` — `write.ts`, `drive.ts`.
- `held-spawn.test.ts` — `write.ts`.
- `worker-prompt.test.ts` — `src/worker-prompt.ts`.
- `dispatch-prompt-file.test.ts` — `src/worker-prompt.ts`.
- `notify-events-format.test.ts` — `src/worker-prompt.ts`.
- `commands-control.test.ts` — `src/worker-prompt.ts`.
- `daemon-decision-trail.test.ts` — `write.ts`.
- `answer-dispatch.test.ts` — `write.ts`.
- Council-named files: `council-command.test.ts`, `council-handlers.test.ts`, `council-lineup-pick.test.ts`, `council-lineup.test.ts`, `council-prompt.test.ts`, `council-round-file.test.ts`, `council-score-run.test.ts`, `council-scores-render.test.ts`.
