# T7 review

No findings.

- `PtyHold.output` writes both PTY bytes and writer text to the same terminal and broadcasts them from its write callback. There is no second buffer or broadcast loop.
- `HeldSource` discriminates PTYs and writers. The PTY field is not nullable.
- Writer `close()` and PTY exit both call `PtyHold.end`, which drains pending writes before disposing the screen and notifying subscribers.
- Existing PTY methods retain their behavior after narrowing the source. The holder interfaces and screen RPC callers need no changes.
- The writer tests assert replay through `snapshot`, subsequent live output through `subscribe`, ignored viewer input, resizing, attached-feed termination, and detach behavior. Existing PTY tests are unchanged.

Verification pending: `bun check` failed outside the reviewed files. `src/daemon/server/spawn/plan.ts:75` fails the bridge capability check. Typechecking also reports missing `form` and `forms` fields in other source files and fixtures. No tests were run because this review changes no test or runtime file.

T7: 0 findings
