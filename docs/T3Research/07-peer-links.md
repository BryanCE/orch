# T3 Code peer links: one machine driving agents on another

Source: `pingdotgg/t3code` at `7fe1310`. Main sources: `docs/internals/remote.md` ("Peer
links"), `docs/user/remote-access.md` ("Link another environment"),
`apps/server/src/peer/` (`PeerLinks.ts`, `PeerForwarding.ts`, `RemoteDelegation.ts`,
`PeerLinkRequests.ts`), `apps/server/src/mcp/linkOrigin.ts`.

This is the part of T3 closest to what orch needs: server to server, so agents on one
machine launch, message, wait on and stop agents on another. It is a beta behind
`linkedEnvironmentsEnabled`, which both machines must turn on.

## How a link is made

Machine A signs in to machine B's `/mcp` endpoint as an ordinary outside MCP OAuth client,
using a pairing code from B, and registers with `software_id: t3code-peer-link`
(`PeerLinks.ts:85-88`, `279-322`). A keeps B's session token in its own secret store.

- B needs nothing new. It sees one more OAuth client, lists it under Sharing & access,
  and revokes it there.
- Unlinking on A only forgets the token.
- From a terminal: `t3 environment link <address> --pairing-code <code> --access <mode>`.
- If A's client already holds a session on B that can manage access, it mints the pairing
  code itself.
- An agent can ask for a link ("delegate this to my vps"). The user approves on a card.
  The pairing code goes straight into `PeerLinks.link` and never enters the agent's
  context (`PeerLinkRequests.ts`).
- Links last 30 days. Link again with a new code to renew.

## What crosses the link

- Any MCP tool whose parameters take `OrchestratorMcpEnvironmentTarget` as `environmentId`
  is sent to B, after A's own access check refuses read-only or ended callers.
- Every forwarded call carries the calling agent's modes in `T3-Mode-Limit`, which B only
  uses to narrow access. A plan-mode agent cannot start full-access work through a
  full-access link.
- The token goes only to an address whose descriptor reports B's `environmentId`.
- All callers on A share one session on B, so idempotency keys are hashed with the caller's
  namespace before they leave.
- A forwarded wait is split into calls of at most 50 s, because B's `/mcp` sends nothing
  while a wait is open and the T3 Connect edge drops idle requests after about 100 s.
- Transport is plain HTTP to B over whatever route works (LAN, Tailscale, T3 Connect). The
  relay plays no part.

## Delegated tasks across machines

`delegate_task` can run its child on B. The child is an ordinary thread on B, in the project
with the same repository or one named by `target.projectId`. The parent on A records
`remoteChild` instead of a child thread id. A follower in `RemoteDelegation.ts` waits on
that thread and completes the parent's task with `delegated_task.remote.complete`. Open
remote tasks are followed again at startup. If B revokes the link, the task fails with that
reason.

## Fencing by provenance

Work a link starts carries an immutable `linkOrigin` with the access it was paired with,
and so does everything derived from it (subagents, forks). Below full access:

- linked work may change only threads with the same origin;
- it cannot change projects, settings, scheduled tasks, or use B's own links;
- B skips its project setup scripts for it.

Reads are not fenced. A full-access link is not fenced at all, because its agents can
already do anything B's user can. "The link is routing, not isolation."

## Takeaways for orch

- Identity of the caller crosses the link: B knows a request came from link L, with
  ceiling M, on behalf of caller C. orch needs the same so leases and provenance (Rule 11,
  Rule 19) hold across machines: B must know "agent X on @home spawned this".
- `linkOrigin` is orch's provenance, made immutable and carried to descendants. orch
  already has provenance as a fact; it needs a host column on it.
- Following remote work across restarts (`RemoteDelegation`) is what "work survives its
  spawner" means across machines.
- T3 makes linking one-directional and explicit per pair. For Bryan's "to and from any
  machine", every pair needs a link both ways. With SSH as the transport, the link is the
  SSH config entry; no pairing step is needed.
