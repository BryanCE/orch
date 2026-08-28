$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge FAIL src/backends/herdr/index.ts:42 agent id literals are forbidden in backends
check:bridge | Exited with code 1
tc           | scripts/reset.ts(86,20): error TS2322: Type 'NonSharedBuffer' is not assignable to type 'void | Promise<void>'.
tc           |   Type 'Buffer<ArrayBuffer>' is missing the following properties from type 'Promise<void>': then, catch, finally
tc           | src/adapters/pi.ts(422,25): error TS2345: Argument of type 'string' is not assignable to parameter of type '"pi" | "pif"'.
tc           | src/adapters/pi.ts(423,13): error TS2345: Argument of type 'string' is not assignable to parameter of type '"pi" | "pif"'.
tc           | src/adapters/pi.ts(424,39): error TS2345: Argument of type 'string' is not assignable to parameter of type '"pi" | "pif"'.
tc           | src/commands/index.ts(258,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(259,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(260,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(261,18): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(262,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(263,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(264,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(265,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(266,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(267,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(268,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(272,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(273,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(274,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(275,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(276,18): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(277,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(278,16): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(279,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(280,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(281,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(282,12): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(283,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(284,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(285,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(286,17): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(287,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(288,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(289,12): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(290,16): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(291,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(292,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(293,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(294,15): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(295,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(296,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(297,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(298,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(299,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(300,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(301,12): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(302,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(303,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(304,13): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(305,11): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(306,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(307,17): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/index.ts(313,14): error TS7006: Parameter 'rest' implicitly has an 'any' type.
tc           | src/commands/panes.ts(79,8): error TS2339: Property 'role' does not exist on type 'BoundaryPlan<PaneInputRole<unknown>>'.
tc           |   Property 'role' does not exist on type '{ readonly outcome: "answer"; readonly text: string; readonly reason: "no-environment-role" | "no-pane"; }'.
tc           | src/commands/panes.ts(99,23): error TS2339: Property 'role' does not exist on type 'BoundaryPlan<PaneScreenRole<unknown>>'.
tc           |   Property 'role' does not exist on type '{ readonly outcome: "answer"; readonly text: string; readonly reason: "no-environment-role" | "no-pane"; }'.
tc           | src/commands/panes.ts(251,8): error TS2339: Property 'role' does not exist on type 'BoundaryPlan<PaneInputRole<unknown>>'.
tc           |   Property 'role' does not exist on type '{ readonly outcome: "answer"; readonly text: string; readonly reason: "no-environment-role" | "no-pane"; }'.
tc           | src/commands/panes.ts(274,8): error TS2339: Property 'role' does not exist on type 'BoundaryPlan<PaneZoomRole<unknown>>'.
tc           |   Property 'role' does not exist on type '{ readonly outcome: "answer"; readonly text: string; readonly reason: "no-environment-role" | "no-pane"; }'.
tc           | src/commands/results.ts(57,34): error TS2353: Object literal may only specify known properties, and 'key' does not exist in type 'ResultExtractionInput'.
tc           | src/commands/status.ts(202,46): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/commands/status.ts(203,51): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/commands/status.ts(204,45): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/commands/status.ts(205,43): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/commands/status.ts(206,40): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/commands/status.ts(325,40): error TS4104: The type 'readonly string[]' is 'readonly' and cannot be assigned to the mutable type 'string[]'.
tc           | src/entities.ts(76,33): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/entities.ts(77,39): error TS2345: Argument of type 'PresenceStatus | null | undefined' is not assignable to parameter of type 'PresenceStatus | null'.
tc           |   Type 'undefined' is not assignable to type 'PresenceStatus | null'.
tc           | src/seat/index.ts(16,10): error TS2459: Module '"./ui/takeover.ts"' declares 'stateColor' locally, but it is not exported.
tc           | test/seat-index.test.ts(64,33): error TS2769: No overload matches this call.
tc           |   The last overload gave the following error.
tc           |     Type 'undefined' is not assignable to type 'string'.
tc           | Exited with code 1
lint         | 
lint         |   x eslint(no-unused-vars): Interface 'BackendRegistryRecord' is declared but never used.
lint         |      ,-[src/backends/backend.ts:258:11]
lint         |  257 | /** Entry written to the spawn registry. */
lint         |  258 | interface BackendRegistryRecord<Handle = BackendHandle> {
lint         |      :           ^^^^^^^^^^|^^^^^^^^^^
lint         |      :                     `-- 'BackendRegistryRecord' is declared here
lint         |  259 |   // Written by orch, but read back from disk: an id this build no longer ships
lint         |      `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Function 'tryLoadSettings' is declared but never used.
lint         |      ,-[src/config.ts:416:10]
lint         |  415 |  * malformed data returns its validation error so setup can reap the whole file. */
lint         |  416 | function tryLoadSettings(orchDir: string): { config: OrchConfig | null; error: Error | null } {
lint         |      :          ^^^^^^^|^^^^^^^
lint         |      :                 `-- 'tryLoadSettings' is declared here
lint         |  417 |   try {
lint         |      `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Function 'paneRunsCommand' is declared but never used.
lint         |     ,-[src/backends/pane-ready.ts:41:10]
lint         |  40 |  *  from outside that a line typed into a pane actually ran. */
lint         |  41 | function paneRunsCommand(foreground: PaneForeground): boolean {
lint         |     :          ^^^^^^^|^^^^^^^
lint         |     :                 `-- 'paneRunsCommand' is declared here
lint         |  42 |   return foreground.processes.length > 0 && !paneAtShellPrompt(foreground);
lint         |     `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Function 'getSinkProvider' is declared but never used.
lint         |     ,-[src/notify/sinks.ts:37:10]
lint         |  36 | 
lint         |  37 | function getSinkProvider(id: string): SinkProvider | undefined {
lint         |     :          ^^^^^^^|^^^^^^^
lint         |     :                 `-- 'getSinkProvider' is declared here
lint         |  38 |   return sinkProviders.get(id);
lint         |     `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Type alias 'ModelControl' is declared but never used.
lint         |      ,-[src/agent/model-control.ts:126:6]
lint         |  125 | 
lint         |  126 | type ModelControl = ReturnType<typeof createModelControl>;
lint         |      :      ^^^^^^|^^^^^
lint         |      :            `-- 'ModelControl' is declared here
lint         |      `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x typescript(consistent-type-definitions): Use `interface` instead of `type`.
lint         |      ,-[src/session.ts:155:1]
lint         |  154 | 
lint         |  155 | type SessionState = {
lint         |      : ^^^^
lint         |  156 |   lastModelChange: string | null;
lint         |      `----
lint         |   help: Replace `type SessionState = {
lint         |           lastModelChange: string | null;
lint         |           lastThinkChange: string | null;
lint         |           lastAsstModel: string | null;
lint         |           lastAsstProvider: string | null;
lint         |         };` with `interface SessionState {
lint         |           lastModelChange: string | null;
lint         |           lastThinkChange: string | null;
lint         |           lastAsstModel: string | null;
lint         |           lastAsstProvider: string | null;
lint         |         }`.
lint         | 
lint         |   x typescript(consistent-type-definitions): Use `interface` instead of `type`.
lint         |      ,-[src/commands/setup.ts:319:1]
lint         |  318 | 
lint         |  319 | type MissingPrerequisite = { bin: string; cmd: string };
lint         |      : ^^^^
lint         |  320 | type ManualPrerequisite = { id: string; url: string };
lint         |      `----
lint         |   help: Replace `type MissingPrerequisite = { bin: string; cmd: string };` with `interface MissingPrerequisite { bin: string; cmd: string }`.
lint         | 
lint         |   x typescript(consistent-type-definitions): Use `interface` instead of `type`.
lint         |      ,-[src/commands/setup.ts:320:1]
lint         |  319 | type MissingPrerequisite = { bin: string; cmd: string };
lint         |  320 | type ManualPrerequisite = { id: string; url: string };
lint         |      : ^^^^
lint         |  321 | 
lint         |      `----
lint         |   help: Replace `type ManualPrerequisite = { id: string; url: string };` with `interface ManualPrerequisite { id: string; url: string }`.
lint         | 
lint         |   x eslint(no-unused-vars): Variable 'dir' is declared but never used. Unused variables should start with a '_'.
lint         |      ,-[test/close-always.test.ts:255:11]
lint         |  254 |   test("duplicate close targets count once", () => {
lint         |  255 |     const dir = makeDir();
lint         |      :           ^|^
lint         |      :            `-- 'dir' is declared here
lint         |  256 |     const key = "headless~foreign~duplicate";
lint         |      `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Type alias 'PackAgentState' is declared but never used.
lint         |     ,-[src/seat/domain.ts:13:6]
lint         |  12 | /** orch agent states as the daemon publishes them. */
lint         |  13 | type PackAgentState =
lint         |     :      ^^^^^^^|^^^^^^
lint         |     :             `-- 'PackAgentState' is declared here
lint         |  14 |   | "spawning"
lint         |     `----
lint         |   help: Consider removing this declaration.
lint         | 
lint         |   x eslint(no-unused-vars): Identifier 'stateColor' is imported but never used.
lint         |     ,-[src/seat/index.ts:16:10]
lint         |  15 | import { openPackDashboard } from "./ui/takeover.ts";
lint         |  16 | import { stateColor } from "./ui/takeover.ts";
lint         |     :          ^^^^^|^^^^
lint         |     :               `-- 'stateColor' is imported here
lint         |  17 | 
lint         |     `----
lint         |   help: Consider removing this import.
lint         | 
lint         |   x typescript(no-base-to-string): 'request.targetPane' will use Object's default stringification format ('[object Object]') when stringified.
lint         |      ,-[src/backends/herdr/index.ts:159:117]
lint         |  158 |       if (!workspace) throw new Error("Could not determine herdr workspace (herdr down?).");
lint         |  159 |       return { handle: this.openPane(workspace, { cwd: request.cwd, env: request.env }, request.targetPane ? String(request.targetPane) : process.env.HERDR_PANE_ID ?? null) };
lint         |      :                                                                                                                     ^^^^^^^^^^^^^^^^^^
lint         |  160 |     },
lint         |      `----
lint         |   help: Consider picking a property (e.g. `user.name`), using a formatter (or `JSON.stringify`), or implementing a custom `toString()`/`toLocaleString()` on the type.
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |     ,-[src/commands/panes.ts:79:3]
lint         |  78 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |  79 |   plan.role.sendKeys(handle, keys);
lint         |     :   ^^^^^^^^^^^^^^^^^^
lint         |  80 |   if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
lint         |     `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .sendKeys on an `error` typed value.
lint         |     ,-[src/commands/panes.ts:79:13]
lint         |  78 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |  79 |   plan.role.sendKeys(handle, keys);
lint         |     :             ^^^^^^^^
lint         |  80 |   if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
lint         |     `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/panes.ts:99:9]
lint         |   98 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |   99 |   const screen = plan.role.read(handle, n);
lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  100 |   if (json) {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:99:18]
lint         |   98 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |   99 |   const screen = plan.role.read(handle, n);
lint         |      :                  ^^^^^^^^^^^^^^
lint         |  100 |   if (json) {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .read on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:99:28]
lint         |   98 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |   99 |   const screen = plan.role.read(handle, n);
lint         |      :                            ^^^^
lint         |  100 |   if (json) {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/panes.ts:101:65]
lint         |  100 |   if (json) {
lint         |  101 |     process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
lint         |      :                                                                 ^^^^^^
lint         |  102 |     return;
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type string | Uint8Array<ArrayBufferLike>.
lint         |      ,-[src/commands/panes.ts:105:24]
lint         |  104 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
lint         |  105 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
lint         |      :                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:105:24]
lint         |  104 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
lint         |  105 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
lint         |      :                        ^^^^^^^^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .endsWith on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:105:31]
lint         |  104 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
lint         |  105 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
lint         |      :                               ^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:251:3]
lint         |  250 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |  251 |   plan.role.focus(handle);
lint         |      :   ^^^^^^^^^^^^^^^
lint         |  252 |   if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .focus on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:251:13]
lint         |  250 |   if (!renderBoundaryAnswer(plan, json)) return;
lint         |  251 |   plan.role.focus(handle);
lint         |      :             ^^^^^
lint         |  252 |   if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:274:3]
lint         |  273 |   const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
lint         |  274 |   plan.role.setZoom(handle, zoomMode);
lint         |      :   ^^^^^^^^^^^^^^^^^
lint         |  275 |   if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .setZoom on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:274:13]
lint         |  273 |   const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
lint         |  274 |   plan.role.setZoom(handle, zoomMode);
lint         |      :             ^^^^^^^
lint         |  275 |   if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
lint         |      `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[src/commands/lifecycle.ts:555:20]
lint         |  554 |   }
lint         |  555 |   const sendKeys = backend.paneInput?.sendKeys ?? ((pane: BackendHandle, keys: readonly string[]) => { if (!backend.sendKeys(pane, keys)) throw new Error(`Could not send keys to ${String(pane)}.`); });
lint         |      :                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^|
lint         |      :                                 |             `-- This reference may be unbound and lose `this` context
lint         |  556 |   sendKeys(handle, ["Escape"]);
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:258:48]
lint         |  257 | const commandHandlers: ReadonlyMap<string, CommandHandler> = new Map([
lint         |  258 |   ["status", (rest) => dispatchAsync(cmdStatus(rest))],
lint         |      :                                                ^^^^
lint         |  259 |   ["events", (rest) => dispatchAsync(cmdEvents(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:259:48]
lint         |  258 |   ["status", (rest) => dispatchAsync(cmdStatus(rest))],
lint         |  259 |   ["events", (rest) => dispatchAsync(cmdEvents(rest))],
lint         |      :                                                ^^^^
lint         |  260 |   ["notify", (rest) => dispatchAsync(cmdNotify(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:260:48]
lint         |  259 |   ["events", (rest) => dispatchAsync(cmdEvents(rest))],
lint         |  260 |   ["notify", (rest) => dispatchAsync(cmdNotify(rest))],
lint         |      :                                                ^^^^
lint         |  261 |   ["questions", (rest) => dispatchAsync(cmdQuestions(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:261:54]
lint         |  260 |   ["notify", (rest) => dispatchAsync(cmdNotify(rest))],
lint         |  261 |   ["questions", (rest) => dispatchAsync(cmdQuestions(rest))],
lint         |      :                                                      ^^^^
lint         |  262 |   ["runs", (rest) => cmdRuns(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:262:30]
lint         |  261 |   ["questions", (rest) => dispatchAsync(cmdQuestions(rest))],
lint         |  262 |   ["runs", (rest) => cmdRuns(rest)],
lint         |      :                              ^^^^
lint         |  263 |   ["queue", (rest) => dispatchAsync(cmdQueue(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:263:46]
lint         |  262 |   ["runs", (rest) => cmdRuns(rest)],
lint         |  263 |   ["queue", (rest) => dispatchAsync(cmdQueue(rest))],
lint         |      :                                              ^^^^
lint         |  264 |   ["lock", (rest) => dispatchAsync(cmdLock(rest).then((code) => { process.exitCode = code; }))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:264:44]
lint         |  263 |   ["queue", (rest) => dispatchAsync(cmdQueue(rest))],
lint         |  264 |   ["lock", (rest) => dispatchAsync(cmdLock(rest).then((code) => { process.exitCode = code; }))],
lint         |      :                                            ^^^^
lint         |  265 |   ["daemon", (rest) => dispatchAsync(cmdDaemon(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:265:48]
lint         |  264 |   ["lock", (rest) => dispatchAsync(cmdLock(rest).then((code) => { process.exitCode = code; }))],
lint         |  265 |   ["daemon", (rest) => dispatchAsync(cmdDaemon(rest))],
lint         |      :                                                ^^^^
lint         |  266 |   ["doctor", (rest) => dispatchAsync(cmdDoctor(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:266:48]
lint         |  265 |   ["daemon", (rest) => dispatchAsync(cmdDaemon(rest))],
lint         |  266 |   ["doctor", (rest) => dispatchAsync(cmdDoctor(rest))],
lint         |      :                                                ^^^^
lint         |  267 |   ["work", (rest) => dispatchAsync(cmdWork(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:267:44]
lint         |  266 |   ["doctor", (rest) => dispatchAsync(cmdDoctor(rest))],
lint         |  267 |   ["work", (rest) => dispatchAsync(cmdWork(rest))],
lint         |      :                                            ^^^^
lint         |  268 |   ["review", (rest) => {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .length on an `any` value.
lint         |      ,-[src/commands/index.ts:269:14]
lint         |  268 |   ["review", (rest) => {
lint         |  269 |     if (rest.length === 0) dispatchAsync(cmdReviewInteractive());
lint         |      :              ^^^^^^
lint         |  270 |     else dispatchAsync(cmdReview(rest));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:270:34]
lint         |  269 |     if (rest.length === 0) dispatchAsync(cmdReviewInteractive());
lint         |  270 |     else dispatchAsync(cmdReview(rest));
lint         |      :                                  ^^^^
lint         |  271 |   }],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:272:48]
lint         |  271 |   }],
lint         |  272 |   ["answer", (rest) => dispatchAsync(cmdAnswer(rest))],
lint         |      :                                                ^^^^
lint         |  273 |   ["result", (rest) => cmdResult(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:273:34]
lint         |  272 |   ["answer", (rest) => dispatchAsync(cmdAnswer(rest))],
lint         |  273 |   ["result", (rest) => cmdResult(rest)],
lint         |      :                                  ^^^^
lint         |  274 |   ["steer", (rest) => dispatchAsync(cmdSteer(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:274:46]
lint         |  273 |   ["result", (rest) => cmdResult(rest)],
lint         |  274 |   ["steer", (rest) => dispatchAsync(cmdSteer(rest))],
lint         |      :                                              ^^^^
lint         |  275 |   ["pipe", (rest) => dispatchAsync(cmdPipe(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:275:44]
lint         |  274 |   ["steer", (rest) => dispatchAsync(cmdSteer(rest))],
lint         |  275 |   ["pipe", (rest) => dispatchAsync(cmdPipe(rest))],
lint         |      :                                            ^^^^
lint         |  276 |   ["broadcast", (rest) => dispatchAsync(cmdBroadcast(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:276:54]
lint         |  275 |   ["pipe", (rest) => dispatchAsync(cmdPipe(rest))],
lint         |  276 |   ["broadcast", (rest) => dispatchAsync(cmdBroadcast(rest))],
lint         |      :                                                      ^^^^
lint         |  277 |   ["tail", (rest) => cmdTail(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:277:30]
lint         |  276 |   ["broadcast", (rest) => dispatchAsync(cmdBroadcast(rest))],
lint         |  277 |   ["tail", (rest) => cmdTail(rest)],
lint         |      :                              ^^^^
lint         |  278 |   ["session", (rest) => cmdSession(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:278:36]
lint         |  277 |   ["tail", (rest) => cmdTail(rest)],
lint         |  278 |   ["session", (rest) => cmdSession(rest)],
lint         |      :                                    ^^^^
lint         |  279 |   ["panes", (rest) => cmdPanes(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:279:32]
lint         |  278 |   ["session", (rest) => cmdSession(rest)],
lint         |  279 |   ["panes", (rest) => cmdPanes(rest)],
lint         |      :                                ^^^^
lint         |  280 |   ["spawn", (rest) => dispatchAsync(cmdSpawn(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:280:46]
lint         |  279 |   ["panes", (rest) => cmdPanes(rest)],
lint         |  280 |   ["spawn", (rest) => dispatchAsync(cmdSpawn(rest))],
lint         |      :                                              ^^^^
lint         |  281 |   ["tile", (rest) => dispatchAsync(cmdTile(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:281:44]
lint         |  280 |   ["spawn", (rest) => dispatchAsync(cmdSpawn(rest))],
lint         |  281 |   ["tile", (rest) => dispatchAsync(cmdTile(rest))],
lint         |      :                                            ^^^^
lint         |  282 |   ["run", (rest) => dispatchAsync(cmdRun(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:282:42]
lint         |  281 |   ["tile", (rest) => dispatchAsync(cmdTile(rest))],
lint         |  282 |   ["run", (rest) => dispatchAsync(cmdRun(rest))],
lint         |      :                                          ^^^^
lint         |  283 |   ["model", (rest) => dispatchAsync(cmdModel(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:283:46]
lint         |  282 |   ["run", (rest) => dispatchAsync(cmdRun(rest))],
lint         |  283 |   ["model", (rest) => dispatchAsync(cmdModel(rest))],
lint         |      :                                              ^^^^
lint         |  284 |   ["models", (rest) => cmdModels(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:284:34]
lint         |  283 |   ["model", (rest) => dispatchAsync(cmdModel(rest))],
lint         |  284 |   ["models", (rest) => cmdModels(rest)],
lint         |      :                                  ^^^^
lint         |  285 |   ["wait", (rest) => cmdWait(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:285:30]
lint         |  284 |   ["models", (rest) => cmdModels(rest)],
lint         |  285 |   ["wait", (rest) => cmdWait(rest)],
lint         |      :                              ^^^^
lint         |  286 |   ["dispatch", (rest) => dispatchAsync(cmdDispatch(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:286:52]
lint         |  285 |   ["wait", (rest) => cmdWait(rest)],
lint         |  286 |   ["dispatch", (rest) => dispatchAsync(cmdDispatch(rest))],
lint         |      :                                                    ^^^^
lint         |  287 |   ["reload", (rest) => dispatchAsync(cmdReload(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:287:48]
lint         |  286 |   ["dispatch", (rest) => dispatchAsync(cmdDispatch(rest))],
lint         |  287 |   ["reload", (rest) => dispatchAsync(cmdReload(rest))],
lint         |      :                                                ^^^^
lint         |  288 |   ["reset", (rest) => dispatchAsync(cmdNew(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:288:44]
lint         |  287 |   ["reload", (rest) => dispatchAsync(cmdReload(rest))],
lint         |  288 |   ["reset", (rest) => dispatchAsync(cmdNew(rest))],
lint         |      :                                            ^^^^
lint         |  289 |   ["new", (rest) => dispatchAsync(cmdNew(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:289:42]
lint         |  288 |   ["reset", (rest) => dispatchAsync(cmdNew(rest))],
lint         |  289 |   ["new", (rest) => dispatchAsync(cmdNew(rest))],
lint         |      :                                          ^^^^
lint         |  290 |   ["restart", (rest) => dispatchAsync(cmdRestart(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:290:50]
lint         |  289 |   ["new", (rest) => dispatchAsync(cmdNew(rest))],
lint         |  290 |   ["restart", (rest) => dispatchAsync(cmdRestart(rest))],
lint         |      :                                                  ^^^^
lint         |  291 |   ["rename", (rest) => cmdRename(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:291:34]
lint         |  290 |   ["restart", (rest) => dispatchAsync(cmdRestart(rest))],
lint         |  291 |   ["rename", (rest) => cmdRename(rest)],
lint         |      :                                  ^^^^
lint         |  292 |   ["close", (rest) => cmdClose(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:292:32]
lint         |  291 |   ["rename", (rest) => cmdRename(rest)],
lint         |  292 |   ["close", (rest) => cmdClose(rest)],
lint         |      :                                ^^^^
lint         |  293 |   ["kill", (rest) => cmdClose(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:293:31]
lint         |  292 |   ["close", (rest) => cmdClose(rest)],
lint         |  293 |   ["kill", (rest) => cmdClose(rest)],
lint         |      :                               ^^^^
lint         |  294 |   ["detach", (rest) => dispatchAsync(cmdDetach(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:294:48]
lint         |  293 |   ["kill", (rest) => cmdClose(rest)],
lint         |  294 |   ["detach", (rest) => dispatchAsync(cmdDetach(rest))],
lint         |      :                                                ^^^^
lint         |  295 |   ["adopt", (rest) => dispatchAsync(cmdAdopt(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:295:46]
lint         |  294 |   ["detach", (rest) => dispatchAsync(cmdDetach(rest))],
lint         |  295 |   ["adopt", (rest) => dispatchAsync(cmdAdopt(rest))],
lint         |      :                                              ^^^^
lint         |  296 |   ["reap", (rest) => dispatchAsync(cmdReap(rest))],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:296:44]
lint         |  295 |   ["adopt", (rest) => dispatchAsync(cmdAdopt(rest))],
lint         |  296 |   ["reap", (rest) => dispatchAsync(cmdReap(rest))],
lint         |      :                                            ^^^^
lint         |  297 |   ["abort", (rest) => cmdAbort(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:297:32]
lint         |  296 |   ["reap", (rest) => dispatchAsync(cmdReap(rest))],
lint         |  297 |   ["abort", (rest) => cmdAbort(rest)],
lint         |      :                                ^^^^
lint         |  298 |   ["keys", (rest) => cmdKeys(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:298:30]
lint         |  297 |   ["abort", (rest) => cmdAbort(rest)],
lint         |  298 |   ["keys", (rest) => cmdKeys(rest)],
lint         |      :                              ^^^^
lint         |  299 |   ["peek", (rest) => cmdPeek(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:299:30]
lint         |  298 |   ["keys", (rest) => cmdKeys(rest)],
lint         |  299 |   ["peek", (rest) => cmdPeek(rest)],
lint         |      :                              ^^^^
lint         |  300 |   ["tabs", (rest) => cmdTabs(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:300:30]
lint         |  299 |   ["peek", (rest) => cmdPeek(rest)],
lint         |  300 |   ["tabs", (rest) => cmdTabs(rest)],
lint         |      :                              ^^^^
lint         |  301 |   ["tab", (rest) => cmdTab(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:301:28]
lint         |  300 |   ["tabs", (rest) => cmdTabs(rest)],
lint         |  301 |   ["tab", (rest) => cmdTab(rest)],
lint         |      :                            ^^^^
lint         |  302 |   ["focus", (rest) => cmdFocus(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:302:32]
lint         |  301 |   ["tab", (rest) => cmdTab(rest)],
lint         |  302 |   ["focus", (rest) => cmdFocus(rest)],
lint         |      :                                ^^^^
lint         |  303 |   ["zoom", (rest) => cmdZoom(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:303:30]
lint         |  302 |   ["focus", (rest) => cmdFocus(rest)],
lint         |  303 |   ["zoom", (rest) => cmdZoom(rest)],
lint         |      :                              ^^^^
lint         |  304 |   ["move", (rest) => cmdMove(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:304:30]
lint         |  303 |   ["zoom", (rest) => cmdZoom(rest)],
lint         |  304 |   ["move", (rest) => cmdMove(rest)],
lint         |      :                              ^^^^
lint         |  305 |   ["ws", (rest) => cmdWs(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:305:26]
lint         |  304 |   ["move", (rest) => cmdMove(rest)],
lint         |  305 |   ["ws", (rest) => cmdWs(rest)],
lint         |      :                          ^^^^
lint         |  306 |   ["clean", (rest) => cmdClean(rest)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:306:32]
lint         |  305 |   ["ws", (rest) => cmdWs(rest)],
lint         |  306 |   ["clean", (rest) => cmdClean(rest)],
lint         |      :                                ^^^^
lint         |  307 |   ["settings", (rest) => {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `any` value.
lint         |      ,-[src/commands/index.ts:308:14]
lint         |  307 |   ["settings", (rest) => {
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |      :              ^
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:308:63]
lint         |  307 |   ["settings", (rest) => {
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |      :                                                               ^^^^^^^^^^^^^
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
lint         |      ,-[src/commands/index.ts:308:63]
lint         |  307 |   ["settings", (rest) => {
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |      :                                                               ^^^^^^^^^^
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .slice on an `any` value.
lint         |      ,-[src/commands/index.ts:308:68]
lint         |  307 |   ["settings", (rest) => {
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |      :                                                                    ^^^^^
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `any` value.
lint         |      ,-[src/commands/index.ts:309:19]
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      :                   ^
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:309:68]
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      :                                                                    ^^^^^^^^^^^^^
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
lint         |      ,-[src/commands/index.ts:309:68]
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      :                                                                    ^^^^^^^^^^
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .slice on an `any` value.
lint         |      ,-[src/commands/index.ts:309:73]
lint         |  308 |     if (rest[0] === "models") dispatchAsync(cmdSettingsModels(rest.slice(1)));
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |      :                                                                         ^^^^^
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `any` value.
lint         |      ,-[src/commands/index.ts:310:19]
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      :                   ^
lint         |  311 |     else cmdSettings(rest);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:310:54]
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      :                                                      ^^^^^^^^^^^^^
lint         |  311 |     else cmdSettings(rest);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
lint         |      ,-[src/commands/index.ts:310:54]
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      :                                                      ^^^^^^^^^^
lint         |  311 |     else cmdSettings(rest);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .slice on an `any` value.
lint         |      ,-[src/commands/index.ts:310:59]
lint         |  309 |     else if (rest[0] === "notify") dispatchAsync(cmdSettingsNotify(rest.slice(1)));
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |      :                                                           ^^^^^
lint         |  311 |     else cmdSettings(rest);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:311:22]
lint         |  310 |     else if (rest[0] === "skills") cmdSettingsSkills(rest.slice(1));
lint         |  311 |     else cmdSettings(rest);
lint         |      :                      ^^^^
lint         |  312 |   }],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[].
lint         |      ,-[src/commands/index.ts:313:46]
lint         |  312 |   }],
lint         |  313 |   ["setup", (rest) => dispatchAsync(cmdSetup(rest))],
lint         |      :                                              ^^^^
lint         |  314 |   ["--version", () => process.stdout.write(`orch ${VERSION}\\n`)],
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
lint         |     ,-[test/adapter-bundle-diagnosis.test.ts:20:55]
lint         |  19 |     const diagnosis = diagnoseExtensionLink("pi", join(tempRoot, "pi", "extensions"), "pi-bridge");
lint         |  20 |     expect(diagnosis).toMatchObject({ status: "warn", detail: expect.stringContaining("run the user's build: bun run build:dev") });
lint         |     :                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  21 |   });
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/backend-herdr.test.ts:247:22]
lint         |  245 |       test("pane input submits through pane run", () => {
lint         |  246 | ,->     herdrArgv.length = 0;
lint         |  247 | |->     backend.paneInput!.submit("w0:p1", "ls");
lint         |      : `---                     ^
lint         |      : `---- This expression already has the type '{ submit: (handle: string, text: string) => void; sendKeys: (handle: string, keys: readonly string[]) => void; focus: (handle: string) => void; foreground: (handle: string) => PaneForeground; }'
lint         |  248 |     
lint         |      `----
lint         | 
lint         |   x typescript(non-nullable-type-assertion-style): Use a ! assertion to more succinctly remove null and undefined from the type.
lint         |     ,-[test/bridge-terminal.test.ts:26:75]
lint         |  25 |     fire(name: string, event: unknown = {}, context?: HarnessContext): void {
lint         |  26 |       for (const handler of handlers.get(name) ?? []) void handler(event, context as HarnessContext);
lint         |     :                                                                           ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  27 |     },
lint         |     `----
lint         | 
lint         |   x typescript(require-await): Function has no 'await' expression.
lint         |     ,-[test/bridge-terminal.test.ts:70:108]
lint         |  69 |       extensionHash: "test",
lint         |  70 |       ack: { messageIdOf: () => undefined, isAcked: () => false, markAcked: () => undefined, post: async () => true },
lint         |     :                                                                                                            ^^^
lint         |  71 |       reportStatus: reporter,
lint         |     `----
lint         | 
lint         |   x typescript(require-await): Function has no 'await' expression.
lint         |     ,-[test/bridge-terminal.test.ts:73:152]
lint         |  72 |     });
lint         |  73 |     registerAgentTools(harness, { presence, identity: { agentId: "pi", settleEvent: "agent_settled" }, notify: () => undefined, refreshLabels: async () => undefined });
lint         |     :                                                                                                                                                        ^^^
lint         |  74 |     const ctx = context();
lint         |     `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[test/close-always.test.ts:138:21]
lint         |  137 |     const oldClose = backend.close.bind(backend);
lint         |  138 |     const oldExit = process.exit;
lint         |      :                     ^^^^^^^^^^^^|
lint         |      :                           |     `-- This reference may be unbound and lose `this` context
lint         |  139 |     const oldExitCode = process.exitCode;
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[test/close-always.test.ts:175:26]
lint         |  174 |     const originalKill = process.kill.bind(process);
lint         |  175 |     const originalExit = process.exit;
lint         |      :                          ^^^^^^^^^^^^|
lint         |      :                                |     `-- This reference may be unbound and lose `this` context
lint         |  176 |     const oldExitCode = process.exitCode;
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/close-always.test.ts:180:8]
lint         |  176 |         const oldExitCode = process.exitCode;
lint         |  177 | ,->     process.kill = ((target: number, signal?: NodeJS.Signals | 0) => {
lint         |  178 | |         if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
lint         |  179 | |         return originalKill(target, signal as 0 | NodeJS.Signals | undefined);
lint         |  180 | |->     }) as typeof process.kill;
lint         |      : `---       ^^^^^^^^^^^|^^^^^^^^^^^
lint         |      : `---                  `-- Casting it to '(pid: number, signal?: string | number | undefined) => true' is unnecessary
lint         |      : `---- This expression already has the type '(target: number, signal?: 0 | Signals | undefined) => true'
lint         |  181 |         process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
lint         |      `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |      ,-[test/close-always.test.ts:179:42]
lint         |  178 |       if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
lint         |  179 |       return originalKill(target, signal as 0 | NodeJS.Signals | undefined);
lint         |      :                                   ^^^|^^ ^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^
lint         |      :                                      |                   `-- Casting it to '0 | Signals | undefined' is unnecessary
lint         |      :                                      `-- This expression already has the type '0 | Signals | undefined'
lint         |  180 |     }) as typeof process.kill;
lint         |      `----
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |      ,-[test/cmd-lock-serialize.test.ts:135:7]
lint         |  134 |       const started = Date.now();
lint         |  135 |       await expect(acquireCommandLock(root, { holder: "waiter", timeoutMs: 150, pollMs: 100 })).rejects.toThrow(/timed out/);
lint         |      :       ^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |      :         |                                                           `-- This expression is not Promise-like
lint         |  136 |       expect(Date.now() - started).toBeGreaterThanOrEqual(100);
lint         |      `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |      ,-[test/close-always.test.ts:259:26]
lint         |  258 |     const oldExitCode = process.exitCode;
lint         |  259 |     const originalExit = process.exit;
lint         |      :                          ^^^^^^^^^^^^|
lint         |      :                                |     `-- This reference may be unbound and lose `this` context
lint         |  260 |     process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
lint         |      `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any[] assigned to a parameter of type Entity[].
lint         |     ,-[test/command-workspace-fields.test.ts:66:59]
lint         |  65 |     
lint         |  66 | ,->     expect(buildEntities({ skipBackends: true })).toEqual([
lint         |  67 | |         expect.objectContaining({ key, paneId: "999999", presenceOnly: true, backend: "headless", workspace: "reported-workspace" }),
lint         |  68 | `->     ]);
lint         |  69 |       });
lint         |     `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |     ,-[test/commands-index.test.ts:25:23]
lint         |  24 |     const oldDir = process.env.ORCH_DIR;
lint         |  25 |     const oldStdout = process.stdout.write;
lint         |     :                       ^^^^^^^^^^^^^^^^^^^^|
lint         |     :                                 |         `-- This reference may be unbound and lose `this` context
lint         |  26 |     const oldStderr = process.stderr.write;
lint         |     `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |     ,-[test/commands-index.test.ts:26:23]
lint         |  25 |     const oldStdout = process.stdout.write;
lint         |  26 |     const oldStderr = process.stderr.write;
lint         |     :                       ^^^^^^^^^^^^^^^^^^^^|
lint         |     :                                 |         `-- This reference may be unbound and lose `this` context
lint         |  27 |     const oldExit = process.exit;
lint         |     `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |     ,-[test/commands-index.test.ts:27:21]
lint         |  26 |     const oldStderr = process.stderr.write;
lint         |  27 |     const oldExit = process.exit;
lint         |     :                     ^^^^^^^^^^^^|
lint         |     :                           |     `-- This reference may be unbound and lose `this` context
lint         |  28 |     let stdout = "";
lint         |     `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/commands-index.test.ts:32:27]
lint         |  31 |     writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
lint         |  32 |     process.stdout.write = ((chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; }) as typeof process.stdout.write;
lint         |     :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  33 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; }) as typeof process.stderr.write;
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/commands-index.test.ts:33:27]
lint         |  32 |     process.stdout.write = ((chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; }) as typeof process.stdout.write;
lint         |  33 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; }) as typeof process.stderr.write;
lint         |     :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  34 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     `----
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since it does not change the type of the expression.
lint         |     ,-[test/commands-index.test.ts:34:90]
lint         |  33 |     process.stderr.write = ((chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; }) as typeof process.stderr.write;
lint         |  34 |     process.exit = ((code?: number): never => { throw new Error(`exit ${code ?? 0}`); }) as typeof process.exit;
lint         |     :                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^|^^^^^^^^^^^
lint         |     :                                                      |                                              `-- Casting it to '(code?: string | number | null | undefined) => never' is unnecessary
lint         |     :                                                      `-- This expression already has the type '(code?: number | undefined) => never'
lint         |  35 |     try {
lint         |     `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |     ,-[test/commands-queue.test.ts:14:22]
lint         |  13 |     const oldDir = process.env.ORCH_DIR;
lint         |  14 |     const oldWrite = process.stdout.write;
lint         |     :                      ^^^^^^^^^^^^^^^^^^^^|
lint         |     :                                |         `-- This reference may be unbound and lose `this` context
lint         |  15 |     let output = "";
lint         |     `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
lint         |     ,-[test/commands-queue.test.ts:17:27]
lint         |  16 |     process.env.ORCH_DIR = dir;
lint         |  17 |     process.stdout.write = ((chunk: string | Uint8Array) => { output += chunk.toString(); return true; }) as typeof process.stdout.write;
lint         |     :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  18 |     try {
lint         |     `----
lint         | 
lint         |   x typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
lint         |      ,-[test/commands-lease.test.ts:155:5]
lint         |  154 | 
lint         |  155 |     cmdReap([key, "--json"]);
lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  156 | 
lint         |      `----
lint         |   help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.
lint         | 
lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
lint         |      ,-[test/control-dispatch.test.ts:100:5]
lint         |   99 |     recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });
lint         |  100 |     await expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/no pane input role/);
lint         |      :     ^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |      :       |                                                        `-- This expression is not Promise-like
lint         |  101 |   }, 15_000);
lint         |      `----
lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type NotifyEvent | null.
lint         |      ,-[test/daemon-events.test.ts:265:27]
lint         |  264 |         }, { name: "fallback", tab: "fallback-tab" }, states, now);
lint         |  265 | ,->     expect(event).toEqual(expect.objectContaining({
lint         |  266 | |         key,
lint         |  267 | |         agent: "Ada",
lint         |  268 | |         name: "Ada's worker",
lint         |  269 | |         dispatchId: "dispatch-asking",
lint         |  270 | |         tab: "tab-a",
lint         |  271 | |         model: "model-a:\"deep\"",
lint         |  272 | |         oldState: "working",
lint         |  273 | |         newState: "asking",
lint         |  274 | |         cost: 1.5,
lint         |  275 | |         ts: now.toISOString(),
lint         |  276 | |         lastError: "ignored for asking",
lint         |  277 | |         lastText: "latest answer",
lint         |  278 | |         task: "Q: Need input",
lint         |  279 | |         ctxPercent: 42,
lint         |  280 | |         tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
lint         |  281 | |         filesTouched: ["a.ts", "b.ts"],
lint         |  282 | `->     }));
lint         |  283 |         expect(event?.task).toBe("Q: Need input");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type SessionData.
lint         |     ,-[test/session.test.ts:9:40]
lint         |   8 |   test("returns an empty view for null and missing paths", () => {
lint         |   9 |     expect(parseSession(null)).toEqual(expect.objectContaining({ exists: false, path: "", entries: [] }));
lint         |     :                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  10 |     expect(parseSession("/missing/session.jsonl")).toEqual(expect.objectContaining({ exists: false, path: "/missing/session.jsonl", entries: [] }));
lint         |     `----
lint         | 
lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type SessionData.
lint         |     ,-[test/session.test.ts:10:60]
lint         |   9 |     expect(parseSession(null)).toEqual(expect.objectContaining({ exists: false, path: "", entries: [] }));
lint         |  10 |     expect(parseSession("/missing/session.jsonl")).toEqual(expect.objectContaining({ exists: false, path: "/missing/session.jsonl", entries: [] }));
lint         |     :                                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  11 |   });
lint         |     `----
lint         | 
lint         |   x typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
lint         |     ,-[test/spawn-limits.test.ts:53:24]
lint         |  52 | ): string {
lint         |  53 |   const originalExit = process.exit;
lint         |     :                        ^^^^^^^^^^^^|
lint         |     :                              |     `-- This reference may be unbound and lose `this` context
lint         |  54 |   const originalWrite = process.stderr.write.bind(process.stderr);
lint         |     `----
lint         |   help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.
lint         | 
lint         |   x typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
lint         |      ,-[scripts/reset.ts:238:7]
lint         |  237 |       if (liveStorePresent()) throw new Error(`refusing to remove live orch store ${ORCH_DIR}; stop agents and retry`);
lint         |  238 |       step.execute();
lint         |      :       ^^^^^^^^^^^^^^^
lint         |  239 |     },
lint         |      `----
lint         |   help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.
lint         | 
lint         | Found 0 warnings and 114 errors.
lint         | Finished in 1.3s on 299 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
