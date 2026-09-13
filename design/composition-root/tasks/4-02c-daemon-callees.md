# 4-02c-daemon-callees

Owns: `src/daemon/orchd.ts`. Chain: after `4-02b`, context kept.

Goal: the last global reaches and the 3a callee signatures.

Do:
1. `:197`, `:217` `decisionLogger(orchDir())` → `decisionLogger(directory)`; thread `directory` into the enclosing function if it lacks it.
2. Every callee whose signature changed in wave 3 gets what it now requires: `daemonOutage(directory)`, `daemonLockPid(directory)`, the mail cross-space function (`settings.currentOrNull()`), the `daemon/events.ts` fan-out (`settings`), `control/dispatch` (`directory`, `settings.current()`), `presence/store` functions (`directory`). The 3a results are piped into this session; the callee files are the truth.
3. `daemonLogger = loggerFor(directory, settings.logging?.level)` at the original `:658`: leave `loggerFor` as is, pass `services.settings.current().logging?.level`. Put `FOLLOW-UP: daemon logger vs services.logger` in the report.
4. Confirm no `orchDir(`, `loadSettings(`, `loadSettingsOrNull(`, `getSettings(` remains in the file by grep. Paste the grep in the report.

Check: lint, tc, and `bun --filter @bryance/orch check:bridge`. Tests: none (Bryan-only).
