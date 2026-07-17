orch > bun check
$ oxlint . && bunx tsc --noEmit && fallow check && bun run check:bridge

  × eslint(no-unused-vars): Identifier 'buildExtensionBundle' is imported but never used.
    ╭─[src/doctor.ts:10:10]
  9 │ import { runSSH, type SshResult } from "./remote.ts";
 10 │ import { buildExtensionBundle, extensionBundlePath, PI_EXTENSION_NAMES } from "./bridge-bundle.ts";
    ·          ──────────┬─────────
    ·                    ╰── 'buildExtensionBundle' is imported here
 11 │ import { allBackends, getBackend } from "./backends/registry.ts";
    ╰────
  help: Consider removing this import.

  × eslint(no-unused-vars): Identifier 'PI_EXTENSION_NAMES' is imported but never used.
    ╭─[src/doctor.ts:10:53]
  9 │ import { runSSH, type SshResult } from "./remote.ts";
 10 │ import { buildExtensionBundle, extensionBundlePath, PI_EXTENSION_NAMES } from "./bridge-bundle.ts";
    ·                                                     ─────────┬────────
    ·                                                              ╰── 'PI_EXTENSION_NAMES' is imported here
 11 │ import { allBackends, getBackend } from "./backends/registry.ts";
    ╰────
  help: Consider removing this import.

  × eslint(no-unused-vars): Type 'FixDescriptor' is imported but never used.
    ╭─[src/doctor.ts:17:49]
 16 │ import { packageRoot } from "./util.ts";
 17 │ import type { CheckResult, DoctorBackendReport, FixDescriptor, IgnoredPresenceRecord } from "./doctor-types.ts";
    ·                                                 ──────┬──────
    ·                                                       ╰── 'FixDescriptor' is imported here
 18 │ export type { CheckResult, DoctorBackendReport, FixDescriptor, IgnoredPresenceRecord } from "./doctor-types.ts";
    ╰────
  help: Consider removing this import.

  × eslint(no-unused-vars): Identifier 'recordSpawned' is imported but never used.
   ╭─[test/spawn-limits.test.ts:8:28]
 7 │ import { liveSpawnCounts } from "../src/commands/spawn.ts";
 8 │ import { presenceAgentDir, recordSpawned, type PresenceEntry, type SpawnedRecord } from "../src/store.ts";
   ·                            ──────┬──────
   ·                                  ╰── 'recordSpawned' is imported here
 9 │ import { writeSettingsFixture } from "./helpers/settings.ts";
   ╰────
  help: Consider removing this import.

  × typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
    ╭─[test/spawn-limits.test.ts:28:27]
 27 │ 
 28 │ function records(entries: Array<[string, string, number?]>): { records: Map<string, SpawnedRecord>; presence: Map<string, PresenceEntry> } {
    ·                           ────────────────────────────────
 29 │   const registry = new Map<string, SpawnedRecord>();
    ╰────
  help: Replace `Array<[string, string, number?]>` with `[string, string, number?][]`.

  × typescript(await-thenable): Unexpected iterable of non-Promise (non-"Thenable") values passed to promise aggregator.
     ╭─[src/doctor.ts:697:5]
 693 │       const livePairs = await checkLiveFleetPairs(orchDir);
 694 │ ╭─▶   return Promise.all([
 695 │ │       isolated("bins", "Required binaries", () => checkBins(bins, installedAdapters)),
 696 │ │       ...providerChecks,
 697 │ │       ...livePairs,
     · │       ──────┬──────
     · │             ╰── This expression is not Promise-like
 698 │ │       isolated("backend-capabilities", "Backend capabilities", () => checkBackendCapabilities(installedBackends)),
 699 │ │       isolated("malformed-presence", "Malformed presence records", () => checkMalformedPresenceRecords(orchDir)),
 700 │ │       isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
 701 │ │       isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
 702 │ │       isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
 703 │ │       isolated("config", "Config validity", () => checkConfig(orchDir)),
 704 │ │       isolated("spawn-limits", "Spawn limits", () => checkSpawnLimits(orchDir)),
 705 │ │       isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
 706 │ │       isolated("notify-sinks", "Notification sinks", () => checkNotifySinks(orchDir, bins)),
 707 │ │       isolated("notifiers", "Notifiers", () => checkNotifiers(orchDir)),
 708 │ │       isolated("orchdir-location", "ORCH_DIR location", () => checkOrchDirLocation(orchDir)),
 709 │ │       isolated("orchd", "orchd presence", () => checkDaemonPresence(orchDir)),
 710 │ │       isolated("orchd-staleness", "orchd code", () => checkDaemonStaleness(orchDir)),
 711 │ │       isolated("orchd-lock", "orchd lock", () => checkDaemonLock(orchDir)),
 712 │ │       isolated("orchd-socket", "orchd socket", () => checkDaemonSocket(orchDir)),
 713 │ │       isolated("remote-ssh", "Remote SSH reachability", () => checkRemoteReachability(orchDir, sshRunner)),
 714 │ │       isolated("remote-orch-version", "Remote orch version/schema", () => checkRemoteVersion(orchDir, sshRunner)),
 715 │ │       isolated("remote-orch-dir", "Remote ORCH_DIR", () => checkRemoteOrchDir(orchDir, sshRunner)),
 716 │ │       isolated("worktree-gitignore", "Worktree gitignore", checkWorktreeGitignore),
 717 │ ├─▶   ]);
     · ╰──── Promise aggregator input
 718 │     }
     ╰────
  help: Pass an iterable of Promise-like values, or wrap each synchronous value in `Promise.resolve(...)` before calling the aggregator.

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
    ╭─[src/commands/lock.ts:9:37]
  8 │ function holderName(): string {
  9 │   return process.env.ORCH_AGENT_KEY || `user:${process.pid}`;
    ·                                     ──
 10 │ }
    ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .key on an `any` value.
    ╭─[test/backend-headless.test.ts:89:107]
 88 │     expect(backend.list()).toContainEqual({ pid: handle.pid, key: "fake-1", alive: true });
 89 │     expect(JSON.parse(fs.readFileSync(path.join(testOrchDir, "agents", "fake-1", "status.json"), "utf8")).key).toBe("fake-1");
    ·                                                                                                           ───
 90 │   });
    ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .state on an `any` value.
     ╭─[test/backend-headless.test.ts:110:92]
 109 │     await waitFor(() => fs.existsSync(path.join(dir, "status.json")));
 110 │     await waitFor(() => JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")).state === "done");
     ·                                                                                            ─────
 111 │     expect(JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8"))).toEqual({ text: "headless result" });
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type BackendTarget<string> | undefined.
     ╭─[test/backend-tmux.test.ts:230:54]
 229 │     panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmux~main~%251", agent: "claude" })];
 230 │     expect(new TmuxBackend().inventory()[0]).toEqual(expect.objectContaining({ workspace: "main", agent: "claude" }));
     ·                                                      ───────────────────────────────────────────────────────────────
 231 │   });
     ╰────

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-herdr-headless.test.ts:91:28]
 90 │   test("implicit selection falls back to headless when no herdr session exists", () => {
 91 │     const herdrAvailable = HerdrBackend.prototype.isAvailable;
    ·                            ──────────────────────────────────┬
    ·                                             │                ╰── This reference may be unbound and lose `this` context
 92 │     const herdrInside = HerdrBackend.prototype.isInsideSession;
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-herdr-headless.test.ts:92:25]
 91 │     const herdrAvailable = HerdrBackend.prototype.isAvailable;
 92 │     const herdrInside = HerdrBackend.prototype.isInsideSession;
    ·                         ──────────────────────────────────────┬
    ·                                            │                  ╰── This reference may be unbound and lose `this` context
 93 │     const tmuxAvailable = TmuxBackend.prototype.isAvailable;
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-herdr-headless.test.ts:93:27]
 92 │     const herdrInside = HerdrBackend.prototype.isInsideSession;
 93 │     const tmuxAvailable = TmuxBackend.prototype.isAvailable;
    ·                           ─────────────────────────────────┬
    ·                                           │                ╰── This reference may be unbound and lose `this` context
 94 │     const tmuxInside = TmuxBackend.prototype.isInsideSession;
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-herdr-headless.test.ts:94:24]
 93 │     const tmuxAvailable = TmuxBackend.prototype.isAvailable;
 94 │     const tmuxInside = TmuxBackend.prototype.isInsideSession;
    ·                        ─────────────────────────────────────┬
    ·                                          │                  ╰── This reference may be unbound and lose `this` context
 95 │     try {
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-tmux.test.ts:77:28]
 76 │     const previous = process.env.TMUX;
 77 │     const oldHerdrInside = HerdrBackend.prototype.isInsideSession;
    ·                            ──────────────────────────────────────┬
    ·                                               │                  ╰── This reference may be unbound and lose `this` context
 78 │     const oldTmuxAvailable = TmuxBackend.prototype.isAvailable;
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-tmux.test.ts:78:30]
 77 │     const oldHerdrInside = HerdrBackend.prototype.isInsideSession;
 78 │     const oldTmuxAvailable = TmuxBackend.prototype.isAvailable;
    ·                              ─────────────────────────────────┬
    ·                                              │                ╰── This reference may be unbound and lose `this` context
 79 │     try {
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/cli-backends-tmux.test.ts:94:30]
 93 │     const previous = process.env.TMUX;
 94 │     const oldTmuxAvailable = TmuxBackend.prototype.isAvailable;
    ·                              ─────────────────────────────────┬
    ·                                              │                ╰── This reference may be unbound and lose `this` context
 95 │     try {
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
     ╭─[test/cli-backends-tmux.test.ts:107:28]
 106 │   test("fails herdr validation outside a herdr session before pane work", () => {
 107 │     const oldHerdrInside = HerdrBackend.prototype.isInsideSession;
     ·                            ──────────────────────────────────────┬
     ·                                               │                  ╰── This reference may be unbound and lose `this` context
 108 │     try {
     ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
    ╭─[test/cmd-lock.test.ts:35:5]
 34 │     releaseCommandLock(directory, first.pid);
 35 │     await expect(waiting).resolves.toMatchObject({ holder: "second" });
    ·     ───── ──────────────────────────────┬─────────────────────────────
    ·       │                                 ╰── This expression is not Promise-like
 36 │     releaseCommandLock(directory);
    ╰────
  help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.

  × typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
    ╭─[test/cmd-lock.test.ts:42:5]
 41 │     writeFileSync(join(directory, "cmd-lock.json"), JSON.stringify({ pid: 999999999, holder: "dead", ts: Date.now() }));
 42 │     await expect(acquireCommandLock(directory, { holder: "live", pollMs: 5, timeoutMs: 500 })).resolves.toMatchObject({ holder: "live" });
    ·     ───── ───────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────
    ·       │                                                                  ╰── This expression is not Promise-like
 43 │     releaseCommandLock(directory);
    ╰────
  help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.

  × typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
    ╭─[test/cmd-lock.test.ts:62:7]
 61 │     try {
 62 │       await expect(cmdLock(["check", "--", "bun", "test", "test/x.test.ts"])).resolves.toBe(3);
    ·       ───── ─────────────────────────────────────────┬────────────────────────────────────────
    ·         │                                            ╰── This expression is not Promise-like
 63 │       await expect(cmdLock(["check", "--", "bun", "run", "lint"])).resolves.toBe(0);
    ╰────
  help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.

  × typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
    ╭─[test/cmd-lock.test.ts:63:7]
 62 │       await expect(cmdLock(["check", "--", "bun", "test", "test/x.test.ts"])).resolves.toBe(3);
 63 │       await expect(cmdLock(["check", "--", "bun", "run", "lint"])).resolves.toBe(0);
    ·       ───── ───────────────────────────────────┬───────────────────────────────────
    ·         │                                      ╰── This expression is not Promise-like
 64 │     } finally {
    ╰────
  help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.

  × typescript(await-thenable): Unexpected `await` of a non-Promise (non-"Thenable") value.
    ╭─[test/cmd-lock.test.ts:75:7]
 74 │     try {
 75 │       await expect(cmdLock(["run", "--", process.execPath, "-e", "process.exit(7)"])).resolves.toBe(7);
    ·       ───── ─────────────────────────────────────────────┬────────────────────────────────────────────
    ·         │                                                ╰── This expression is not Promise-like
 76 │       expect(existsSync(join(directory, "cmd-lock.json"))).toBe(false);
    ╰────
  help: Remove `await` if the value is synchronous, or change the expression to return a Promise or Thenable before awaiting it.

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type ReloadResult.
   ╭─[test/commands-lifecycle.test.ts:7:102]
 6 │     expect(paneForeground({} as never, "p1")).toEqual([]);
 7 │     expect(doReload({ sendKeys: () => false } as never, "p1", "headless~local~1", "reload")).toEqual(expect.objectContaining({ pane: "p1", ok: false }));
   ·                                                                                                      ──────────────────────────────────────────────────
 8 │   });
   ╰────

  × typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
   ╭─[test/commands-review.test.ts:5:81]
 4 │ describe("commands/review", () => {
 5 │   test("uses the short orch branch as review target", () => expect(reviewTarget({ pane: "p", branch: "orch/task-1" } as never)).toBe("task-1"));
   ·                                                                                 ─────────────────────────────────────────────
 6 │   test("falls back to branch then pane", () => {
   ╰────

  × typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
   ╭─[test/commands-review.test.ts:7:25]
 6 │   test("falls back to branch then pane", () => {
 7 │     expect(reviewTarget({ pane: "p", branch: "feature" } as never)).toBe("feature");
   ·                         ─────────────────────────────────────────
 8 │     expect(reviewTarget({ pane: "p" } as never)).toBe("p");
   ╰────

  × typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of `this`.
    ╭─[test/commands-results.test.ts:29:27]
 28 │     const output: string[] = [];
 29 │     const originalWrite = process.stdout.write;
    ·                           ────────────────────┬
    ·                                     │         ╰── This reference may be unbound and lose `this` context
 30 │     process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; }) as typeof process.stdout.write;
    ╰────
  help: If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.

  × typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
   ╭─[test/commands-review.test.ts:8:25]
 7 │     expect(reviewTarget({ pane: "p", branch: "feature" } as never)).toBe("feature");
 8 │     expect(reviewTarget({ pane: "p" } as never)).toBe("p");
   ·                         ──────────────────────
 9 │   });
   ╰────

  × typescript(no-unnecessary-type-assertion): This assertion is unnecessary since the receiver accepts the original type of the expression.
    ╭─[test/commands-results.test.ts:30:27]
 29 │     const originalWrite = process.stdout.write;
 30 │     process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; }) as typeof process.stdout.write;
    ·                           ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
 31 │     try { cmdResult([key]); } finally { process.stdout.write = originalWrite; if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; rmSync(root, { recursive: true, force: true }); }
    ╰────

  × typescript(require-await): Function has no 'await' expression.
    ╭─[test/commands-setup.test.ts:11:105]
 10 │   test("resolves noninteractive provider sets and defaults", async () => {
 11 │     expect(await resolveProviderSet("adapter", "--agent", "pi,claude", ["pi", "claude"], false, async () => null)).toEqual(["pi", "claude"]);
    ·                                                                                                         ───
 12 │     expect(await resolveActiveDefault(["pi", "claude"], false, false, async () => null)).toBe("pi");
    ╰────

  × typescript(require-await): Function has no 'await' expression.
    ╭─[test/commands-setup.test.ts:12:79]
 11 │     expect(await resolveProviderSet("adapter", "--agent", "pi,claude", ["pi", "claude"], false, async () => null)).toEqual(["pi", "claude"]);
 12 │     expect(await resolveActiveDefault(["pi", "claude"], false, false, async () => null)).toBe("pi");
    ·                                                                               ───
 13 │   });
    ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type Record<string, PresenceStatus>.
    ╭─[test/presence-schema.test.ts:76:36]
 75 │     
 76 │ ╭─▶     expect(readStatuses()).toEqual(expect.objectContaining({
 77 │ │         [key]: expect.objectContaining({ key, backend: "headless", workspace: "workspace-a", handle: "1234", agent: "pi" }),
 78 │ ╰─▶     }));
 79 │         expect(parseIdentity(key)).toEqual({ backend: "headless", workspace: "workspace-a", handle: "1234" });
    ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
    ╭─[test/presence-schema.test.ts:77:7]
 76 │     expect(readStatuses()).toEqual(expect.objectContaining({
 77 │       [key]: expect.objectContaining({ key, backend: "headless", workspace: "workspace-a", handle: "1234", agent: "pi" }),
    ·       ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 78 │     }));
    ╰────

Found 0 warnings and 33 errors.
Finished in 9.8s on 239 files with 65 rules using 8 threads.
error: script "check" exited with code 1
orch > 