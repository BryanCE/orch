# T1. Encode the event line once per event in the subscriber fan-out

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, no new comments longer than two lines.

Edit `src/daemon/client/wire.ts`:
- L86 `function encodeLine(line: RpcLine): string` → make it `export function encodeLine(line: RpcLine): string`. Body unchanged.
- Add directly above `lineResponse` (L113):
  ```ts
  /** Write one already-encoded line to a live socket. */
  export function writeEncodedLine(socket: Socket, encoded: string): void {
    if (!socket.destroyed) socket.write(encoded);
  }
  ```
- Change `lineResponse` body to `writeEncodedLine(socket, encodeLine(line));`. Signature unchanged.

Edit `src/daemon/server/rpc.ts`:
- L14 import: add `encodeLine` and `writeEncodedLine` to the named imports from `"../client/wire.ts"`.
- L247-250 the `bus.on` handler. Replace the loop body so the event is encoded once:
  ```ts
  const unsubscribeBus = bus.on((event) => {
    const buffered = replayBuffer.push(event);
    const encoded = encodeLine({ kind: "event", ...buffered });
    for (const socket of subscriptions) writeEncodedLine(socket, encoded);
  });
  ```
No other caller of `lineResponse` changes.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/orchd-rpc-subscribe.test.ts test/orchd-rpc-replay.test.ts test/daemon-rpc.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: wire.ts rpc.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
