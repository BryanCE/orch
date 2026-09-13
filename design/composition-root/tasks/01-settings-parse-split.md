# 01-settings-parse-split

Owns: `src/settings/read.ts`

Goal: split disk reading from parsing so a settings manager can parse text that came from anywhere. Every existing export keeps its name and behaviour; this task only adds pure functions and routes the existing ones through them.

Do, in `src/settings/read.ts`:

1. Extract `parseSettingsText`. `readSettingsFile(file)` (line 40) currently does readFileSync, ENOENT→null, `JSON.parse`, `SETTINGS_FILE_SCHEMA.safeParse`, and renders every rejection as guidance. Move everything from the `JSON.parse` onward into:
   ```ts
   /** Parse and schema-validate settings text. `file` is only used in messages. Throws loudly on any defect. */
   export function parseSettingsText(text: string, file: string): SettingsFile
   ```
   `readSettingsFile` becomes: read the file, return null on ENOENT, rethrow other errors, `return parseSettingsText(text, file)`.

2. Extract `settingsFromFile`. `loadSettingsOrNull` (line 215) ends with `requireEnabledComposition(file, root)` and an object literal `{ runtime, enabled, ...settingsValues(root) }`. Move those two into:
   ```ts
   /** A validated file root to the fully-populated settings every reader uses. */
   export function settingsFromFile(file: string, root: SettingsFile): OrchSettings
   ```
   `loadSettingsOrNull` calls it. Leave the legacy `config.toml` check in `loadSettingsOrNull` untouched for now; task 10 removes it.

3. Extract `absentSettingsMessage`. The error text in `loadSettings` (line 237, the string starting `${settingsPath(orchDir)} does not exist`) becomes:
   ```ts
   export function absentSettingsMessage(file: string): string
   ```
   taking the file path, not the orch dir. `loadSettings` calls it with `settingsPath(orchDir)`.

4. Extract `logLevelFor`. `settingsLogLevel(directory)` (line 321) reads `ORCH_LOG_LEVEL`, then loads settings quietly, then falls back to `SETTINGS_DEFAULTS.logging.level`. Split into:
   ```ts
   /** ORCH_LOG_LEVEL outranks the file; an unrecognised env value does not. */
   export function logLevelFor(settings: OrchSettings | null): LogLevel
   ```
   holding the env read and the defaults fallback, and `settingsLogLevel(directory)` becomes the quiet load followed by `return logLevelFor(settings)`.

Nothing else changes. No call site outside this file changes.

Check: lint, tc. Tests: every file under `test/` that imports `settings/read.ts`. Find them with `grep -l "settings/read" test/*.ts` and pass that list to the test command.
