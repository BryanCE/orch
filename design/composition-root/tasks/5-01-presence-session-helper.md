# 5-01-presence-session-helper

Owns: `src/presence/session.ts` (new), `extensions/claude/index.ts`, `extensions/codex/index.ts`

Requires 3a-presence-writer and its 3b callers landed (`ensurePresenceAgentDir(key, root)` now requires `root`).

Goal: the hook shims' root is one helper. Today both shims duplicate the same preamble byte for byte: `claude/index.ts:59-66` and `codex/index.ts:29-36` read `launchCredential()`, exit silently if null, call `ensurePresenceAgentDir(key)`, exit silently if absent; then both hand-build the same `status` record (`claude/index.ts:82-92`, `codex/index.ts:53-62`).

Do:

1. Create `src/presence/session.ts`:
   ```ts
   import { launchCredential } from "../identity/launch.ts";
   import { ensurePresenceAgentDir, orchDir } from "./writer.ts";

   export type PresenceSession =
     | { readonly kind: "not-orch" }
     | { readonly kind: "ok"; readonly key: string; readonly orchDir: string; readonly directory: string };

   /** The hook shim's whole root: who am I, where is orch, where do I write. `not-orch`
    *  means a plain harness session with no orch launch credential: nothing to record. */
   export function presenceSession(): PresenceSession {
     const key = launchCredential();
     if (key === null) return { kind: "not-orch" };
     const root = orchDir();
     const directory = ensurePresenceAgentDir(key, root);
     if (directory === undefined) return { kind: "not-orch" };
     return { kind: "ok", key, orchDir: root, directory };
   }
   ```
   Task 6-02 later replaces the `orchDir` import with the env read that moves into `src/services.ts`; note it in a one-line comment.

2. In both shims, replace the preamble with:
   ```ts
   const session = presenceSession();
   if (session.kind === "not-orch") process.exit(0);
   ```
   and use `session.key`, `session.directory`, `session.orchDir` below. The `process.exit(0)` stays in the shim; it is the process entry, which is the one place an exit belongs.

3. Extract the shared `status` record construction into one exported function in `src/presence/session.ts`, `baseStatus(input: { cwd: string; project: string | null; lastText: string | null; updatedAt: string }): PresenceRecord` or whatever the two shims' records have in common; read both blocks and take the intersection. Fields one shim sets and the other does not stay in that shim, spread after `...baseStatus(...)`.

Check: lint, tc, and `bun --filter @bryance/orch check:bridge` (Rule 10 enforcement must stay green: the helper is under `src/presence/`, which is where presence writers live). Tests: `grep -l "extensions/claude\|extensions/codex\|presence/session" test/*.ts`.
