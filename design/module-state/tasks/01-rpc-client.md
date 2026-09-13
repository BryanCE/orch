# 01-rpc-client

Owns: `src/daemon/rpc/client.ts`

`let nextRequestId = 1` (line ~18) is shared by every RPC call in the process, but a request id only has to be unique on the socket that carries it.

Do:
- Delete the `let`. Add a private helper:
  ```ts
  /** Request ids correlate a reply to its request on ONE socket; each connection starts its own count. */
  function requestIds(): () => number { let next = 1; return () => next++; }
  ```
- In `rpcCall` (line ~148): `const nextId = requestIds(); const id = nextId();` (one socket per call).
- In `subscribeEvents`, inside the `connect` closure that dials a socket (lines ~228-256): `const nextId = requestIds();` once per dial, and the three `encodeRequest(nextRequestId++, ...)` writes become `encodeRequest(nextId(), ...)`.
- Nothing else changes.

Check: `bun check`. Tests: `test/bridge-client.test.ts`, `test/orchd-rpc-reconnect.test.ts`.
