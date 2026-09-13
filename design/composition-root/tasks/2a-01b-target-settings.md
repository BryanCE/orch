# 2a-01b-target-settings

Owns: `src/commands/target.ts`. Chain: after `2a-01a`, context kept.

Goal: only the `loadSettings` reaches in this file.

Sites (line numbers from before `2a-01a`; find them by the code, not the number):
- `parseTarget(target, loadSettings(orchDir()).hosts)` → the enclosing function takes `hosts: OrchSettings["hosts"]` if hosts is all it needs from settings; if it also needs `orchDir` from `2a-01a`, it takes `services: OrchDirService & SettingsService` and reads `services.settings.current().hosts` and `services.orchDir`. One shape per function.
- `loadSettings(orchDir()).hosts[hostName]` → same rule.

Import `OrchSettings` from `../types/settings.ts` and the service types from `../types/services.ts` as needed. Remove the `loadSettings` import when unused.

Check: lint, tc on this file. Tests: none named.
Report changed exported signatures under `CALLERS:`.
