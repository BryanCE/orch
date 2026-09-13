# 04-herdr

Owns: `src/backends/herdr/cli.ts`, `src/backends/herdr/index.ts`, `src/backends/herdr/hud.ts`, `src/backends/herdr/notify.ts`, `src/backends/hud.ts`, `test/backend-herdr.test.ts`, `test/herdr-notify-hardening.test.ts`, `test/port-seam-errors.test.ts`, `test/check-bridge.test.ts` (only if it names a deleted export)

Three pieces of module state live here: `let executeHerdr` + `setHerdrExecutor` + the module `listCache` in cli.ts; `let reportedSocket` and `let metadataSeq` in hud.ts. They become fields of two objects.

Do:
1. cli.ts: add
   ```ts
   export interface HerdrCli {
     json<T = unknown>(args: string[]): T;
     ack(args: string[], timeoutMs?: number, policy?: RetryPolicy): void;
     answer(args: string[], timeoutMs?: number): string;
     startAgent(args: string[], agentArgs?: readonly string[]): void;
     version(): string | null;
     serverStatus(): HerdrServerStatus;
     reachable(): boolean;
     panes(): HerdrPane[];
     names(): Map<string, string>;
     tabs(): Map<string, HerdrTab>;
     exec(args: string[], options?: ExecFileSyncOptionsWithStringEncoding): string;
   }
   export function createHerdrCli(executor: HerdrExecutor = defaultHerdrExecutor): HerdrCli
   ```
   The factory owns `listCache` and `executor` as closure locals; the bodies of today's free functions `herdrJSON`, `herdrAck`, `herdrAnswer`, `herdrStartAgent`, `version`, `herdrServerStatus`, `herdrReachable`, `herdrPanes`, `herdrNames`, `herdrTabs`, `herdrExec`, plus the private `herdr` and `herdrOutput`, move inside it unchanged. `defaultHerdrExecutor` is the current default runner (runTool with `DEFAULT_TOOL_RETRY` / `DEFAULT_HERDR_OPTIONS`), a module const. Delete `let executeHerdr`, `setHerdrExecutor`, the module `listCache`, and the free-function exports. Keep exporting `GONE_HANDLE_CODES`, `AGENT_START_TIMEOUT_MS`, `HERDR_INPUT_RETRY`, `HerdrCommandError`, and every type.
2. index.ts: `export class HerdrBackend` gets `constructor(readonly cli: HerdrCli = createHerdrCli())` and every one of the ~38 free-function calls becomes `this.cli.<method>(...)`. `export const herdrBackend = new HerdrBackend();` stays. Wherever index.ts used the module `herdrNotifier` from ./notify.ts, use `createHerdrNotifier(this.cli)` stored as `readonly notifier: Notifier` on the backend, and register `herdrBackend.notifier` where `herdrNotifier` was registered.
3. notify.ts: `export const herdrNotifier` becomes `export function createHerdrNotifier(cli: HerdrCli): Notifier` with the same body, calling `cli.reachable()` / `cli.answer(...)` in place of the imported free functions. `isNotificationShown` stays exported as is.
4. hud.ts: `export function createHerdrHud(cli: HerdrCli): HerdrHud` where `export interface HerdrHud { paneHandle(id, orchDir): string | null; hudActive(id, orchDir): boolean; createPaneStatusReporter(id, paneId, orchDir): (snapshot: PaneStatusSnapshot) => void; readPaneLabels(id, apply, orchDir): Promise<boolean>; notify(event: BridgeNotifyEvent): void }`, with the same parameter types as today's free functions. `reportedSocket` and `metadataSeq` become closure locals of the factory; `serverSocketPath` / `nextMetadataSeq` close over them; `herdrServerStatus()` becomes `cli.serverStatus()`. Export one instance built at the herdr composition point: `export const herdrHud = createHerdrHud(herdrBackend.cli);` (hud.ts already imports from ./index.ts, and index.ts does not import hud.ts, so this adds no cycle). Delete the free-function exports. Implement the members as closures (arrow functions), never as methods reading `this`, because `backends/hud.ts` passes them by reference.
5. `src/backends/hud.ts`: replace the four named imports from ./herdr/hud.ts with `import { herdrHud } from "./herdr/hud.ts";` and wire the provider as `isActive: herdrHud.hudActive`, `statusReporter: (paneId) => herdrHud.createPaneStatusReporter(id, paneId, orchDir)`, `notify: herdrHud.notify`, `readLabels: (apply) => herdrHud.readPaneLabels(id, apply, orchDir)`.
6. Tests. backend-herdr.test.ts: delete the top-level `setHerdrExecutor(...)` + `restoreExecutor` + the `await import(...)` dance, import `HerdrBackend` and `createHerdrCli` statically, and build `const backend = new HerdrBackend(createHerdrCli(fakeExecutor))` where `fakeExecutor` is the same recording function; the two inner `setHerdrExecutor` uses (~lines 386 and 402) become local `new HerdrBackend(createHerdrCli(<that executor>))` instances used by that test only, and their `restore*` calls go away. herdr-notify-hardening.test.ts: same pattern. port-seam-errors.test.ts: `const cli = createHerdrCli(<the throwing executor>)` and call `cli.ack(...)` / `cli.panes()`; `failHerdr()` returns nothing to restore any more.

Check: `bun check`. Tests: `test/backend-herdr.test.ts`, `test/herdr-notify-hardening.test.ts`, `test/port-seam-errors.test.ts`, `test/check-bridge.test.ts`.
