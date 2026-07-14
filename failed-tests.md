rch > bun test
bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
✓ pi adapter tool allowlist > declares exactly the built-ins and bridge tools [2.33ms]
✓ pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.48ms]
✓ pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.46ms]

test\adapter-pi.test.ts:
✓ PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.59ms]
✓ PiAdapter > reads state from the presence status through store helpers [7.42ms]
✓ PiAdapter > appends a steer message to the presence inbox [3.66ms]
✓ PiAdapter > writes a blocking answer to the presence answer file [3.20ms]
✓ PiAdapter > reads result.json and falls back to the last assistant session text [4.23ms]

test\backend-headless.test.ts:
154 |     mkdirSync(logDirectory(directory), { recursive: true });
155 |     const logPath = join(logDirectory(directory), logFileName(key, Date.now()));
156 |     const logFd = openSync(logPath, "a");
157 |     let child: ChildProcess;
158 |     try {
159 |       child = spawnProcess(argv[0], argv.slice(1), {
                    ^
ENOENT: no such file or directory, uv_spawn 'sh'
      path: "sh",
   syscall: "spawn sh",
     errno: -4058,
 spawnargs: [ "-c", "mkdir -p 'C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-backend-headless-ChYYda\\agents\\fake-1'; printf '{\"pid\":%s,\"state\":\"working\"}' \"$$\" > 'C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-backend-headless-ChYYda\\agents\\fake-1\\status.json'; exec sleep 5" ],
      code: "ENOENT"

      at spawn (node:child_process:679:35)
      at spawn (node:child_process:14:39)
      at spawn (C:\Users\Bryan\Documents\orch\src\backends\headless.ts:159:15)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\backend-headless.test.ts:58:28)
168 |     }
169 |     closeSync(logFd);
170 |     child.unref();
171 | 
172 |     const pid = child.pid;
173 |     if (!pid) throw new Error(`adapter ${String(adapter.id)} did not provide a process id`);
                              ^
error: adapter fake did not provide a process id
      at spawn (C:\Users\Bryan\Documents\orch\src\backends\headless.ts:173:25)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\backend-headless.test.ts:58:28)
✗ HeadlessBackend > spawns a detached process and records its handle [13.70ms]
154 |     mkdirSync(logDirectory(directory), { recursive: true });
155 |     const logPath = join(logDirectory(directory), logFileName(key, Date.now()));
156 |     const logFd = openSync(logPath, "a");
157 |     let child: ChildProcess;
158 |     try {
159 |       child = spawnProcess(argv[0], argv.slice(1), {
                    ^
ENOENT: no such file or directory, uv_spawn 'sh'
      path: "sh",
   syscall: "spawn sh",
     errno: -4058,
 spawnargs: [ "-c", "mkdir -p 'C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-backend-headless-ChYYda\\agents\\fake-2'; printf '{\"pid\":%s,\"state\":\"working\"}' \"$$\" > 'C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-backend-headless-ChYYda\\agents\\fake-2\\status.json'; exec sleep 5" ],
      code: "ENOENT"

      at spawn (node:child_process:679:35)
      at spawn (node:child_process:14:39)
      at spawn (C:\Users\Bryan\Documents\orch\src\backends\headless.ts:159:15)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\backend-headless.test.ts:68:28)
168 |     }
169 |     closeSync(logFd);
170 |     child.unref();
171 | 
172 |     const pid = child.pid;
173 |     if (!pid) throw new Error(`adapter ${String(adapter.id)} did not provide a process id`);
                              ^
error: adapter fake did not provide a process id
      at spawn (C:\Users\Bryan\Documents\orch\src\backends\headless.ts:173:25)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\backend-headless.test.ts:68:28)
✗ HeadlessBackend > closes only when registry and presence pid/key both match [5.76ms]
✓ HeadlessBackend > signals a matching recorded handle through the injected killer [3.93ms]
✓ HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.01ms]
✓ HeadlessBackend > never signals an unrecorded pid [1.46ms]

test\backend-herdr.test.ts:
✓ HerdrBackend > creates a pane and runs the adapter command [0.52ms]
✓ HerdrBackend > maps close and list to herdr helpers [0.21ms]

test\claude-adapter.test.ts:
✓ Claude adapter > declares its identity and capabilities [0.50ms]
✓ Claude adapter > builds the interactive Claude launch command [0.37ms]
✓ Claude adapter > detects state from a live presence status [4.16ms]
✓ Claude adapter > extracts result.json before transcript and native output [5.47ms]
22 |     execFileSync(process.execPath, [hookScript, event], {
23 |       env: { ...process.env, ORCH_DIR: hookOrchDir, HERDR_PANE_ID: fakePaneId },
24 |       input: JSON.stringify(input),
25 |       encoding: "utf8",
26 |     });
27 |     return JSON.parse(readFileSync(join(hookOrchDir, "agents", fakePaneId, "status.json"), "utf8"));
                           ^
error: ENOENT: no such file or directory, open 'C:\Users\Bryan\AppData\Local\Temp\orch-claude-hook-hb89jG\agents\w9:p1\status.json'
      at runHook (C:\Users\Bryan\Documents\orch\test\claude-adapter.test.ts:27:23)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\claude-adapter.test.ts:82:12)
✗ Claude adapter > maps Claude hook events to presence states and schema [103.12ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
killed 1 dangling process
52 |     commit(merged, "merged\n");
53 |     git(repoRoot, ["merge", "--ff-only", mergedBranch]);
54 |     const unmerged = createAgentWorktree(repoRoot, "unmerged");
55 |     commit(unmerged, "unmerged\n");
56 | 
57 |     const output = runOrch(repoRoot, orchDir, "clean", "--worktrees");
                        ^
error: Command failed: bun C:\Users\Bryan\Documents\orch\bin\orch.ts clean --worktrees
      at execFileSync (node:child_process:271:14)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\clean-worktrees.test.ts:57:20)
✗ clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [5180.73ms]
  ^ this test timed out after 5000ms.
Preparing worktree (new branch 'orch/discard')
71 |     const unmerged = createAgentWorktree(repoRoot, "discard");
72 |     const branch = worktreeBranch(unmerged);
73 |     commit(unmerged);
74 | 
75 |     const output = runOrch(repoRoot, orchDir, "clean", "--worktrees", "--force");
76 |     expect(output).toContain(`Removed orphan worktree ${unmerged}`);
                        ^
error: expect(received).toContain(expected)

Expected to contain: "Removed orphan worktree C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-clean-worktree-HKRqDN\\.orch-worktrees\\discard"
Received: "Nothing to clean — all agent dirs have live pids (or none exist).\nRemoved orphan worktree C:/Users/Bryan/AppData/Local/Temp/orch-clean-worktree-HKRqDN/.orch-worktrees/discard (orch/discard); discarded unmerged commits.\n"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\clean-worktrees.test.ts:76:20)
✗ clean worktrees > --force discards an unmerged orphan and its branch [3638.47ms]

test\codex-adapter.test.ts:
✓ CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.34ms]
✓ CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.46ms]
✓ CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.72ms]

test\config-precedence.test.ts:
✓ config precedence > returns a [defaults] value when no override is set [3.76ms]
✓ config precedence > applies defaults when config, env, and flag are absent [1.61ms]
✓ config precedence > uses env over config and flag over env [2.06ms]
✓ config precedence > parses notify entries and hosts into expected shapes [1.91ms]
✓ config precedence > reports a helpful validation error for invalid config [2.59ms]

test\config.test.ts:
✓ loadConfig > uses defaults when config.toml is missing [1.45ms]
✓ loadConfig > parses every supported config section [2.53ms]
✓ loadConfig > names the file, key, expected, and found type for invalid fields [1.85ms]
✓ config precedence > uses the fallback when env and config.toml omit a setting [1.16ms]
✓ config precedence > uses the config.toml value over the fallback [1.45ms]
✓ config precedence > uses the ORCH_* environment value over config.toml [1.93ms]
✓ config precedence > uses an explicit flag override over the environment [0.26ms]
✓ resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.25ms]

test\daemon-configwatch.test.ts:
✓ config watch > loads initially and applies edits [48.49ms]
✓ config watch > keeps the last good config on invalid TOML and recovers [91.58ms]
✓ config watch > stops all callbacks [267.10ms]

test\daemon-events.test.ts:
23 |   return directory;
24 | }
25 | 
26 | function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
27 |   const directory = join(orchDir, "agents", key);
28 |   mkdirSync(directory, { recursive: true });
       ^
ENOTDIR: not a directory, mkdir 'C:\Users\Bryan\AppData\Local\Temp\orch-events-ofVxnI\agents\workspace:p1'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-events-ofVxnI\\agents\\workspace:p1",
 syscall: "mkdir",
   errno: -20,
    code: "ENOTDIR"

      at writeStatus (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:28:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:56:5)
✗ daemon presence events > an RPC subscriber receives a presence transition [3.69ms]
23 |   return directory;
24 | }
25 | 
26 | function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
27 |   const directory = join(orchDir, "agents", key);
28 |   mkdirSync(directory, { recursive: true });
       ^
ENOTDIR: not a directory, mkdir 'C:\Users\Bryan\AppData\Local\Temp\orch-events-Li748z\agents\workspace:p2'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-events-Li748z\\agents\\workspace:p2",
 syscall: "mkdir",
   errno: -20,
    code: "ENOTDIR"

      at writeStatus (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:28:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:75:5)
✗ daemon presence events > a blocked transition drives command sink delivery [2.51ms]
23 |   return directory;
24 | }
25 | 
26 | function writeStatus(orchDir: string, key: string, state: string, extra: object = {}): void {
27 |   const directory = join(orchDir, "agents", key);
28 |   mkdirSync(directory, { recursive: true });
       ^
ENOTDIR: not a directory, mkdir 'C:\Users\Bryan\AppData\Local\Temp\orch-events-Y6at4j\agents\workspace:p3'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-events-Y6at4j\\agents\\workspace:p3",
 syscall: "mkdir",
   errno: -20,
    code: "ENOTDIR"

      at writeStatus (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:28:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:97:5)
✗ daemon presence events > a dead daemon falls back once and diffs the switch snapshot [2.91ms]

test\daemon-lifecycle.test.ts:
30 | 
31 |     expect(acquireDaemonLock(orchDir, () => false)).toBe(true);
32 |     expect(acquireDaemonLock(orchDir, () => false)).toBe(false);
33 | 
34 |     const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8"));
35 |     expect(lock).toEqual({
                      ^
error: expect(received).toEqual(expected)

  {
-   "codeHash": Any<String>,
+   "codeHash": "add4105f04b7",
    "pid": 2428,
-   "startTicks": Any<String>,
-   "startedAt": Any<String>,
+   "startedAt": "2026-07-14T18:37:11.191Z",
  }

- Expected  - 3
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:35:18)
✗ daemon lifecycle > acquires once and refuses a second live owner [8.21ms]
✓ daemon lifecycle > reclaims a dead lock only when its socket does not answer [4.92ms]
✓ daemon lifecycle > rejects malformed locks and a socket probe that fails [5.34ms]
✓ daemon lifecycle > retries if a stale lock disappears during reclaim [3.35ms]
160 | ): number {
161 |   mkdirSync(orchDir, { recursive: true });
162 |   const log = openSync(logPath(orchDir), "a");
163 |   const [command, commandArgs] = commandFor(entrypoint, args);
164 |   try {
165 |     const child = spawn(command, commandArgs, {
                        ^
ENOENT: no such file or directory, uv_spawn '/bin/sh'
      path: "/bin/sh",
   syscall: "spawn /bin/sh",
     errno: -4058,
 spawnargs: [ "-c", "printf daemon-test" ],
      code: "ENOENT"

      at spawn (node:child_process:679:35)
      at spawn (node:child_process:14:39)
      at daemonize (C:\Users\Bryan\Documents\orch\src\daemon\lifecycle.ts:165:19)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:91:27)
166 |       detached: true,
167 |       stdio: ["ignore", log, log],
168 |       env: process.env,
169 |     });
170 |     child.unref();
171 |     if (child.pid === undefined) throw new Error("daemon process did not provide a pid");
                                                 ^
error: daemon process did not provide a pid
      at daemonize (C:\Users\Bryan\Documents\orch\src\daemon\lifecycle.ts:171:44)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:91:27)
✗ daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [3.97ms]
190 | /** Re-run this entrypoint with unchanged argv, handing the lock to the replacement. */
191 | export function reexecSelf(
192 |   orchDir = resolveOrchDir(),
193 | ): never {
194 |   releaseDaemonLock(orchDir);
195 |   const replacement = spawn(process.execPath, process.argv.slice(1), {
                            ^
ENOENT: no such file or directory, uv_spawn '/bin/true'
      path: "/bin/true",
   syscall: "spawn /bin/true",
     errno: -4058,
 spawnargs: [ "C:\\Users\\Bryan\\Documents\\orch\\test\\daemon-lifecycle.test.ts" ],
      code: "ENOENT"

      at spawn (node:child_process:679:35)
      at spawn (node:child_process:14:39)
      at reexecSelf (C:\Users\Bryan\Documents\orch\src\daemon\lifecycle.ts:195:23)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:116:41)
✗ daemon lifecycle > reexecs with the current argv and hands over the lock [3.57ms]
128 |     expect(acquireDaemonLock(orchDir)).toBe(true);
129 |     const lock = JSON.parse(readFileSync(join(orchDir, "orchd.lock"), "utf8"));
130 |     lock.startTicks = "not-the-current-process";
131 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify(lock));
132 | 
133 |     expect(readDaemonLock(orchDir)).toBeNull();
                                          ^
error: expect(received).toBeNull()

Received: {
  pid: 2428,
  codeHash: "add4105f04b7",
  startTicks: "not-the-current-process",
}

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:133:37)
✗ daemon lifecycle > rejects a recycled pid identity [4.76ms]
✓ daemon lifecycle > hash is stable and changes when entrypoint content changes [3.13ms]

test\daemon-rpc.test.ts:
✓ daemon RPC > round-trips a call over the real unix socket [31.32ms]
✓ daemon RPC > returns an error for an unknown method [24.85ms]
✓ daemon RPC > reports malformed lines and keeps the connection alive [40.80ms]
✓ daemon RPC > delivers pushed subscription events [31.12ms]
✓ daemon RPC > removes a stale unix socket when the daemon owns the lock [16.62ms]
✓ daemon RPC > has a catchable absent-daemon error [10.63ms]

test\doctor-checks.test.ts:
✓ doctor notification-sink checks > reports no sinks as healthy [9.30ms]
✓ doctor notification-sink checks > warns for a webhook with a malformed URL [5.04ms]
✓ doctor notification-sink checks > warns for a command binary missing from PATH [6.03ms]
✓ doctor notification-sink checks > accepts a command binary present on the injected PATH [7.96ms]

test\doctor-claude-hooks.test.ts:
✓ doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [1.85ms]
✓ doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [2.11ms]
✓ doctor Claude hooks shim check > warns when hooks point at a stale shim [2.80ms]
✓ doctor Claude hooks shim check > treats an absent settings file as not configured [1.26ms]
✓ doctor Claude hooks shim check > handles malformed settings gracefully [1.72ms]

test\doctor-hosts.test.ts:
✓ doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [45.27ms]
✓ doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [39.07ms]
✓ doctor remote host checks > flags a remote orch version/schema mismatch in detail [139.68ms]
✓ doctor remote host checks > reports no remote hosts configured as healthy [236.14ms]

test\doctor.test.ts:
✓ runDoctor > reports an absent daemon as optional [228.47ms]
✓ runDoctor > reports and fixes a stale daemon lock [201.94ms]
✓ runDoctor > accepts a live daemon and an answerable socket [655.04ms]
✓ runDoctor > warns when the live daemon code hash is stale [340.97ms]
✓ runDoctor > fails on an invalid lock and an unanswerable live socket [283.02ms]
 98 |     fs.writeFileSync(path.join(agent, "status.json"), JSON.stringify({
 99 |       pid: process.pid,
100 |       extensionHash: computeCodeHash(path.join(import.meta.dir, "../extensions/orchestrator-bridge.ts")),
101 |     }));
102 | 
103 |     expect(check(await runDoctor(directory), "extension-staleness")).toMatchObject({
                                                                           ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": StringContaining "current",
-   "status": "ok",
+   "detail": "ENOENT: no such file or directory, open 'C:\Users\Bryan\Documents\orch\dist\extensions\orchestrator-bridge.js'",
+   "id": "extension-staleness",
+   "label": "Extension staleness",
+   "status": "fail",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\doctor.test.ts:103:70)
✗ runDoctor > accepts a matching live extension hash [60.12ms]
110 |     const directory = tempDir();
111 |     const agent = path.join(directory, "agents", "pane-2");
112 |     fs.mkdirSync(agent, { recursive: true });
113 |     fs.writeFileSync(path.join(agent, "status.json"), JSON.stringify({ pid: process.pid, extensionHash: "old" }));
114 | 
115 |     expect(check(await runDoctor(directory), "extension-staleness")).toMatchObject({
                                                                           ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": StringContaining "orch restart pane-2",
-   "status": "warn",
+   "detail": "ENOENT: no such file or directory, open 'C:\Users\Bryan\Documents\orch\dist\extensions\orchestrator-bridge.js'",
+   "id": "extension-staleness",
+   "label": "Extension staleness",
+   "status": "fail",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\doctor.test.ts:115:70)
✗ runDoctor > warns when a live extension hash is stale [60.70ms]
125 |     fs.mkdirSync(agent, { recursive: true });
126 |     fs.mkdirSync(broken, { recursive: true });
127 |     fs.writeFileSync(path.join(agent, "status.json"), JSON.stringify({ pid: process.pid }));
128 |     fs.writeFileSync(path.join(broken, "status.json"), "not json");
129 | 
130 |     expect(check(await runDoctor(directory), "extension-staleness")).toMatchObject({
                                                                           ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": StringContaining "no live agents with extension hashes",
-   "status": "ok",
+   "detail": "ENOENT: no such file or directory, open 'C:\Users\Bryan\Documents\orch\dist\extensions\orchestrator-bridge.js'",
+   "id": "extension-staleness",
+   "label": "Extension staleness",
+   "status": "fail",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\doctor.test.ts:130:70)
✗ runDoctor > tolerates live extension status without a hash [61.83ms]
✓ runDoctor > reports a dead presence pid and corrupt spawn registry lines [62.68ms]
✓ runDoctor > does not offer a fix for missing binaries [4.92ms]
✓ runDoctor > applyFixes reports exactly the changes it applies [2.89ms]
✓ runDoctor > reports invalid config and accepts missing config [100.83ms]
✓ runDoctor > never throws when individual checks encounter broken inputs [78.62ms]

test\notifier-adapters.test.ts:
✓ notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.83ms]
notify: webhook notifier has invalid configuration
✓ notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.80ms]
✓ notifier registry and built-in adapters > webhook POST contains the canonical payload [2.74ms]
notify: command sink failed
76 |   test("command adapter passes canonical JSON on stdin", async () => {
77 |     const dir = tempDir();
78 |     const output = path.join(dir, "stdin.json");
79 |     const command = executable(dir, "capture", `cat > ${JSON.stringify(output)}`);
80 |     const registry = createNotifierRegistry(createBuiltinNotifiers());
81 |     expect(await registry.deliver("command", { command: [command] }, event)).toBe(true);
                                                                                  ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notifier-adapters.test.ts:81:78)
✗ notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [3.65ms]
✓ notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [2.93ms]
notify: bad sink failed
✓ notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.75ms]

test\notify-events-format.test.ts:
✓ notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.36ms]
✓ notification and presence event formatting > notificationText formats done, error, and blocked summaries without color [0.30ms]
✓ notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.54ms]
✓ notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.96ms]
✓ notification and presence event formatting > derivePresenceTransition derives workspace only for workspace:pane keys [0.20ms]

test\notify-sinks.test.ts:
32 |     };
33 | 
34 |     const sink = { type: "command" as const, on: ["done"], command: ["bash", "-c", `cat > ${output}`] };
35 |     expect(await deliverToSink(sink, event)).toBe(true);
36 | 
37 |     const payload = JSON.parse(readFileSync(output, "utf8"));
                                    ^
ENOENT: no such file or directory, open 'C:\Users\Bryan\AppData\Local\Temp\orch-notify-sinks-IpNZYD\payload.json'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-notify-sinks-IpNZYD\\payload.json",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify-sinks.test.ts:37:32)
✗ notify sinks > delivers command sink payload as JSON [139.21ms]
✓ notify sinks > loadSinks parses command and webhook declarations [1.88ms]

test\notify.test.ts:
✓ notify > parses valid sinks and warns about unknown types and missing fields [1.94ms]
notify: command notifier unavailable
116 |       newState: "done",
117 |       ts: "2026-01-01T00:00:00.000Z",
118 |     });
119 |     await waitForFile(matchingFile);
120 | 
121 |     expect(readFileSync(matchingFile, "utf8")).toBe("matched");
                 ^
ENOENT: no such file or directory, open 'C:\Users\Bryan\AppData\Local\Temp\orch-notify-ZRGDIZ\matching'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-notify-ZRGDIZ\\matching",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify.test.ts:121:12)
✗ notify > delivers only to sinks whose on filter matches the event [717.95ms]
notify: command sink failed
138 |       ts: "2026-01-01T00:00:00.000Z",
139 |       lastError: "boom",
140 |     };
141 |     const sink = { type: "command" as const, on: ["error"], command: ["sh", "-c", `cat > ${shellQuote(output)}`] };
142 | 
143 |     expect(await deliverToSink(sink, event)).toBe(true);
                                                   ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify.test.ts:143:46)
✗ notify > command sink writes the event payload as JSON on stdin [38.88ms]
✓ notify > titles lead with exactly one terminal state and agent [0.92ms]
✓ notify > webhook failure is non-fatal and reports a warning [28.41ms]

test\parse-target.test.ts:
✓ <host>/<target> grammar > keeps targets without a host unchanged [8.76ms]
✓ <host>/<target> grammar > parses configured host prefixes [1.11ms]
✓ <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.96ms]
✓ <host>/<target> grammar > rejects empty hosts and targets [1.05ms]
✓ <host>/<target> grammar > formats local and host-prefixed targets [0.48ms]

test\presence-schema.test.ts:
✓ presence status schema > reads a schema-2 status with its adapter id [923.84ms]
✓ presence status schema > keeps schema-1 status records valid without adding fields [228.13ms]
✓ presence status schema > loads a mixed directory of schema-1 and schema-2 records [119.67ms]

test\queue-workspace-replay.test.ts:
✓ queue workspace replay > persists workspace through append-only replay [6.00ms]
✓ queue workspace replay > keeps legacy tasks without a workspace [4.11ms]
✓ queue workspace replay > replays separate workspace values for multiple tasks [3.99ms]
✓ queue workspace replay > selects only tasks eligible for the requested workspace [6.00ms]

test\queue.test.ts:
✓ queue > add then list shows a queued task [4.01ms]
✓ queue > exactly one claimer wins, including parallel attempts [17.72ms]
✓ queue > replays done, failed, and retry transitions [14.34ms]
✓ queue > cancels queued tasks and returns an error result for claimed tasks [7.00ms]
✓ queue > picks queued tasks FIFO, honoring the agent constraint [4.65ms]
✓ queue > caps retries: requeue below the cap, terminal failed at it [11.12ms]
✓ queue > releases the claim file on done so the id can never wedge the claims dir [5.72ms]
✓ queue > exactly one of two racing claimers wins [4.57ms]
Warning: skipping corrupt queue event at line 2
✓ queue > skips a corrupt trailing event line [5.56ms]

test\remote-fanout.test.ts:
42 | 
43 | describe("async remote fan-out", () => {
44 |   test("parses valid JSON from a host", async () => {
45 |     const { bin: sshBin } = fixture();
46 |     const result = await runRemoteAsync("good", { dest: "good.example" }, ["status"], { sshBin });
47 |     expect(result).toEqual({ ok: true, value: { host: "good", ok: true } });
                        ^
error: expect(received).toEqual(expected)

  {
-   "ok": true,
-   "value": {
+   "failure": {
      "host": "good",
-     "ok": true,
+     "kind": "dead-host",
+     "message": "Host "good" is unreachable: ENOENT: no such file or directory, uv_spawn 'C:\Users\Bryan\AppData\Local\Temp\orch-remote-fanout-isK2zX\ssh-fake'",
    },
+   "ok": false,
  }

- Expected  - 3
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote-fanout.test.ts:47:20)
✗ async remote fan-out > parses valid JSON from a host [7.41ms]
✓ async remote fan-out > returns a typed dead-host failure [5.20ms]
54 |   });
55 | 
56 |   test("returns a typed timeout failure", async () => {
57 |     const { bin: sshBin } = fixture();
58 |     const result = await runRemoteAsync("slow", { dest: "slow.example", timeout_ms: 20 }, ["status"], { sshBin });
59 |     expect(failure(result)).toMatchObject({ kind: "timeout", host: "slow" });
                                 ^
error: expect(received).toMatchObject(expected)

  {
    "host": "slow",
-   "kind": "timeout",
+   "kind": "dead-host",
+   "message": "Host "slow" is unreachable: ENOENT: no such file or directory, uv_spawn 'C:\Users\Bryan\AppData\Local\Temp\orch-remote-fanout-KU9lyj\ssh-fake'",
  }

- Expected  - 1
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote-fanout.test.ts:59:29)
✗ async remote fan-out > returns a typed timeout failure [4.45ms]
60 |   });
61 | 
62 |   test("returns a typed non-JSON failure", async () => {
63 |     const { bin: sshBin } = fixture();
64 |     const result = await runRemoteAsync("text", { dest: "text.example" }, ["status"], { sshBin });
65 |     expect(failure(result)).toMatchObject({ kind: "non-json", host: "text" });
                                 ^
error: expect(received).toMatchObject(expected)

  {
    "host": "text",
-   "kind": "non-json",
+   "kind": "dead-host",
+   "message": "Host "text" is unreachable: ENOENT: no such file or directory, uv_spawn 'C:\Users\Bryan\AppData\Local\Temp\orch-remote-fanout-JiKM3N\ssh-fake'",
  }

- Expected  - 1
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote-fanout.test.ts:65:29)
✗ async remote fan-out > returns a typed non-JSON failure [3.75ms]
76 |     const results = await Promise.all(
77 |       Object.entries(hosts).map(async ([name, host]) => [name, await runRemoteAsync(name, host, ["status"], { sshBin })] as const),
78 |     );
79 |     const byHost = Object.fromEntries(results);
80 | 
81 |     expect(byHost.good).toEqual({ ok: true, value: { host: "good", ok: true } });
                             ^
error: expect(received).toEqual(expected)

  {
-   "ok": true,
-   "value": {
+   "failure": {
      "host": "good",
-     "ok": true,
+     "kind": "dead-host",
+     "message": "Host "good" is unreachable: ENOENT: no such file or directory, uv_spawn 'C:\Users\Bryan\AppData\Local\Temp\orch-remote-fanout-CLhvnW\ssh-fake'",
    },
+   "ok": false,
  }

- Expected  - 3
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote-fanout.test.ts:81:25)
✗ async remote fan-out > fans out and keeps per-host failures without throwing [9.35ms]

test\remote.test.ts:
47 | 
48 | describe("remote SSH executor", () => {
49 |   test("runs BatchMode SSH and parses JSON", () => {
50 |     const { bin, record } = fixture();
51 |     const result = runRemote("gpu1", { dest: "bryan@gpu1" }, ["status"], { timeoutMs: 500, sshBin: bin });
52 |     expect(result).toEqual({ ok: true, value: { host: "gpu1", ok: true } });
                        ^
error: expect(received).toEqual(expected)

  {
-   "ok": true,
-   "value": {
+   "failure": {
      "host": "gpu1",
-     "ok": true,
+     "kind": "dead-host",
+     "message": "Host "gpu1" is unreachable: Executable not found in $PATH: "C:\Users\Bryan\AppData\Local\Temp\orch-remote-RE7AxA\ssh-fake"",
    },
+   "ok": false,
  }

- Expected  - 3
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:52:20)
✗ remote SSH executor > runs BatchMode SSH and parses JSON [5.88ms]
54 |   });
55 | 
56 |   test("returns a typed timeout failure", () => {
57 |     const { bin, record } = fixture();
58 |     const result = runRemote("slow", { dest: "slow.example", timeout_ms: 20 }, ["status"], { sshBin: bin });
59 |     expect(failure(result)).toMatchObject({ kind: "timeout", host: "slow" });
                                 ^
error: expect(received).toMatchObject(expected)

  {
    "host": "slow",
-   "kind": "timeout",
+   "kind": "dead-host",
+   "message": "Host "slow" is unreachable: Executable not found in $PATH: "C:\Users\Bryan\AppData\Local\Temp\orch-remote-EFY1od\ssh-fake"",
  }

- Expected  - 1
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:59:29)
✗ remote SSH executor > returns a typed timeout failure [3.50ms]
27 |   chmodSync(bin, 0o755);
28 |   return { bin, record };
29 | }
30 | 
31 | function recorded(record: string): string {
32 |   expect(existsSync(record)).toBe(true);
                                  ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at recorded (C:\Users\Bryan\Documents\orch\test\remote.test.ts:32:30)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:67:12)
✗ remote SSH executor > returns a dead-host failure [2.84ms]
68 |   });
69 | 
70 |   test("returns a non-JSON failure", () => {
71 |     const { bin, record } = fixture();
72 |     const result = runRemote("gpu1", { dest: "bryan@gpu1" }, ["questions"], { sshBin: bin });
73 |     expect(failure(result)).toMatchObject({ kind: "non-json", host: "gpu1" });
                                 ^
error: expect(received).toMatchObject(expected)

  {
    "host": "gpu1",
-   "kind": "non-json",
+   "kind": "dead-host",
+   "message": "Host "gpu1" is unreachable: Executable not found in $PATH: "C:\Users\Bryan\AppData\Local\Temp\orch-remote-3Y94C3\ssh-fake"",
  }

- Expected  - 1
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:73:29)
✗ remote SSH executor > returns a non-JSON failure [2.76ms]
✓ host-prefixed targets > round-trips local and host-prefixed grammar [0.19ms]
✓ host-prefixed targets > reports unknown host and configured names [0.18ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
✓ review plumbing > lists only done worktree agents with commits ahead [3499.87ms]
Preparing worktree (new branch 'orch/iterate-1')






+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\worktree.test.ts:43:42)
✗ worktree primitives > creates and lists an agent worktree on an orch branch [1145.83ms]
Preparing worktree (new branch 'orch/feature')
✓ worktree primitives > detects commits ahead of a base branch [3019.50ms]
Preparing worktree (new branch 'orch/remove-me')
✓ worktree primitives > removes an agent worktree [2487.08ms]
fatal: not a git repository (or any of the parent directories): .git
✓ worktree primitives > rejects a non-repository path with a clear error [54.76ms]

30 tests failed:
✗ HeadlessBackend > spawns a detached process and records its handle [13.70ms]
✗ HeadlessBackend > closes only when registry and presence pid/key both match [5.76ms]
✗ Claude adapter > maps Claude hook events to presence states and schema [103.12ms]
✗ clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [5180.73ms]
  ^ this test timed out after 5000ms.
✗ clean worktrees > --force discards an unmerged orphan and its branch [3638.47ms]
✗ daemon presence events > an RPC subscriber receives a presence transition [3.69ms]
✗ daemon presence events > a blocked transition drives command sink delivery [2.51ms]
✗ daemon presence events > a dead daemon falls back once and diffs the switch snapshot [2.91ms]
✗ daemon lifecycle > acquires once and refuses a second live owner [8.21ms]
✗ daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [3.97ms]
✗ daemon lifecycle > reexecs with the current argv and hands over the lock [3.57ms]
✗ daemon lifecycle > rejects a recycled pid identity [4.76ms]
✗ runDoctor > accepts a matching live extension hash [60.12ms]
✗ runDoctor > warns when a live extension hash is stale [60.70ms]
✗ runDoctor > tolerates live extension status without a hash [61.83ms]
✗ notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [3.65ms]
✗ notify sinks > delivers command sink payload as JSON [139.21ms]
✗ notify > delivers only to sinks whose on filter matches the event [717.95ms]
✗ notify > command sink writes the event payload as JSON on stdin [38.88ms]
✗ async remote fan-out > parses valid JSON from a host [7.41ms]
✗ async remote fan-out > returns a typed timeout failure [4.45ms]
✗ async remote fan-out > returns a typed non-JSON failure [3.75ms]
✗ async remote fan-out > fans out and keeps per-host failures without throwing [9.35ms]
✗ remote SSH executor > runs BatchMode SSH and parses JSON [5.88ms]
✗ remote SSH executor > returns a typed timeout failure [3.50ms]
✗ remote SSH executor > returns a dead-host failure [2.84ms]
✗ remote SSH executor > returns a non-JSON failure [2.76ms]
✗ orch work notifications > delivers a presence transition through a configured command sink [6.85ms]
✗ orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [13.78ms]
✗ worktree primitives > creates and lists an agent worktree on an orch branch [1145.83ms]

 130 pass
 30 fail
 359 expect() calls
Ran 160 tests across 34 files. [39.45s]
orch > 