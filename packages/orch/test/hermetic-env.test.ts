import { describe, expect, test } from "bun:test";

// The suite must not depend on whether the developer is sitting inside a plexer.
// With HERDR_* set, `currentSpace()` resolved to the ambient herdr workspace, the
// space wall then filtered out every fixture-seeded agent, and `resolveTarget`
// refused — which, before refusals became throwable, killed the runner outright
// and silently skipped every remaining test file. Requiring the operator to
// remember `env -u HERDR_ENV …` is not a fix; the suite strips it itself.
describe("the test suite is hermetic", () => {
  test("no plexer environment leaks in from the shell that launched bun", () => {
    const leaked = Object.keys(process.env).filter((name) => /^(?:HERDR|TMUX)(?:_|$)/.test(name));
    expect(leaked).toEqual([]);
  });
});
