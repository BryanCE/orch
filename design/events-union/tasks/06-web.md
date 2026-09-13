# 06-web

Model: `luna:low`.

Owns: `packages/web/src/lib/daemon-events.ts`, `packages/web/src/components/DaemonEventList.tsx`

The daemon's event line now carries `type` (`"transition" | "asking" | "message" | "closed" | "task"`) and every member has `newState`; `oldState` is absent on `message`. The web package keeps its own untyped `DaemonEvent = Record<string, unknown>` (it reads server-sent JSON and validates by `typeof`).

Do:
1. `daemon-events.ts`, `withTransition`: unchanged in behaviour (it reads `newState`, which every member has).
2. `DaemonEventList.tsx`, `DaemonEventRow`: read `const type = typeof event.type === "string" ? event.type : "?"` and render it as a small label before the state pair; for a row whose `oldState` is not a string (a message event) render just `newState` instead of `? → newState`.

Check: `bun run check:web` from the repo root. Tests: none named.
