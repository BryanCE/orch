# 02-presence

Owns: `src/agent/presence.ts`

`let ownSessionKey` (line ~68), `sessionKey()` (~70) and `computeKey(hasUI)` (~77) are module-level but are used only inside `createAgentPresence` (lines ~408 and ~426).

Do:
- Move all three inside `createAgentPresence`, after the `state` declaration, as closure locals, keeping the explanatory comment block that sits above `ownSessionKey` with them. One presence instance mints one session key.
- Nothing else changes; the two call sites keep their shape.

Check: `bun check`. Tests: `test/agent-key-is-minted-id.test.ts`, `test/bridge-apply.test.ts`.
