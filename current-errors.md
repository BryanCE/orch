$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1283 files scanned)
@bryance/orch check: check:bridge | Done in 1.03s
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(38,67): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(46,59): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(47,58): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(49,43): error TS2741: Property 'maxAttempts' is missing in type '{ now: () => number; deliver: (target: string) => Promise<OutboxDelivery>; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(57,30): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(64,59): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(69,36): error TS2741: Property 'maxAttempts' is missing in type '{ now: () => number; deliver: () => Promise<"acked">; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/broker-daemon-hardening.test.ts(71,37): error TS2741: Property 'maxAttempts' is missing in type '{ now: () => number; deliver: () => Promise<"acked">; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(28,18): error TS2353: Object literal may only specify known properties, and 'messageId' does not exist in type 'BridgeMessage'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(34,18): error TS2353: Object literal may only specify known properties, and 'messageId' does not exist in type 'BridgeMessage'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(49,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: (target: string) => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(49,65): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(62,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: (target: string) => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(62,67): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(65,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: (target: string) => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox-replay.test.ts(65,67): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox.test.ts(30,68): error TS2322: Type '{ text: string; }' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           |   Type '{ text: string; }' is missing the following properties from type '{ readonly action: "answer"; readonly text: string; readonly questionId: string; }': action, questionId
@bryance/orch check: tc           | test/outbox.test.ts(31,68): error TS2322: Type '{ text: string; }' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           |   Type '{ text: string; }' is missing the following properties from type '{ readonly action: "answer"; readonly text: string; readonly questionId: string; }': action, questionId
@bryance/orch check: tc           | test/outbox.test.ts(36,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: (target: string) => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox.test.ts(36,56): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox.test.ts(37,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: (target: string) => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox.test.ts(37,56): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox.test.ts(43,80): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/outbox.test.ts(44,76): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/outbox.test.ts(54,72): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/outbox.test.ts(58,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: () => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox.test.ts(58,56): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/outbox.test.ts(65,39): error TS2741: Property 'maxAttempts' is missing in type '{ deliver: () => Promise<OutboxDelivery>; now: () => number; }' but required in type 'OutboxDeps'.
@bryance/orch check: tc           | test/outbox.test.ts(65,56): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'delivered' does not exist in type '{ retried: number; awaiting: number; }'.
@bryance/orch check: tc           | test/port-seam-channel.test.ts(10,10): error TS2305: Module '"../src/daemon/outbox.ts"' has no exported member 'consumeOutboxAcks'.
@bryance/orch check: tc           | test/retention.test.ts(102,64): error TS2322: Type '{}' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/retention.test.ts(103,64): error TS2322: Type '{}' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(25,79): error TS2353: Object literal may only specify known properties, and 'n' does not exist in type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(26,70): error TS2322: Type '(number | true)[]' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(29,43): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Type '[number, true]' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(30,52): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'n' does not exist in type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(36,72): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(37,70): error TS2322: Type 'string' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(47,68): error TS2322: Type '{}' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(60,66): error TS2322: Type '{}' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | test/store-outbox.test.ts(61,66): error TS2322: Type '{}' is not assignable to type 'BridgeMessage'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'die' is imported but never used.
@bryance/orch check: lint         |     ,-[src/commands/status.ts:22:3]
@bryance/orch check: lint         |  21 |   agentViewIndex,
@bryance/orch check: lint         |  22 |   die,
@bryance/orch check: lint         |     :   ^|^
@bryance/orch check: lint         |     :    `-- 'die' is imported here
@bryance/orch check: lint         |  23 |   firstNonEmptyText,
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |      ,-[test/control-dispatch.test.ts:161:26]
@bryance/orch check: lint         |  160 |         submit(handle: unknown, text: string): void { submitted.push({ handle, text }); },
@bryance/orch check: lint         |  161 |         sendKeys(): void {},
@bryance/orch check: lint         |      :                          ^^
@bryance/orch check: lint         |  162 |         focus(): void {},
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |      ,-[test/control-dispatch.test.ts:162:23]
@bryance/orch check: lint         |  161 |         sendKeys(): void {},
@bryance/orch check: lint         |  162 |         focus(): void {},
@bryance/orch check: lint         |      :                       ^^
@bryance/orch check: lint         |  163 |       },
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |     ,-[test/spawn-placement.test.ts:80:17]
@bryance/orch check: lint         |  79 |   create: () => { throw new Error("inert group home never creates"); },
@bryance/orch check: lint         |  80 |   rename: () => {},
@bryance/orch check: lint         |     :                 ^^
@bryance/orch check: lint         |  81 |   close: () => {},
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |     ,-[test/spawn-placement.test.ts:81:16]
@bryance/orch check: lint         |  80 |   rename: () => {},
@bryance/orch check: lint         |  81 |   close: () => {},
@bryance/orch check: lint         |     :                ^^
@bryance/orch check: lint         |  82 |   focus: () => {},
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |     ,-[test/spawn-placement.test.ts:82:16]
@bryance/orch check: lint         |  81 |   close: () => {},
@bryance/orch check: lint         |  82 |   focus: () => {},
@bryance/orch check: lint         |     :                ^^
@bryance/orch check: lint         |  83 |   move: () => {},
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-empty-function): Unexpected empty function
@bryance/orch check: lint         |     ,-[test/spawn-placement.test.ts:83:15]
@bryance/orch check: lint         |  82 |   focus: () => {},
@bryance/orch check: lint         |  83 |   move: () => {},
@bryance/orch check: lint         |     :               ^^
@bryance/orch check: lint         |  84 | };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this function or adding logic to it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |      ,-[src/control/dispatch.ts:116:1]
@bryance/orch check: lint         |  115 | 
@bryance/orch check: lint         |  116 | async function deliverAnswer(target: string, adapter: AgentAdapter, action: Extract<ControlAction, { kind: "answer" }>): Promise<ControlBoundaryOutcome> {
@bryance/orch check: lint         |      : ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  117 |   if (!adapter.bridge?.takes.includes("answer")) {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |     ,-[test/answer-dispatch.test.ts:64:5]
@bryance/orch check: lint         |  63 |     
@bryance/orch check: lint         |  64 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-1" }))
@bryance/orch check: lint         |     : |       ^^^^^
@bryance/orch check: lint         |  65 | |->       .resolves.toEqual({ outcome: "invoke", ack: "expected" });
@bryance/orch check: lint         |     : `---- This expression is not Promise-like
@bryance/orch check: lint         |  66 |         expect(deliveries).toEqual([{
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |     ,-[test/answer-dispatch.test.ts:79:5]
@bryance/orch check: lint         |  78 |     
@bryance/orch check: lint         |  79 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-2" }))
@bryance/orch check: lint         |     : |       ^^^^^
@bryance/orch check: lint         |  80 | |->       .resolves.toEqual({ outcome: "answer", reason: "not-asking", text: `${key} is not asking a question` });
@bryance/orch check: lint         |     : `---- This expression is not Promise-like
@bryance/orch check: lint         |  81 |         expect(deliveries).toHaveLength(0);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |     ,-[test/answer-dispatch.test.ts:90:5]
@bryance/orch check: lint         |  89 |     
@bryance/orch check: lint         |  90 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-3" }))
@bryance/orch check: lint         |     : |       ^^^^^
@bryance/orch check: lint         |  91 | |->       .rejects.toBeInstanceOf(BridgeDetachedError);
@bryance/orch check: lint         |     : `---- This expression is not Promise-like
@bryance/orch check: lint         |  92 |       });
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |      ,-[test/answer-dispatch.test.ts:105:5]
@bryance/orch check: lint         |  104 |     
@bryance/orch check: lint         |  105 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-4" }))
@bryance/orch check: lint         |      : |       ^^^^^
@bryance/orch check: lint         |  106 | |->       .rejects.toBeInstanceOf(AgentGoneError);
@bryance/orch check: lint         |      : `---- This expression is not Promise-like
@bryance/orch check: lint         |  107 |       });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |      ,-[test/answer-dispatch.test.ts:115:5]
@bryance/orch check: lint         |  114 |     
@bryance/orch check: lint         |  115 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-5" }))
@bryance/orch check: lint         |      : |       ^^^^^
@bryance/orch check: lint         |  116 | |         .resolves.toEqual({
@bryance/orch check: lint         |  117 | |           outcome: "answer",
@bryance/orch check: lint         |  118 | |           reason: "no-environment-role",
@bryance/orch check: lint         |  119 | |           text: `cannot answer ${key}: adapter claude takes no answers`,
@bryance/orch check: lint         |  120 | |->       });
@bryance/orch check: lint         |      : `---- This expression is not Promise-like
@bryance/orch check: lint         |  121 |       });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |     ,-[test/control-dispatch.test.ts:85:5]
@bryance/orch check: lint         |  84 |     
@bryance/orch check: lint         |  85 | ,->     await expect(deliverControl(key, { kind: "steer", text: "lost", id: "steer-1" }))
@bryance/orch check: lint         |     : |       ^^^^^
@bryance/orch check: lint         |  86 | |->       .rejects.toBeInstanceOf(BridgeDetachedError);
@bryance/orch check: lint         |     : `---- This expression is not Promise-like
@bryance/orch check: lint         |  87 |       });
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |     ,-[test/control-dispatch.test.ts:96:5]
@bryance/orch check: lint         |  95 |     
@bryance/orch check: lint         |  96 | ,->     await expect(deliverControl(key, { kind: "steer", text: "lost", id: "steer-1" }))
@bryance/orch check: lint         |     : |       ^^^^^
@bryance/orch check: lint         |  97 | |->       .rejects.toBeInstanceOf(AgentGoneError);
@bryance/orch check: lint         |     : `---- This expression is not Promise-like
@bryance/orch check: lint         |  98 |         expect(deliveries).toHaveLength(0);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
@bryance/orch check: lint         |      ,-[test/control-dispatch.test.ts:108:5]
@bryance/orch check: lint         |  107 |     
@bryance/orch check: lint         |  108 | ,->     await expect(deliverControl(key, { kind: "answer", text: "yes", id: "answer-1" }))
@bryance/orch check: lint         |      : |       ^^^^^
@bryance/orch check: lint         |  109 | |->       .resolves.toEqual({ outcome: "answer", reason: "not-asking", text: `${key} is not asking a question` });
@bryance/orch check: lint         |      : `---- This expression is not Promise-like
@bryance/orch check: lint         |  110 |         expect(deliveries).toHaveLength(0);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/outbox-ack.test.ts:51:71]
@bryance/orch check: lint         |  50 |     const calls: string[] = [];
@bryance/orch check: lint         |  51 |     const deliveryDeps = deps(3, async (_target, _payload, deliveryId) => {
@bryance/orch check: lint         |     :                                                                       ^^^
@bryance/orch check: lint         |  52 |       calls.push(deliveryId);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/outbox-ack.test.ts:60:57]
@bryance/orch check: lint         |  59 |     expect(outboxMessageState(dir, id)).toBe("delivered");
@bryance/orch check: lint         |  60 |     await deliverOutboxMessage(dir, id, deps(3, async () => {
@bryance/orch check: lint         |     :                                                         ^^^
@bryance/orch check: lint         |  61 |       calls.push("unexpected");
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/outbox-ack.test.ts:72:65]
@bryance/orch check: lint         |  71 |     insertOutboxMessage(dir, { id, target: "agent", payload: message("hello") });
@bryance/orch check: lint         |  72 |     const result = await drainOutbox(dir, deps(3, async (target) => {
@bryance/orch check: lint         |     :                                                                 ^^^
@bryance/orch check: lint         |  73 |       throw new BridgeDetachedError(target);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/outbox-ack.test.ts:88:50]
@bryance/orch check: lint         |  87 |     insertOutboxMessage(dir, { id, target: "agent", payload: message("hello") });
@bryance/orch check: lint         |  88 |     await drainOutbox(dir, deps(3, async (target) => {
@bryance/orch check: lint         |     :                                                  ^^^
@bryance/orch check: lint         |  89 |       throw new AgentGoneError(target, "ended");
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |      ,-[test/outbox-ack.test.ts:104:59]
@bryance/orch check: lint         |  103 | 
@bryance/orch check: lint         |  104 |     const result = await drainOutbox(dir, deps(3, async () => "failed"));
@bryance/orch check: lint         |      :                                                           ^^^
@bryance/orch check: lint         |  105 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |      ,-[test/outbox-ack.test.ts:124:82]
@bryance/orch check: lint         |  123 | 
@bryance/orch check: lint         |  124 |     await redeliverOpenRows(dir, "target", deps(10, async (_target, _payload, id) => {
@bryance/orch check: lint         |      :                                                                                  ^^^
@bryance/orch check: lint         |  125 |       delivered.push(id);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[test/port-seam-channel.test.ts:42:12]
@bryance/orch check: lint         |  41 |     appendAck(agentDir, id, key);
@bryance/orch check: lint         |  42 |     expect(consumeOutboxAcks(orchDir)).toBe(1);
@bryance/orch check: lint         |     :            ^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  43 |     expect(outboxMessageOpen(orchDir, id)).toBe(false);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 23 errors.
@bryance/orch check: lint         | Finished in 2.1s on 499 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
