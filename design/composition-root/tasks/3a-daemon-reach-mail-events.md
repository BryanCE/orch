# 3a-daemon-reach-mail-events

Owns: `src/daemon/reach.ts`, `src/daemon/mail.ts`, `src/daemon/events.ts`. Follow `3a-README.md`.

Sites:
- `reach.ts:36` `daemonLockPid(directory = orchDir())` → required
- `reach.ts:134` `daemonOutage(directory = orchDir())` → required
- `mail.ts:20` `loadSettingsOrNull(directory)?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space` → the function takes `settings: OrchSettings | null` per README rule 4, keeping the `??`
- `events.ts:485` `const settings = loadSettings(orchDir);` → the enclosing function takes `settings: SettingsManager` and reads `settings.current()` here, since the daemon fan-out is long-lived and must see reloads

Do not touch `src/daemon/orchd.ts` or `src/daemon/work-loop.ts`; wave 4 owns them. List them under CALLERS.
