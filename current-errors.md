$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:35:9]
 34 | function orchestratorBridgeExtension(pi: ExtensionAPI): void {
 35 |   const hud = activePaneHud();
    :         ^^^^^^^^^^^^^^^^^^^^^
 36 |   const paneId = hud.paneHandle;
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
    ,-[extensions/pi/index.ts:35:15]
 34 | function orchestratorBridgeExtension(pi: ExtensionAPI): void {
 35 |   const hud = activePaneHud();
    :               ^^^^^^^^^^^^^
 36 |   const paneId = hud.paneHandle;
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:36:9]
 35 |   const hud = activePaneHud();
 36 |   const paneId = hud.paneHandle;
    :         ^^^^^^^^^^^^^^^^^^^^^^^
 37 | 
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .paneHandle on an `error` typed value.
    ,-[extensions/pi/index.ts:36:22]
 35 |   const hud = activePaneHud();
 36 |   const paneId = hud.paneHandle;
    :                      ^^^^^^^^^^
 37 | 
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
    ,-[extensions/pi/index.ts:38:3]
 37 | 
 38 |   hud.registerPaneState(
    :   ^^^^^^^^^^^^^^^^^^^^^
 39 |     {
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .registerPaneState on an `error` typed value.
    ,-[extensions/pi/index.ts:38:7]
 37 | 
 38 |   hud.registerPaneState(
    :       ^^^^^^^^^^^^^^^^^
 39 |     {
    `----

  x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
    ,-[extensions/pi/index.ts:40:76]
 39 |     {
 40 |       onSessionStart: (handler) => pi.on("session_start", (_event, ctx) => handler(ctx)),
    :                                                                            ^^^^^^^^^^^^
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
    ,-[extensions/pi/index.ts:40:76]
 39 |     {
 40 |       onSessionStart: (handler) => pi.on("session_start", (_event, ctx) => handler(ctx)),
    :                                                                            ^^^^^^^
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
    `----

  x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
    ,-[extensions/pi/index.ts:41:72]
 40 |       onSessionStart: (handler) => pi.on("session_start", (_event, ctx) => handler(ctx)),
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
    :                                                                        ^^^^^^^^^^^^
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
    ,-[extensions/pi/index.ts:41:72]
 40 |       onSessionStart: (handler) => pi.on("session_start", (_event, ctx) => handler(ctx)),
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
    :                                                                        ^^^^^^^
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
    `----

  x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
    ,-[extensions/pi/index.ts:42:62]
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
    :                                                              ^^^^^^^^^^^^^^
 43 |       onSessionShutdown: (handler) => pi.on("session_shutdown", (event) => handler(event)),
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
    ,-[extensions/pi/index.ts:42:62]
 41 |       onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
    :                                                              ^^^^^^^
 43 |       onSessionShutdown: (handler) => pi.on("session_shutdown", (event) => handler(event)),
    `----

  x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
    ,-[extensions/pi/index.ts:43:76]
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
 43 |       onSessionShutdown: (handler) => pi.on("session_shutdown", (event) => handler(event)),
    :                                                                            ^^^^^^^^^^^^^^
 44 |     },
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
    ,-[extensions/pi/index.ts:43:76]
 42 |       onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
 43 |       onSessionShutdown: (handler) => pi.on("session_shutdown", (event) => handler(event)),
    :                                                                            ^^^^^^^
 44 |     },
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:51:5]
 50 |     pi,
 51 |     paneId,
    :     ^^^^^^
 52 |     extensionHash: EXTENSION_HASH,
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:54:5]
 53 |     ack: createDaemonAck(ORCH_DIR),
 54 |     reportStatus: hud.statusReporter(paneId),
    :     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 55 |   });
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
    ,-[extensions/pi/index.ts:54:19]
 53 |     ack: createDaemonAck(ORCH_DIR),
 54 |     reportStatus: hud.statusReporter(paneId),
    :                   ^^^^^^^^^^^^^^^^^^
 55 |   });
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .statusReporter on an `error` typed value.
    ,-[extensions/pi/index.ts:54:23]
 53 |     ack: createDaemonAck(ORCH_DIR),
 54 |     reportStatus: hud.statusReporter(paneId),
    :                       ^^^^^^^^^^^^^^
 55 |   });
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:58:11]
 57 |       async function refreshLabels(): Promise<void> {
 58 | ,->     const applied = await hud.readLabels((labels) => {
 59 | |         presence.state.label = labels.label;
 60 | |         presence.state.tabLabel = labels.tabLabel;
 61 | `->     });
 62 |         if (applied) presence.writeStatus();
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
    ,-[extensions/pi/index.ts:58:27]
 57 |   async function refreshLabels(): Promise<void> {
 58 |     const applied = await hud.readLabels((labels) => {
    :                           ^^^^^^^^^^^^^^
 59 |       presence.state.label = labels.label;
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .readLabels on an `error` typed value.
    ,-[extensions/pi/index.ts:58:31]
 57 |   async function refreshLabels(): Promise<void> {
 58 |     const applied = await hud.readLabels((labels) => {
    :                               ^^^^^^^^^^
 59 |       presence.state.label = labels.label;
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
    ,-[extensions/pi/index.ts:59:7]
 58 |     const applied = await hud.readLabels((labels) => {
 59 |       presence.state.label = labels.label;
    :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 60 |       presence.state.tabLabel = labels.tabLabel;
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .label on an `any` value.
    ,-[extensions/pi/index.ts:59:37]
 58 |     const applied = await hud.readLabels((labels) => {
 59 |       presence.state.label = labels.label;
    :                                     ^^^^^
 60 |       presence.state.tabLabel = labels.tabLabel;
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an any value.
    ,-[extensions/pi/index.ts:60:7]
 59 |       presence.state.label = labels.label;
 60 |       presence.state.tabLabel = labels.tabLabel;
    :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 61 |     });
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .tabLabel on an `any` value.
    ,-[extensions/pi/index.ts:60:40]
 59 |       presence.state.label = labels.label;
 60 |       presence.state.tabLabel = labels.tabLabel;
    :                                        ^^^^^^^^
 61 |     });
    `----

  x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
    ,-[extensions/pi/index.ts:67:5]
 66 |     presence,
 67 |     notify: hud.notify,
    :     ^^^^^^^^^^^^^^^^^^
 68 |     refreshLabels,
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .notify on an `error` typed value.
    ,-[extensions/pi/index.ts:67:17]
 66 |     presence,
 67 |     notify: hud.notify,
    :                 ^^^^^^
 68 |     refreshLabels,
    `----

  x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
    ,-[extensions/pi/index.ts:71:3]
 70 | 
 71 |   hud.registerBlockedRelay(pi.events, onBlockedChange);
    :   ^^^^^^^^^^^^^^^^^^^^^^^^
 72 | }
    `----

  x typescript(no-unsafe-member-access): Unsafe member access .registerBlockedRelay on an `error` typed value.
    ,-[extensions/pi/index.ts:71:7]
 70 | 
 71 |   hud.registerBlockedRelay(pi.events, onBlockedChange);
    :       ^^^^^^^^^^^^^^^^^^^^
 72 | }
    `----

  x typescript(require-await): Function has no 'await' expression.
     ,-[src/hud/port.ts:147:23]
 146 |   notify: () => { /* no plexer notifier */ },
 147 |   readLabels: async () => false,
     :                       ^^^
 148 |   registerBlockedRelay: () => { /* no plexer signal */ },
     `----

Found 0 warnings and 30 errors.
Finished in 466ms on 170 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
