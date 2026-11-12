# ACP TypeScript SDK 2.6.0

Sources are the published tarball, not a checkout or an installed dependency. Download URL: `https://registry.npmjs.org/@agentclientprotocol/sdk/-/sdk-2.6.0.tgz`, recorded in `acp/reference/npm-sdk.json:165`. Extracted root, abbreviated below as `package/`:

`/tmp/claude-1000/-home-bryan-orch/f0cd823e-f445-4b4c-a865-538536ee281c/scratchpad/acp-sdk/package/`

Nothing from the archive was run, imported, or installed. Unless specified otherwise, these findings concern the default, stable v1 export. Version 2.6.0 is the npm package version, not the default protocol version.

## Client creation and handlers

`package/dist/v1/stable/acp.d.ts:679`:

```ts
export declare function client(options?: AppOptions): ClientApp;
```

It returns an app builder, not a connection. `AppOptions` has optional `name: string` at lines 369–374. Register `session/update` with `onNotification`, and `session/request_permission` with `onRequest`. Their inferred parameter types are `SessionNotification` and `RequestPermissionRequest`; the permission handler returns `MaybePromise<RequestPermissionResponse>`. Sources: lines 456–460, 510–530 and 726–746.

Exact registration signatures at lines 726–728 and 744–746:

```ts
    onRequest(method: "*", handler: ClientRequestHandler<unknown, unknown>): this;
    onRequest<Method extends ClientRequestMethod>(method: Method, handler: ClientRequestHandlersByMethod[Method]): this;
    onRequest<Params, Response>(method: string, params: ParamsParser<Params>, handler: ClientRequestHandler<Params, Response>): this;
    onNotification(method: "*", handler: ClientNotificationHandler<unknown>): this;
    onNotification<Method extends ClientNotificationMethod>(method: Method, handler: ClientNotificationHandlersByMethod[Method]): this;
    onNotification<Params>(method: string, params: ParamsParser<Params>, handler: ClientNotificationHandler<Params>): this;
```

For extensions, supply a method string, parameter parser, and handler. `"*"` without a parser installs a raw fallback after normal dispatch. Notification handlers start in arrival order but can overlap after awaiting; serialize asynchronous update application yourself. Source: lines 719–746.

Exact connection signatures at lines 696, 703 and 710:

```ts
    connect(stream: Stream): ClientConnection;
    connect(agent: AgentApp): ClientConnection;
    connectWith<T>(target: Stream | AgentApp, op: (context: ClientContext) => MaybePromise<T>): Promise<T>;
```

`connect` exposes `connection.agent`; `connectWith` supplies that `ClientContext` to its callback and closes the connection when the callback completes or throws. Sources: lines 124–134 and 704–710.

## Outgoing requests

Call `ClientContext.request(method, params)` for requests, and `ClientContext.notify` for cancellation. Exact signatures, `package/dist/v1/stable/acp.d.ts:211–220`:

```ts
    request<Method extends AgentRequestMethod>(method: Method, params: AgentRequestParamsByMethod[Method], options?: SendRequestOptions): Promise<AgentRequestResponsesByMethod[Method]>;
    request<Response = unknown, Params = unknown>(method: string, params?: Params, options?: SendRequestOptions): Promise<Response>;
    notify<Method extends AgentNotificationMethod>(method: Method, params: AgentNotificationParamsByMethod[Method]): Promise<void>;
    notify<Params = unknown>(method: string, params?: Params): Promise<void>;
```

The literal method overload infers the following types. Source: the exact handler map below at lines 479–490 and cancellation map at lines 499–501. Response inference removes `void` via `Exclude<Response, void>` at lines 549–550.

| Call | Params | Awaited result |
| --- | --- | --- |
| `request("initialize", params)` | `InitializeRequest` | `InitializeResponse` |
| `request("session/new", params)` | `NewSessionRequest` | `NewSessionResponse` |
| `request("session/load", params)` | `LoadSessionRequest` | `LoadSessionResponse` |
| `request("session/resume", params)` | `ResumeSessionRequest` | `ResumeSessionResponse` |
| `request("session/prompt", params)` | `PromptRequest` | `PromptResponse` |
| `notify("session/cancel", params)` | `CancelNotification` | `void` |
| `request("session/set_mode", params)` | `SetSessionModeRequest` | `SetSessionModeResponse` |
| `request("session/set_config_option", params)` | `SetSessionConfigOptionRequest` | `SetSessionConfigOptionResponse` |
| `request("session/close", params)` | `CloseSessionRequest` | `CloseSessionResponse` |
| `request("session/list", params)` | `ListSessionsRequest` | `ListSessionsResponse` |

These are map members, not separate convenience-method signatures:

```ts
    [schema.AGENT_METHODS.initialize]: AgentRequestHandler<schema.InitializeRequest, schema.InitializeResponse>;
    [schema.AGENT_METHODS.session_new]: AgentRequestHandler<schema.NewSessionRequest, schema.NewSessionResponse>;
    [schema.AGENT_METHODS.session_load]: AgentRequestHandler<schema.LoadSessionRequest, schema.LoadSessionResponse | void>;
    [schema.AGENT_METHODS.session_list]: AgentRequestHandler<schema.ListSessionsRequest, schema.ListSessionsResponse>;
    [schema.AGENT_METHODS.session_delete]: AgentRequestHandler<schema.DeleteSessionRequest, schema.DeleteSessionResponse | void>;
    [schema.AGENT_METHODS.session_resume]: AgentRequestHandler<schema.ResumeSessionRequest, schema.ResumeSessionResponse>;
    [schema.AGENT_METHODS.session_close]: AgentRequestHandler<schema.CloseSessionRequest, schema.CloseSessionResponse | void>;
    [schema.AGENT_METHODS.session_set_mode]: AgentRequestHandler<schema.SetSessionModeRequest, schema.SetSessionModeResponse | void>;
    [schema.AGENT_METHODS.session_set_config_option]: AgentRequestHandler<schema.SetSessionConfigOptionRequest, schema.SetSessionConfigOptionResponse>;
    [schema.AGENT_METHODS.authenticate]: AgentRequestHandler<schema.AuthenticateRequest, schema.AuthenticateResponse | void>;
    [schema.AGENT_METHODS.logout]: AgentRequestHandler<schema.LogoutRequest, schema.LogoutResponse | void>;
    [schema.AGENT_METHODS.session_prompt]: AgentRequestHandler<schema.PromptRequest, schema.PromptResponse>;
```

```ts
    [schema.AGENT_METHODS
        .session_cancel]: AgentNotificationHandler<schema.CancelNotification>;
```

Close is idempotent: a resource-not-found response to `session/close` resolves with an empty result rather than rejecting. Source: lines 207–210.

## NDJSON transport

`package/dist/v1/stable/acp.d.ts:28`:

```ts
export declare function ndJsonStream(output: WritableStream<Uint8Array>, input: ReadableStream<Uint8Array>, options?: NdJsonStreamOptions): Stream;
```

The first argument sends encoded bytes to the peer; the second receives bytes from it. These are Web Streams, not Node streams. The returned stream carries JSON-RPC messages. Exact shape at lines 15–20:

```ts
export type Stream = {
    /** Outgoing JSON-RPC messages written by this side of the connection. */
    writable: WritableStream<AnyMessage>;
    /** Incoming JSON-RPC messages read by this side of the connection. */
    readable: ReadableStream<AnyMessage>;
};
```

## Update, permission, and protocol types

The root re-exports generated types at `package/dist/v1/stable/acp.d.ts:3`. `SessionNotification` wraps the update at `package/dist/v1/schema/types.gen.d.ts:2401`. Its `SessionUpdate` union is copied exactly from lines 2428–2456:

```ts
export type SessionUpdate = (ContentChunk & {
    sessionUpdate: "user_message_chunk";
}) | (ContentChunk & {
    sessionUpdate: "agent_message_chunk";
}) | (ContentChunk & {
    sessionUpdate: "agent_thought_chunk";
}) | (ToolCall & {
    sessionUpdate: "tool_call";
}) | (ToolCallUpdate & {
    sessionUpdate: "tool_call_update";
}) | (Plan & {
    sessionUpdate: "plan";
}) | (AvailableCommandsUpdate & {
    sessionUpdate: "available_commands_update";
}) | (CurrentModeUpdate & {
    sessionUpdate: "current_mode_update";
}) | (ConfigOptionUpdate & {
    sessionUpdate: "config_option_update";
}) | (SessionInfoUpdate & {
    sessionUpdate: "session_info_update";
}) | (UsageUpdate & {
    sessionUpdate: "usage_update";
}) | (Notice & {
    sessionUpdate: "notice";
}) | (CompactionUpdate & {
    sessionUpdate: "compaction_update";
}) | (CompactionSummaryChunk & {
    sessionUpdate: "compaction_summary_chunk";
});
```

The variants use these exported component types; there are no separate named aliases for each message-chunk discriminant in this union.

`package/dist/v1/schema/types.gen.d.ts:2339`:

```ts
export type StopReason = "end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled";
```

Permission types in that same file: `RequestPermissionRequest` at line 108 has `sessionId: SessionId`, `toolCall: ToolCallUpdate`, and `options: Array<PermissionOption>`. `PermissionOption` is at line 595, `PermissionOptionId` at line 622, `RequestPermissionResponse` at line 3826, and `RequestPermissionOutcome` at line 3845. Exact option-kind declaration at line 628:

```ts
export type PermissionOptionKind = "allow_once" | "allow_always" | "reject_once" | "reject_always";
```

The root re-exports `PROTOCOL_VERSION` at `package/dist/v1/stable/acp.d.ts:5`. Declaration at `package/dist/v1/schema/index.d.ts:33`:

```ts
export declare const PROTOCOL_VERSION = 1;
```

## ClientSideConnection

It does not exist in the published declarations or JavaScript, so it has no current doc comment to copy. `package/MIGRATION_STABLE_UNSTABLE.md:314–317` explicitly says the deprecated `AgentSideConnection`, `ClientSideConnection`, `Agent`, and `Client` APIs were removed from both v1 profiles. Its replacement table at line 185 names `client().onRequest(...).onNotification(...).connect(...)` or `connectWith(...)`. The current `ClientConnection` doc comment at `package/dist/v1/stable/acp.d.ts:124–129` says:

```ts
/**
 * Client-side connection returned by `ClientApp.connect(...)`.
 *
 * Use `agent` to call agent-side ACP methods and session helpers for the
 * lifetime of the connection.
 */
```

## Package metadata

Source: `package/package.json`. No `dependencies` or `engines` fields exist. `type` is `"module"` at line 31. `peerDependencies` at lines 114–117:

```json
{
  "@modelcontextprotocol/server": "^2.4.0",
  "zod": "^3.25.76 || ^4.0.0"
}
```

`@modelcontextprotocol/server` is optional in `peerDependenciesMeta`, lines 118–122.

Exports at lines 34–99 are listed below. For each JavaScript entry, `types` uses the same path ending in `.d.ts`, and both `import` and `default` use the `.js` path. The four schema entries map directly to their matching JSON path.

| Export | Target |
| --- | --- |
| `.` | `./dist/v1/stable/acp.js` |
| `./unstable` | `./dist/v1/unstable/acp.js` |
| `./experimental/v2` | `./dist/v2/stable/acp.js` |
| `./experimental/v2/unstable` | `./dist/v2/unstable/acp.js` |
| `./experimental/nes` | `./dist/nes/acp.js` |
| `./experimental/http-client` | `./dist/transports/http-stream.js` |
| `./experimental/ws-client` | `./dist/transports/ws-stream.js` |
| `./experimental/server` | `./dist/transports/server.js` |
| `./experimental/node` | `./dist/transports/node-adapter.js` |
| `./experimental/mcp-http` | `./dist/mcp/http.js` |
| `./experimental/mcp-server` | `./dist/mcp/mcp-server.js` |
| `./schema/v1/schema.json` | `./schema/v1/schema.json` |
| `./schema/v1/schema.unstable.json` | `./schema/v1/schema.unstable.json` |
| `./schema/v2/schema.json` | `./schema/v2/schema.json` |
| `./schema/v2/schema.unstable.json` | `./schema/v2/schema.unstable.json` |

## Non-relative JavaScript imports

These are all distinct non-relative module names in `package/dist/**/*.js`:

- `zod/v4`: `dist/core/schema-deserialize.js:1`, `dist/nes/schema/zod.gen.js:4`, both `dist/v1/schema/guards.gen.js:2` and `zod.gen.js:3`, both `dist/v1/unstable/schema/guards.gen.js:2` and `zod.gen.js:3`, and the corresponding four v2 files at the same lines.
- `node:crypto`: `dist/mcp/http.js:1`.
- `node:http`: `dist/mcp/http.js:2`.
- `@modelcontextprotocol/server`: `dist/mcp/mcp-server.js:1`.

No non-relative dynamic imports or `require` calls were found.

## Example, not run

Thirty lines. The caller supplies the process pipes and absolute working directory; this example does not spawn a program. It uses the signatures above from `dist/v1/stable/acp.d.ts:28, 211, 679, 710, 726–746`.

```ts
import {
  client,
  ndJsonStream,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
export async function promptOnce(
  input: WritableStream<Uint8Array>,
  output: ReadableStream<Uint8Array>,
  cwd: string,
): Promise<void> {
  const app = client({ name: "orch-example" });
  app.onNotification("session/update", ({ params }) => {
    console.log(params.update);
  });
  app.onRequest("session/request_permission", () => ({
    outcome: { outcome: "cancelled" },
  }));
  const stream = ndJsonStream(input, output);
  await app.connectWith(stream, async (agent) => {
    await agent.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
    });
    const session = await agent.request("session/new", { cwd, mcpServers: [] });
    const result = await agent.request("session/prompt", {
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "Hello" }],
    });
    console.log(result.stopReason);
  });
}
```
