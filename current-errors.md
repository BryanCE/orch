$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1357 files scanned)
@bryance/orch check: check:bridge | Done in 997ms
@bryance/orch check: tc           | src/daemon/events.ts(56,45): error TS2540: Cannot assign to 'input' because it is a read-only property.
@bryance/orch check: tc           | src/daemon/events.ts(57,46): error TS2540: Cannot assign to 'output' because it is a read-only property.
@bryance/orch check: tc           | src/daemon/events.ts(58,49): error TS2540: Cannot assign to 'cacheRead' because it is a read-only property.
@bryance/orch check: tc           | src/daemon/events.ts(59,50): error TS2540: Cannot assign to 'cacheWrite' because it is a read-only property.
@bryance/orch check: tc           | src/daemon/events.ts(285,28): error TS2339: Property 'dispatchId' does not exist on type 'NotifyEvent'.
@bryance/orch check: tc           |   Property 'dispatchId' does not exist on type 'EventIdentity & { readonly type: "closed"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "closed"; }'.
@bryance/orch check: tc           | src/daemon/events.ts(480,26): error TS2339: Property 'dispatchId' does not exist on type '(EventIdentity & { readonly type: "closed"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "closed"; }) | (EventIdentity & ... 1 more ... & { ...; }) | (EventIdentity & ... 1 more ... & { ...; })'.
@bryance/orch check: tc           |   Property 'dispatchId' does not exist on type 'EventIdentity & { readonly type: "closed"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "closed"; }'.
@bryance/orch check: tc           | src/daemon/events.ts(481,20): error TS2339: Property 'task' does not exist on type '(EventIdentity & { readonly type: "closed"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "closed"; }) | (EventIdentity & ... 1 more ... & { ...; }) | (EventIdentity & ... 1 more ... & { ...; })'.
@bryance/orch check: tc           |   Property 'task' does not exist on type 'EventIdentity & { readonly type: "closed"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "closed"; }'.
@bryance/orch check: tc           | src/daemon/orchd.ts(439,5): error TS2322: Type 'string' is not assignable to type '"aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"'.
@bryance/orch check: tc           | src/daemon/orchd.ts(705,15): error TS2322: Type '{ key: string; agent: string | null; tab: string | null; model: string | null; oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; ... 8 more ...; gaveUp: false; } | { ...; }' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ key: string; agent: string | null; tab: string | null; model: string | null; oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; ... 8 more ...; gaveUp: false; }' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           |     Type '{ key: string; agent: string | null; tab: string | null; model: string | null; oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; ... 8 more ...; gaveUp: false; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |       Type '{ key: string; agent: string | null; tab: string | null; model: string | null; oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; ... 8 more ...; gaveUp: false; }' is not assignable to type '{ readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |         Types of property 'newState' are incompatible.
@bryance/orch check: tc           |           Type '"aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"' is not assignable to type '"asking"'.
@bryance/orch check: tc           |             Type '"aborted"' is not assignable to type '"asking"'.
@bryance/orch check: tc           | src/daemon/orchd.ts(829,90): error TS2339: Property 'cost' does not exist on type 'NotifyEvent'.
@bryance/orch check: tc           |   Property 'cost' does not exist on type 'EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }'.
@bryance/orch check: tc           | src/daemon/orchd.ts(829,111): error TS2339: Property 'task' does not exist on type 'NotifyEvent'.
@bryance/orch check: tc           |   Property 'task' does not exist on type 'EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }'.
@bryance/orch check: tc           | src/daemon/orchd.ts(829,151): error TS2339: Property 'task' does not exist on type 'NotifyEvent'.
@bryance/orch check: tc           |   Property 'task' does not exist on type 'EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }'.
@bryance/orch check: tc           | src/daemon/work-loop.ts(239,13): error TS2322: Type '(EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }) | (EventIdentity & { ...; }) | (EventIdentity & { ...; }) | (EventIdentity & ... 1 more ... & { ...; })' is not assignable to type 'never'.
@bryance/orch check: tc           |   Type 'EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }' is not assignable to type 'never'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(77,17): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           | test/daemon-rpc.test.ts(90,31): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'NotifyEvent'.
@bryance/orch check: tc           | test/daemon-rpc.test.ts(391,19): error TS2353: Object literal may only specify known properties, and 'kind' does not exist in type 'NotifyEvent'.
@bryance/orch check: tc           | test/daemon-rpc.test.ts(406,18): error TS2353: Object literal may only specify known properties, and 'value' does not exist in type 'NotifyEvent'.
@bryance/orch check: tc           | test/daemon-rpc.test.ts(414,19): error TS2353: Object literal may only specify known properties, and 'value' does not exist in type 'NotifyEvent'.
@bryance/orch check: tc           | test/daemon-rpc.test.ts(430,55): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'value' does not exist in type 'NotifyEvent'.
@bryance/orch check: tc           | test/notify-events-format.test.ts(172,22): error TS2345: Argument of type 'NotifyEvent | null' is not assignable to parameter of type 'NotifyEvent | undefined'.
@bryance/orch check: tc           |   Type 'null' is not assignable to type 'NotifyEvent | undefined'.
@bryance/orch check: tc           | test/notify-events-format.test.ts(175,22): error TS2345: Argument of type 'NotifyEvent | null' is not assignable to parameter of type 'NotifyEvent | undefined'.
@bryance/orch check: tc           |   Type 'null' is not assignable to type 'NotifyEvent | undefined'.
@bryance/orch check: tc           | test/notify-events-format.test.ts(178,22): error TS2345: Argument of type 'NotifyEvent | null' is not assignable to parameter of type 'NotifyEvent | undefined'.
@bryance/orch check: tc           |   Type 'null' is not assignable to type 'NotifyEvent | undefined'.
@bryance/orch check: tc           | test/notify-events-format.test.ts(179,22): error TS2345: Argument of type 'NotifyEvent | null' is not assignable to parameter of type 'NotifyEvent | undefined'.
@bryance/orch check: tc           |   Type 'null' is not assignable to type 'NotifyEvent | undefined'.
@bryance/orch check: tc           | test/orchd-rpc-reconnect.test.ts(75,19): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ name: string; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |     Type '{ name: string; }' is missing the following properties from type 'EventIdentity': key, ts, agent, tab, model
@bryance/orch check: tc           | test/orchd-rpc-reconnect.test.ts(84,19): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ name: string; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |     Type '{ name: string; }' is missing the following properties from type 'EventIdentity': key, ts, agent, tab, model
@bryance/orch check: tc           | test/orchd-rpc-reconnect.test.ts(90,19): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ name: string; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |     Type '{ name: string; }' is missing the following properties from type 'EventIdentity': key, ts, agent, tab, model
@bryance/orch check: tc           | test/orchd-rpc-reconnect.test.ts(107,19): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ name: string; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |     Type '{ name: string; }' is missing the following properties from type 'EventIdentity': key, ts, agent, tab, model
@bryance/orch check: tc           | test/orchd-rpc-reconnect.test.ts(115,19): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           |   Type '{ name: string; }' is not assignable to type 'EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: "aborted" | "asking" | "blocked" | "done" | "error" | "exited" | "idle" | "unknown" | "working"; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean; }'.
@bryance/orch check: tc           |     Type '{ name: string; }' is missing the following properties from type 'EventIdentity': key, ts, agent, tab, model
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(23,24): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(23,42): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(24,24): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(24,42): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(25,24): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(25,44): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(45,18): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(45,44): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(49,50): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(60,18): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(60,44): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type 'string' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(73,68): error TS2345: Argument of type 'number' is not assignable to parameter of type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(78,38): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Argument of type '{ event: number; seq: number; }' is not assignable to parameter of type 'BufferedEvent'.
@bryance/orch check: tc           |       Types of property 'event' are incompatible.
@bryance/orch check: tc           |         Type 'number' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/orchd-rpc-replay.test.ts(81,59): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Argument of type '{ event: number; seq: number; }' is not assignable to parameter of type 'BufferedEvent'.
@bryance/orch check: tc           |       Types of property 'event' are incompatible.
@bryance/orch check: tc           |         Type 'number' is not assignable to type 'NotifyEvent'.
@bryance/orch check: tc           | test/worker-prompt.test.ts(125,21): error TS2339: Property 'task' does not exist on type 'NotifyEvent'.
@bryance/orch check: tc           |   Property 'task' does not exist on type 'EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string; }; }'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/events.ts:285:9]
@bryance/orch check: lint         |  284 | ): RunRecord | undefined {
@bryance/orch check: lint         |  285 |   const dispatchId = event.dispatchId;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  286 |   if (!dispatchId) return undefined;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/events.ts:295:5]
@bryance/orch check: lint         |  294 |   const run: RunRecord = {
@bryance/orch check: lint         |  295 |     dispatchId,
@bryance/orch check: lint         |      :     ^^^^^^^^^^
@bryance/orch check: lint         |  296 |     agentKey: key,
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/events.ts:480:7]
@bryance/orch check: lint         |  479 |       oldState = event.oldState;
@bryance/orch check: lint         |  480 |       dispatchId = event.dispatchId ?? "";
@bryance/orch check: lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  481 |       task = event.task ?? "";
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/events.ts:481:7]
@bryance/orch check: lint         |  480 |       dispatchId = event.dispatchId ?? "";
@bryance/orch check: lint         |  481 |       task = event.task ?? "";
@bryance/orch check: lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  482 |       if (event.type === "asking") {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/orchd.ts:829:78]
@bryance/orch check: lint         |  828 |       const painted = isAgentId(event.key) ? event.key : undefined;
@bryance/orch check: lint         |  829 |       if (painted !== undefined) paintPane(painted, { state: event.newState, cost: event.cost ?? 0, ...(event.task === undefined ? {} : { task: event.task }) });
@bryance/orch check: lint         |      :                                                                              ^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  830 |       emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/daemon/orchd.ts:829:139]
@bryance/orch check: lint         |  828 |       const painted = isAgentId(event.key) ? event.key : undefined;
@bryance/orch check: lint         |  829 |       if (painted !== undefined) paintPane(painted, { state: event.newState, cost: event.cost ?? 0, ...(event.task === undefined ? {} : { task: event.task }) });
@bryance/orch check: lint         |      :                                                                                                                                           ^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  830 |       emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 6 errors.
@bryance/orch check: lint         | Finished in 5.9s on 525 files with 65 rules using 8 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
