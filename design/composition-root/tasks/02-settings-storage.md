# 02-settings-storage

Owns: `src/settings/storage.ts` (new)

Goal: the one-method storage port that a settings manager reads through, with a file implementation and an in-memory implementation for tests.

Do: create `src/settings/storage.ts`:

```ts
import * as filesystem from "node:fs";
import * as path from "node:path";
import { settingsPath } from "./schema.ts";
import { errnoCode } from "../util.ts";

/** Where settings text comes from. One method: the raw text, or null when there is none. */
export interface SettingsStorage {
  /** The settings file path, for messages only. */
  readonly file: string;
  read(): string | null;
}

/** `$orchDir/settings.json`. Absent file is null. A legacy `config.toml` next to
 *  an absent settings.json is an error, never read, never migrated (Rule 8). */
export function fileSettingsStorage(orchDir: string): SettingsStorage {
  const file = settingsPath(orchDir);
  return {
    file,
    read: () => {
      try {
        return filesystem.readFileSync(file, "utf8");
      } catch (error: unknown) {
        if (errnoCode(error) !== "ENOENT") throw error;
      }
      const legacy = path.join(orchDir, "config.toml");
      if (filesystem.existsSync(legacy)) {
        throw new Error(`${legacy}: legacy config.toml detected - settings now live in ${file}; re-run orch setup (the old values are not read)`);
      }
      return null;
    },
  };
}

/** Text held in memory. `file` labels it in messages so a test failure names its fixture. */
export function inMemorySettingsStorage(text: string | null, file: string): SettingsStorage {
  return { file, read: () => text };
}
```

The legacy message must be byte-identical to the one in `src/settings/read.ts:220-225`; open that file read-only and copy it. `errnoCode` is exported from `src/util.ts` (see `src/settings/read.ts:11`). `settingsPath` is `src/settings/schema.ts:221`.

Check: lint, tc. Tests: none named.
