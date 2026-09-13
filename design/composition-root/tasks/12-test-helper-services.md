# 12-test-helper-services

Owns: `test/helpers/services.ts` (new), `test/helpers/settings.ts`

Requires tasks 10 and 11 landed (they have).

Goal: a test helper that builds a `Services` from an in-memory settings fixture, so tests stop writing `settings.json` to a temp dir and repointing `ORCH_DIR` for code that only needs settings.

Do:

1. In `test/helpers/settings.ts`, split `writeSettingsFixture` so the fixture body is reusable:
   ```ts
   /** The settings.json text a fixture would write. Same shape rules as `writeSettingsFixture`. */
   export function settingsFixtureText(settings: Record<string, unknown> = {}): string
   ```
   holding everything from `deriveEnabled` through `JSON.stringify(...) + "\n"`. `writeSettingsFixture` becomes mkdir + `writeFileSync(file, settingsFixtureText(settings))` + return file. Behaviour identical.

2. Create `test/helpers/services.ts`:
   ```ts
   import { join } from "node:path";
   import { createServices } from "../../src/services.ts";
   import { inMemorySettingsManager } from "../../src/settings/manager.ts";
   import type { Services } from "../../src/types/services.ts";
   import { settingsFixtureText } from "./settings.ts";

   export interface TestServicesOptions {
     orchDir: string;
     /** Fixture body as `writeSettingsFixture` takes it; `null` means no settings file. */
     settings?: Record<string, unknown> | null;
   }

   /** A Services whose settings never touch disk. `orchDir` still points at a real temp dir for
    *  everything else (presence, store, logs). */
   export function testServices(options: TestServicesOptions): Services {
     const file = join(options.orchDir, "settings.json");
     const text = options.settings === null ? null : settingsFixtureText(options.settings);
     return createServices({ orchDir: options.orchDir, settings: inMemorySettingsManager(text, file) });
   }
   ```

Check: lint, tc. Tests: `grep -l "helpers/settings" test/*.ts` list, to prove `writeSettingsFixture` still behaves.
