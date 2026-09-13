# 2b-status-verb-live-review

Model: luna:low
Owns: `src/commands/status-verb.ts`, `src/commands/status-live.ts`, `src/commands/review.ts`. Follow `2b-README.md`.

Sites:
- `status-live.ts:91` `ensureDaemon(orchDir())`
- `status-live.ts:131` `subscribeEvents(orchDir(), {}, ...)`
- `status-verb.ts`: no global reaches; `cmdStatusVerb` takes `services` and forwards it to the `status.ts` and `status-live.ts` functions it calls, which now take `services` first (you changed them in the previous task on this session, or their result was piped to you).
- `review.ts`: no global reaches; `cmdReview` and `cmdReviewInteractive` take `services` first and forward to whatever they call that now needs it.

Tests: `grep -l "status-verb\|status-live\|commands/review" test/*.ts`.
