# 4-03-daemon-state-object

Model: luna:xhigh
Owns: `src/daemon/orchd.ts`

Requires 4-02 landed.

Goal: no module-level mutable state. The daemon becomes an object you could construct twice in one process.

Current state, module scope (`:97-106` before 4-02, shifted after): `let server`, `const workController`, `let workLoop`, `let workLoopRunning`, `let outboxDrain`, `let presenceWatch`, `let settingsWatch`, `let lastActivityAt`, plus `let daemonLogger`, `let fatalLogged` near `:548-549`.

Do:

1. Define, in this file:
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
     logger: Logger | undefined;   // was daemonLogger
     fatalLogged: boolean;
   }
   ```
   Match the exact types the existing `let`s carry; do not widen or narrow.
2. `startDaemon` creates one `DaemonState` after `createServices()` and every function in the file that read or wrote one of those `let`s takes `state: DaemonState` as its first parameter (or, where it already takes `directory` and `settings` from 4-02, replaces those two with `state`). `touchOnCall`, `logFatalAndExit`, `shutDown`, the `daemon-status` handler, the idle timer, the outbox drain, and the signal handlers are the main ones.
3. Delete every module-level `let`. `const workController = new AbortController()` moves into the state construction.
4. `startDaemon` returns the state (or an object `{ stop(): Promise<void> }` wrapping it) so a test could hold it; keep the current exported name and make the return type explicit.
5. Behaviour is identical. This is a mechanical move.

Check: lint, tc. Tests: none named (daemon tests are Bryan-only). Say so in the report.
