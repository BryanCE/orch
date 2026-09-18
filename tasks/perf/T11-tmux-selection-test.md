# T11. `cli-backends-tmux.test.ts`: an explicit selection no longer probes PATH

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, comments two lines max.

`validateBackend` (`src/backends/registry.ts`) no longer calls `isAvailable()`. The settings declare the plexers; setup and doctor settle whether they exist. An explicit selection of a registered backend resolves, PATH or not.

Edit `test/cli-backends-tmux.test.ts` only. Replace the test `"explicit selection follows tmux availability"` (L28-35) with:

```ts
  test("explicit selection resolves the registered backend without a PATH probe", () => {
    const backend = getBackend("tmux")!;
    const oldAvailable = backend.isAvailable;
    backend.isAvailable = () => { throw new Error("isAvailable() ran on an explicit selection"); };
    try {
      expect(resolveBackend({ explicit: "tmux", configured: null }).id).toBe("tmux");
    } finally {
      backend.isAvailable = oldAvailable;
    }
  });
```

If `isAvailable` is not assignable on the instance (read how L74-91 of the same file swap it), swap it on `TmuxBackend.prototype` the way those tests do, and restore it in `finally`.

Run, once, after the edit (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/cli-backends-tmux.test.ts"
```

Report: one line. `done: cli-backends-tmux.test.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
