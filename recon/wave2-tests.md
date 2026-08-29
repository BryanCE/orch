First command: `files=$( (git diff --name-only; git ls-files --others --exclude-standard) | grep '^test/.*\.test\.ts$' | sort -u); orch lock run -- bun test $files .`

Summary: (no Bun summary line emitted; command exited 1 after 290 pass, 1 fail)

Fail block:
54 |     // write commands auto-start it and deliver through its code.
55 |     env: { ...process.env, ORCH_DIR: orchDir, ORCHD_ENTRYPOINT: path.join(import.meta.dir, "../src/daemon/orchd.ts") },
56 |     stdout: "pipe",
57 |     stderr: "pipe",
58 |   });
59 |   if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
                                   ^
error: orch review reject iterate-1 -m handle the empty case exited 1: orch daemon unavailable; run 'orch daemon start': orchd daemon is absent (/tmp/orch-review-dir-C2BbIx)

      at runOrch (/home/bryan/orch/test/review.test.ts:59:31)
      at <anonymous> (/home/bryan/orch/test/review.test.ts:119:12)
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [5186.54ms]

Second command: `orch lock run -- bun test test/backend-herdr.test.ts test/backend-tmux.test.ts test/commands-spawn.test.ts test/spawn-policy.test.ts test/orchd-rpc-reconnect.test.ts test/daemon-registration.test.ts`

 58 pass
 0 fail
 135 expect() calls
Ran 58 tests across 6 files. [2.85s]
