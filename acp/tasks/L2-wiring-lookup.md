# L2: lookup for wiring an ACP session into orchd

Read-only on code. Writes one file: `acp/findings/acp-wiring.md`. Run no command except
`grep`, `cat`, `ls`, `git diff` and `git status`. Paths are relative to `/home/bryan/orch`.

Other agents are editing the tree. Report the code as it stands when you read it.

Every answer gives `path:line`, and every signature is copied exactly in a `ts` code block.

1. `acceptStatusReport` and `acceptResultReport` in
   `packages/orch/src/daemon/server/status-report.ts`: full signatures, the patch and result
   types they take, and one existing call of each from a handler, copied whole.
2. `recordQuestion` and `recordAgentQuestion`: full signatures, which one a server caller
   uses to open a question and move the agent to `asking`, and one existing call copied whole.
   How an answered question is marked answered, and by which function.
3. Where a bridge link is attached and detached: the function, its file, the `AgentLink`
   value it builds copied whole, and what calls `detachLink` when the socket closes.
4. How an outbox row is pushed down a link and how `ackOutboxRow` in
   `packages/orch/src/daemon/server/outbox.ts` is called: both signatures, and the message
   shape the link receives, copied whole.
5. `startHeldAgent` and whatever starts a PTY for a held agent: signatures, the caller in the
   spawn path, and where the held agent's pid and log path are recorded in the store.
6. The function added to `packages/orch/src/daemon/server/held.ts` that opens a screen orchd
   writes: its signature and return type. `holdPipes`, `heldPipes`, `releasePipes` in
   `packages/orch/src/daemon/server/held-pipes.ts`: signatures.
7. Where an agent's log path is decided at spawn and stored, and the helper that returns it.
8. How a session id reaches the store for an agent today: the function and its signature.
9. Where `SessionViewEntry` values are turned into text for `orch tail` and `orch peek`: the
   function, its signature, and whether its file is server, client or shared under
   `packages/orch/scripts/check-layers.ts`.
10. How the liveness tick marks an agent `exited` when its process is gone: the function,
    and what it checks for a held agent.
11. How orchd learns its own package version and name for a client info value: the helper.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/acp-wiring.md" or "blocked: <exact error>".
