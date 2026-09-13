# 3a-presence-writer

Owns: `src/presence/writer.ts`. Follow `3a-README.md`.

Sites, `root = orchDir()` defaults that become required:
- `:30` `presenceRoot(root)`
- `:36` `presenceAgentDir(key, root)`
- `:43` `ensurePresenceAgentDir(key, root)`

Leave the `orchDir()` function itself at `:25-27` in place; task 6-02 moves it. Nothing else in this file changes.

`ensurePresenceAgentDir(key)` is called by the claude and codex shims under `extensions/`; list them under CALLERS like any other.
