# 4-03b-daemon-state-watches

Owns: `src/daemon/orchd.ts`. Chain: after `4-03a`, context kept.

Goal: move `outboxDrain`, `presenceWatch`, `settingsWatch`, `lastActivityAt` into `state`, same method as `4-03a`. `touchOnCall` (which writes `lastActivityAt`), the idle timer, the outbox drain interval, and the `daemon-status` handler's `subsystems` block are the main sites. Delete the four module-level declarations.

Check: lint, tc on this file. Tests: none (Bryan-only).
