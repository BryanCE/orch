# 3a-presence-store

Owns: `src/presence/store.ts`. Follow `3a-README.md`.

Sites, all `root = orchDir()` defaults that become `root: string` required:
- `:21` `presenceDir`
- `:28` `presenceRootFault`
- `:81` `spawnedRecords`
- `:95` `reapSpawnedRecord(key, root, options)`
- `:107` `closeOutboxForDeadTargets`
- `:145` `malformedPresenceDirs`
- `:164` `reapMalformedPresenceDirs`
- `:176` `reapDeadPresenceDirs(root, olderThan?)`
- `:199` `loadPresence`

`loadPresence()` with no argument is called widely (for example `src/control/dispatch.ts:39`). Expect a long CALLERS list; that is the point.
