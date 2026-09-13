# 10-settings-manager

Owns: `src/settings/manager.ts` (new), `src/settings/read.ts` (only `loadSettingsOrNull` and `loadSettings`)

Requires tasks 00, 01, 02 landed (they have).

Goal: the `SettingsManager` from `src/types/services.ts`, built over a `SettingsStorage`. Then `loadSettings` and `loadSettingsOrNull` become thin wrappers over it so every existing caller keeps working while the fleet migrates them.

Do:

1. Create `src/settings/manager.ts`:
   ```ts
   import type { SettingsManager } from "../types/services.ts";
   import type { OrchSettings } from "../types/settings.ts";
   import { fileSettingsStorage, inMemorySettingsStorage, type SettingsStorage } from "./storage.ts";
   import { absentSettingsMessage, parseSettingsText, settingsFromFile } from "./read.ts";

   /** One parse per process until `reload()`. A malformed file throws from `currentOrNull`
    *  every time it is asked, never caches the failure, so the next call after a fix succeeds. */
   export function createSettingsManager(storage: SettingsStorage): SettingsManager {
     let held: { value: OrchSettings | null } | undefined;
     const currentOrNull = (): OrchSettings | null => {
       if (held === undefined) {
         const text = storage.read();
         held = { value: text === null ? null : settingsFromFile(storage.file, parseSettingsText(text, storage.file)) };
       }
       return held.value;
     };
     return {
       file: storage.file,
       currentOrNull,
       current: () => {
         const value = currentOrNull();
         if (value === null) throw new Error(absentSettingsMessage(storage.file));
         return value;
       },
       reload: () => { held = undefined; return currentOrNull(); },
     };
   }

   export function fileSettingsManager(orchDir: string): SettingsManager {
     return createSettingsManager(fileSettingsStorage(orchDir));
   }

   export function inMemorySettingsManager(text: string | null, file: string): SettingsManager {
     return createSettingsManager(inMemorySettingsStorage(text, file));
   }
   ```
   Check whether `settingsFromFile` and `parseSettingsText` take `(file, root)` and `(text, file)` respectively as task 01 specified; match whatever `read.ts` now exports.

2. In `src/settings/read.ts`, rewrite the bodies of the two loaders and nothing else:
   ```ts
   export function loadSettingsOrNull(orchDir: string): OrchSettings | null {
     return fileSettingsManager(orchDir).currentOrNull();
   }
   export function loadSettings(orchDir: string): OrchSettings {
     return fileSettingsManager(orchDir).current();
   }
   ```
   Keep their doc comments. Delete the legacy `config.toml` check that used to live in `loadSettingsOrNull`; `fileSettingsStorage` owns it now. If `path` or `filesystem` imports become unused, remove them. `read.ts` importing `manager.ts` while `manager.ts` imports `read.ts` is a cycle of functions only, no top-level evaluation, so it is safe; if tc or oxlint object, move the two wrappers' import to a lazy `import()`-free form by having `manager.ts` not import `read.ts` at module top but receive the three functions as parameters. Report which you did.

Check: lint, tc. Tests: `grep -l "settings/read" test/*.ts` list.
