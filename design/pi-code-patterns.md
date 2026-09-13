# pi code patterns orch should adopt

Source: the pi coding agent, `~/src/pi` at tag `v0.84.3` (the installed `pi 0.84.3`). Paths under `pi:` are relative to `~/src/pi/packages/`. Paths under `orch:` are relative to `packages/orch/`. Line numbers are from 2026-09-12.

This is a code-design study, not a plan. Each section names one pattern, shows where pi does it, shows the orch code that does the opposite, and states the change. Nothing here is about pi's bundling, TUI, or bun-specific pieces; Rule 6 keeps orch runtime-portable and pi is node-builtin-only anyway (no `Bun.`, `bun:`, or `Deno.` anywhere in the files read).

## What orch already does right

Say it once so the rest is not read as "everything is wrong".

- Settings are zod-validated with a strict schema and a single defaults object (`orch: src/settings/schema.ts:15,73-88,92-213`). pi has no defaults registry; its defaults are literals inside getters (`pi: coding-agent/src/core/settings-manager.ts:741-743,838-840`). That is the `?? <literal>` style Rule 17 forbids. Do not adopt it.
- Refusals are thrown, never exited, and turned into an exit code at exactly one boundary (`orch: src/refusal.ts:1-13`, `src/commands/index.ts:301-306`). pi states the same policy for diagnostics but still leaks `process.exit(1)` from `findInitialModel` (`pi: coding-agent/src/core/model-resolver.ts:654-657`). orch's boundary is cleaner than pi's.
- Exhaustive `never` checks exist in `src/settings/*`, `src/commands/lease.ts`, `src/agent/presence.ts:396`. pi's `resolveSessionPath` switch has no `default: assertNever` (`pi: coding-agent/src/main.ts:372-405`). Keep orch's habit; extend it to the places below that lack it.
- Tagged outcome types exist in `src/control/dispatch.ts` (`types/control.ts:33-34`), `types/core.ts:186-188`, `types/daemon.ts:139-141`.
- `console.*` does not appear in `src/` or `extensions/`.

## 1. One composition root. Services built once, injected downward.

**pi.** `createAgentSessionServices` is the single place cwd-bound services are built. Every dependency is `options.x ?? Factory.create(...)`, so tests inject doubles and production gets files. The result is a plain record, not a container.

```ts
// pi: coding-agent/src/core/agent-session-services.ts:135-193
const modelRuntime = options.modelRuntime ?? (await ModelRuntime.create({ ... }));
const settingsManager = options.settingsManager ?? SettingsManager.create(cwd, agentDir);
const resourceLoader = new DefaultResourceLoader({ ...(options.resourceLoaderOptions ?? {}), cwd, agentDir, settingsManager });
return { cwd, agentDir, modelRuntime, settingsManager, resourceLoader, diagnostics };
```

`main.ts` does not build services itself. It hands a factory closure to `AgentSessionRuntime`, which re-invokes it when the effective cwd changes (`pi: coding-agent/src/main.ts:711-837`, `core/agent-session-runtime.ts:35-41,76`).

**orch.** There is no root. Every command reaches for globals at the call site.

- `orchDir()` (`src/presence/writer.ts:25-27`) is called 228 times across 57 files in `src/`, resolved fresh from `process.env` each time.
- `loadSettings` / `loadSettingsOrNull` are called from about 90 sites: commands (`src/commands/settings.ts:31`, `spawn/flags.ts:142`, `panes.ts:38,112,300`, `results.ts:54,158`, `target.ts:120,134`, `control.ts:199,292`, `events.ts:108`, and more), `src/entities.ts:35`, `src/settings/watch.ts:46,85`, and the daemon itself (`src/daemon/orchd.ts:130,134,345,512,537,657`, `daemon/events.ts:485`).
- Commands import concrete modules and call free functions: `src/commands/target.ts:78-80,222-240`, `src/commands/lifecycle/close.ts:1-17,21-28`. Swapping a store or backend in a test means module mocking.
- The only injection seam is one optional callback, `getSettings?: () => OrchSettings` on `WorkOptions` (`src/types/daemon.ts:258`), used only by `src/daemon/work-loop.ts:97,118,248,278`.

**Change.** Introduce one `Services` record (`orchDir`, settings manager, store handle, backend registry, presence writer, logger) built in exactly two places: the CLI boundary in `src/commands/index.ts` and daemon start in `src/daemon/orchd.ts`. Every command and daemon module takes it as a parameter. `orchDir()` and `loadSettings()` stop being importable from commands; the lint gate in `scripts/check-bridge.ts` can enforce that the same way it enforces Rule 10.

## 2. Settings behind a storage port with an in-memory double

**pi.** The port is one method. Storage hands the current raw string in, the callback returns the new string or `undefined` for read-only.

```ts
// pi: coding-agent/src/core/settings-manager.ts:189-191
export interface SettingsStorage {
	withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void;
}
```

`FileSettingsStorage` wraps it in `proper-lockfile` (`:209-276`). `InMemorySettingsStorage` is a two-field class (`:278-293`). `SettingsManager` has a private constructor and three intent-named factories, `create(cwd, agentDir)`, `fromStorage(storage)`, `inMemory(settings)` (`:311-387`). `inMemory` is not a special code path: it seeds the in-memory storage and goes through `fromStorage`, so the test double exercises the real load pipeline (`:382-387`). Writes are a read-merge-write under the lock that overlays only the fields this process modified, so another process editing a different key is not clobbered (`:552-560,616-645`); writes serialize on a promise chain and failures land in `errors` for `drainErrors()` instead of throwing (`:594-606,688-696`).

**orch.** `readSettingsFile` calls `filesystem.readFileSync` inline (`src/settings/read.ts:40-78`). There is no storage interface and no in-memory variant. The daemon keeps its own memoized copy in a module-level `let currentSettings` behind `getSettings(directory)` (`src/daemon/orchd.ts:104,129-131`), refreshed by one assignment in the file watcher (`:770-771`). Commands read the file fresh. So three "current settings" exist at once: disk, the daemon's cache, and each command's own read.

**Change.** Add `SettingsStorage` with `withLock`, a file implementation, and an in-memory implementation, in `src/settings/`. Wrap `readSettingsFile` + `settingsValues` in a `SettingsManager` with `create` / `fromStorage` / `inMemory`. Keep `SETTINGS_DEFAULTS` and the zod schema as they are; the port sits under them, not instead of them. The manager is a member of the `Services` record from section 1. Tests that today write a settings file to a temp `ORCH_DIR` switch to `inMemory`.

## 3. Diagnostics returned as data; exit only at the boundary

**pi.** Runtime creation collects problems and returns them. The caller decides what to print and whether to abort.

```ts
// pi: coding-agent/src/core/agent-session-services.ts:18-28
/** Runtime creation returns diagnostics to the caller instead of printing or
 * exiting. The app layer decides whether warnings should be shown and whether
 * errors should abort startup. */
export interface AgentSessionRuntimeDiagnostic { type: "info" | "warning" | "error"; message: string; }
```

`main.ts` merges four diagnostic sources, dedupes them, prints only in non-interactive mode or when an error exists, and exits on error (`pi: coding-agent/src/main.ts:776-784,891-901`).

**orch.** The policy is right (`src/refusal.ts`) and three things violate it.

- `launchCredential` calls `process.exit(1)` on a malformed `ORCH_AGENT_ID` (`src/identity/launch.ts:8-16`). It is reached from `src/store/connection.ts:77` (opening the database), `src/identity/self.ts:16`, `src/agent/presence.ts:77`, `src/policy/caller.ts:12`, `src/policy/scope.ts:39`, `src/commands/lease.ts:21`, `src/commands/spawn/index.ts:266,338`, `src/daemon/rpc/client.ts:226`. Any of those can hard-exit with no `CommandRefusal`, no catch, and no pass through `reportCommandFailure`. Inside `bun test` that kills the runner, which is exactly what `refusal.ts:5-8` warns about.
- `startEventsTransport` calls `process.exit(0)` from inside async subscription callbacks (`src/commands/events.ts:336,349`) and installs `SIGINT`/`SIGTERM` handlers that exit directly (`:84-85`). The neighbouring files reject this explicitly (`src/commands/lifecycle/close.ts:306`, `lifecycle/reload.ts:186,265`, `setup.ts:229`).
- `die` is defined twice with different behaviour. `src/commands/target.ts:24-27` logs `command.failed` to `orch.log` then throws. `src/entities.ts:304-306` throws without logging. `refusal.ts:11-12` explains why neither module may import the other, but the effect is that a refusal from `resolveTarget` (`src/entities.ts:385-413`) never reaches the log while the same refusal from `resolveLifecycleTarget` (`src/commands/target.ts:373`) always does. Rule 16 says two places computing the same thing is a bug.

**Change.** `launchCredential` returns a tagged result, `{ kind: "absent" } | { kind: "malformed"; value: string } | { kind: "ok"; id }`, and the one CLI boundary and the one daemon boundary decide what to do. The events transport resolves a promise and lets `src/commands/index.ts` set `exitCode`. One `die` lives in `src/refusal.ts` (already the shared leaf both sides import); logging moves to `reportCommandFailure`, which is the one place that sees every refusal anyway.

## 4. Discriminated-union RPC commands and responses, parsed once, switched exhaustively

**pi.** Every command is a union member on a literal `type`. Every response is a union member on `type: "response"` plus `command`, with one shared failure arm.

```ts
// pi: coding-agent/src/modes/rpc/rpc-types.ts:20-60,115-231
export type RpcCommand =
	| { id?: string; type: "prompt"; message: string; images?: ImageContent[]; streamingBehavior?: "steer" | "followUp" }
	| { id?: string; type: "set_model"; provider: string; modelId: string }
	...
export type RpcResponse =
	| { id?: string; type: "response"; command: "prompt"; success: true }
	...
	| { id?: string; type: "response"; command: string; success: false; error: string };
export type RpcCommandType = RpcCommand["type"];
```

`handleCommand` is one `switch (command.type)` with a case per member; inside each case `command` is narrowed so `command.provider` is typed (`pi: coding-agent/src/modes/rpc/rpc-mode.ts:386-716`). Each case is a thin adapter: resolve inputs, call exactly one session method, wrap with the shared `success`/`error` helpers (`:64-77`). The `default` arm returns a typed error for unknown input rather than throwing. Malformed JSON is rejected one layer up as a `command: "parse"` failure (`:748-762`). Uncaught handler exceptions become the same error shape keyed by `command.id` (`:781-797`).

pi's `protocol` package goes further: typebox schemas, `Static<typeof Schema>` types, and a runtime `Check` before any decoded value is trusted (`pi: protocol/src/schemas.ts:397-450`, `codec.ts:1-52`).

**orch.** The daemon has no typed request or response.

- `RpcParams = unknown` (`src/types/daemon.ts:16`) and `RpcHandler = (params: RpcParams, ...) => unknown` (`:37`). `parseRequest` checks only that `method` is a string (`src/daemon/rpc/wire.ts:124-139`).
- `RpcResponse` is one loose interface with every field optional (`src/daemon/rpc/wire.ts:40-48`), validated combinatorially by `isRpcResponse` and its `presentMembers` / `wellFormed*` helpers (`:56-107`). `RpcError.code` is `string | number` with no closed set (`:28-38`).
- Every handler narrows its own params by hand with `rpcParams`, `requiredString`, `optionalString` defined inline in `src/daemon/orchd.ts:157-167,356-358`. That `optionalString` duplicates `src/util.ts:104-106` and disagrees with it: the util version returns `""`, the daemon version rejects it. Live Rule 16 violation with behavioural drift.
- Handlers are an object literal (`src/daemon/orchd.ts:660-745`) looked up by string in `dispatchRequest` (`src/daemon/rpc/server.ts:47-72`). Two methods are special-cased ahead of dispatch in `handleLine` (`:91-104`).
- The client writes raw JSON literals: `rpcCall` (`src/daemon/rpc/client.ts:138-154`), plus two more hand-built objects in `subscribeEvents` (`:228-232,239-243`). Nothing ties a `dispatch` call's params to what the `dispatch` handler narrows.

**Change.** One `RpcRequest` union keyed on `method` with typed `params` per member, one `RpcResponse` union, both in `src/daemon/rpc/wire.ts` (Rule 9: wire formats live in exactly one place). Parse once at the wire with zod (already a dependency; it plays the role typebox plays in pi's protocol package). Handlers become `{ [M in RpcMethod]: (params: ParamsOf<M>, ...) => ResultOf<M> }`, so a missing handler is a compile error and a stray `requiredString` is unnecessary. `rpcCall<M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>>` on the client. Delete the local `optionalString` and `requiredString`.

## 5. Events as a discriminated union; a bus port with per-handler containment

**pi.** The bus port is two methods. `on` never registers the caller's handler directly; it wraps it so one throwing subscriber cannot take down the emitter or the others, and returns an unsubscribe closure.

```ts
// pi: coding-agent/src/core/event-bus.ts:1-33
export interface EventBus {
	emit(channel: string, data: unknown): void;
	on(channel: string, handler: (data: unknown) => void): () => void;
}
on: (channel, handler) => {
	const safeHandler = async (data: unknown) => {
		try { await handler(data); } catch (err) { console.error(`Event handler error (${channel}):`, err); }
	};
	emitter.on(channel, safeHandler);
	return () => emitter.off(channel, safeHandler);
},
```

Session events and extension events are unions on `type` (`pi: coding-agent/src/core/agent-session.ts:143-185`, `core/extensions/types.ts:1068-1093`). The extension runner has its own containment loop that attributes failures to `ext.path` + `event.type` and routes them through `emitError` (`core/extensions/runner.ts:801-833`); in RPC mode those surface as `extension_error` wire messages rather than crashes (`modes/rpc/rpc-mode.ts:348-350`).

**orch.** `NotifyEvent` is one flat interface with about 25 mostly-optional fields (`src/types/notify.ts:1-42`). `oldState` and `newState` are bare `string`, so no switch on them can be exhaustive. Server fan-out is a `Set<Socket>` loop inside a closure (`src/daemon/rpc/server.ts:304-340`), not a bus with subscribe/unsubscribe. Client-side, `subscribeEvents` invokes `onEvent(parsed.event, parsed.seq)` with no try/catch (`src/daemon/rpc/client.ts:211-218`); a throwing subscriber propagates into the socket data handler. Server-side handler containment is fine (`server.ts:62-71`).

**Change.** Make `NotifyEvent` a union on `type` (`state`, `question`, `result`, `capacity`, …) with `oldState`/`newState` typed as the agent-state literal union, so `switch` sites gain `never` checks. Add an `EventBus` port in `src/daemon/` with the pi shape and use it for both the replay buffer fan-out and the daemon's internal listeners. Wrap the client `onEvent` call the way pi wraps `safeHandler`.

## 6. Private constructor, named factories, no module-level runtime state

**pi.** `SettingsManager` and `SessionManager` both hide the constructor and expose intent-named factories: `create`, `open`, `continueRecent`, `inMemory`, `forkFrom` (`pi: coding-agent/src/core/session-manager.ts:868-888,1520-1580`). `ModelRuntime.create` is async because construction needs an `await` (`core/model-runtime.ts:172-217`). Nothing in this layer is a module singleton. The whole daemon-like runtime is an object you can construct twice in one test process.

**orch.** The daemon's entire mutable runtime is top-level `let`s in one module.

```ts
// orch: src/daemon/orchd.ts:97-106
let server: RpcServer | undefined;
let workLoop: Promise<void> | undefined;
let workLoopRunning = false;
let outboxDrain: ReturnType<typeof setInterval> | undefined;
let presenceWatch: PresenceWatch | undefined;
let settingsWatch: SettingsWatch | undefined;
let currentSettings: OrchSettings | undefined;
let sinks: NotifyEntry[] | undefined;
let lastActivityAt = Date.now();
```

There is no daemon instance; every function closes over module scope. Running two daemons or resetting one inside a test is structurally impossible without module reload tricks. Other module-level mutable state: `src/adapters/model-catalogue.ts:34-35` (`let stored`, `let storedFrom`), `src/agent/presence.ts:67` (`let ownSessionKey`), `src/backends/herdr/hud.ts:33,88`, `src/backends/herdr/cli.ts:55` and `src/backends/tool-exec.ts:19` (swappable executor singletons), `src/daemon/rpc/client.ts:16` (`let nextRequestId`, shared by every call site in the process).

**Change.** `Daemon.start(services): Promise<Daemon>` returning an object with `stop()`, holding what the nine `let`s hold today. The model catalogue, presence session key, and request-id counter become fields on the objects that own them (catalogue reader, presence writer, RPC client), all reachable from the `Services` record in section 1.

## 7. Small error classes with data and `cause`; one error paradigm

**pi.** There is no `Result<T, E>` type and no error base class beyond `Error`. Typed errors are small, local, carry structured fields, set `name`, and chain with `{ cause }`.

```ts
// pi: coding-agent/src/core/model-runtime.ts:94-111
export class CredentialSynchronizationError extends Error {
	readonly providerId: string;
	readonly operation: CredentialSynchronizationOperation;
	constructor(providerId, operation, credential, options: ErrorOptions) {
		super(`Credential ${operation} committed for ${providerId}, but local synchronization failed`, options);
		this.name = "CredentialSynchronizationError";
```

Where a call can fail in an expected way, pi returns a per-site tagged record (`{ settings, error }` at `settings-manager.ts:407-417`; `ResolvedSession` at `main.ts:230-234`).

**orch.** Nine unrelated `class X extends Error` definitions with no shared shape: `CommandRefusal`, `SpawnRefusalError` (`src/refusal.ts:17,51`), `HerdrCommandError` (`src/backends/herdr/cli.ts:114`), `SetupFlagError` (`src/setup/flags.ts:43`), `DaemonAbsentError`, `DaemonUnreachableError`, `RpcError` (`src/daemon/rpc/wire.ts:8,19,28`), `AgentGoneError` (`src/control/agent-gone.ts:9`), `BridgeDetachedError` (`src/control/bridge-links.ts:10`). Alongside them, `src/seat/domain.ts:28-34` defines `PackSendError` / `PackAbortError` through Effect's `Data.TaggedError`, used only under `src/seat/**`. Two error systems with no bridge between them. Rule 8: one shape.

**Change.** Pick the plain `Error` subclass shape, since it is what eight of nine sites and all of pi use. Each carries `name`, a closed `code` literal, its data as `readonly` fields, and `cause` where it wraps. Rewrite the two seat errors to it and drop the Effect error paradigm from `src/seat/`. Expected failures return tagged records, as `control/dispatch.ts` already does.

## 8. One helper for the shared harness-shim preamble

**pi.** Extension capability contexts are built from closures over private runner fields, never raw references; each getter calls `assertActive()` first so a stale context throws instead of acting on a replaced session (`pi: coding-agent/src/core/extensions/runner.ts:673-790`). The point for orch is narrower: pi has exactly one place that knows how to hand a harness what it needs.

**orch.** `extensions/pi/index.ts` and `extensions/omp/index.ts` share `registerHarnessBridge` and `registerOrchSeat` and differ only in identity. `extensions/claude/index.ts:59-66` and `extensions/codex/index.ts:29-36` are hook shims driven by their harness's stdin contract and duplicate the same preamble byte for byte: read `launchCredential()`, exit silently if null, `ensurePresenceAgentDir(key)`, exit silently if absent, then hand-build the same `status` record (`claude/index.ts:82-92`, `codex/index.ts:53-62`). The duplication is forced by two host integration models, but nothing factors the shared sequence.

**Change.** One function in `src/presence/` (Rule 10: presence writers live there), `presenceSession(): { kind: "not-orch" } | { kind: "ok"; key; directory }`, plus one `baseStatus(key, cwd, lastText)` builder. Both shims call it. Combined with section 3, the shims stop calling `process.exit` themselves and return the tagged result to their two-line entry.

## pi patterns with no orch counterpart yet

Read and worth knowing, but nothing in orch currently violates them. Adopt when the situation arises, not before.

- Sequence tokens to discard stale async results: each refresh captures a counter and writes to the snapshot only if still current (`pi: coding-agent/src/core/model-runtime.ts:148-150,316-344`).
- Per-key serialized operation queue with abort-while-queued (`pi: coding-agent/src/core/model-runtime.ts:494-512`).
- One `AbortController` per in-flight operation tracked in a `Set`, so abort cancels all without a global lock (`pi: coding-agent/src/core/agent-session.ts:2900-2972`).
- Append-only entry log with a derived index and a movable leaf pointer; branching never rewrites history (`pi: coding-agent/src/core/session-manager.ts:844-866,958-977`). orch's presence files are already append-only where it matters (`inbox.jsonl`, `ack.jsonl`).
- Override hooks per resource applied as `base -> override(base)` instead of subclassing (`pi: coding-agent/src/core/resource-loader.ts:176-193`).
- A custom LF-only JSONL splitter, because `node:readline` also splits on Unicode line separators that can legally appear inside a JSON string (`pi: coding-agent/src/modes/rpc/jsonl.ts:1-20`). Check orch's `readJsonMessages` in `src/daemon/rpc/client.ts` against this before trusting it with arbitrary agent text.

## Do not adopt

- Literal defaults inside getters (section "What orch already does right"). Rule 17.
- pi's `resolveSessionPath` switch without `assertNever`. orch's `const exhaustive: never` habit is better.
- pi's remaining `process.exit` and `console.error` leaks in `model-resolver.ts:654-657` and `resource-loader.ts:63,85`.
- typebox. orch has zod; one schema library.
- Anything in `packages/tui`, the bundler, or `proper-lockfile` busy-wait retry specifics. The port shape matters, not the lock library.
