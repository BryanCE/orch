# 4-03a-daemon-state-define

Owns: `src/daemon/orchd.ts`. Chain: this, then `4-03b`, then `4-03c`, same agent, context kept. Requires `4-02c` landed.

Goal: introduce the state object and move the first four fields into it. Behaviour identical.

Do:
1. Define in this file:
   ```ts
   interface DaemonState {
     readonly services: Services;
     readonly directory: string;
     readonly workController: AbortController;
     server: RpcServer | undefined;
     workLoop: Promise<void> | undefined;
     workLoopRunning: boolean;
     outboxDrain: ReturnType<typeof setInterval> | undefined;
     presenceWatch: PresenceWatch | undefined;
     settingsWatch: SettingsWatch | undefined;
     lastActivityAt: number;
     logger: Logger | undefined;
     fatalLogged: boolean;
   }
   ```
   Match the exact existing types of each module-level `let`; do not widen.
2. In `startDaemon`, right after `createServices()`, build `const state: DaemonState = { services, directory, workController: new AbortController(), server: undefined, workLoop: undefined, workLoopRunning: false, outboxDrain: undefined, presenceWatch: undefined, settingsWatch: undefined, lastActivityAt: Date.now(), logger: undefined, fatalLogged: false }`.
3. Move only `server`, `workController`, `workLoop`, `workLoopRunning`: delete those four module-level declarations and change every read/write to `state.x`. Functions outside `startDaemon` that touch them take `state: DaemonState` as their first parameter; their callers pass `state`. Where a function already takes `directory` and `settings` from 4-02, replace those two with `state` and read `state.directory` / `state.services.settings`.
4. Leave the other six `let`s for `4-03b` and `4-03c`.

Check: lint, tc on this file. Tests: none (Bryan-only).
