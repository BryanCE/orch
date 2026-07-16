bun test v1.3.14 (0d9b296a)

test/adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [2.03ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.33ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.27ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.76ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [4.05ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [8.13ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [10.52ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.37ms]
(pass) PiAdapter > reads state from the presence status through store helpers [1.91ms]
(pass) PiAdapter > appends a steer message to the presence inbox [1.36ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [1.94ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [1.98ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [66.77ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [83.57ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [1.68ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [1.19ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.06ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.59ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.30ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.14ms]
(pass) TmuxBackend > reports tmux availability [1.40ms]
(pass) TmuxBackend > reflects the TMUX environment [0.28ms]
(pass) TmuxBackend > mints identity from the owning session [0.28ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.10ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.31ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [126.59ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [374.72ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [408.10ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [1.99ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [157.83ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [294.96ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [222.46ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [451.09ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [310.45ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [85.90ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [54.58ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [81.78ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [59.34ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.29ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [60.51ms]

test/broker-routing.test.ts:
49 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
50 | 
51 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
52 | 
53 |     expect(result.status).not.toBe(0);
54 |     expect(`${result.stdout}\n${result.stderr}`).toContain("orch daemon start");
                                                      ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nno harness selected — pass --agent <id> or run `orch setup` to pick one\n"

      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/broker-routing.test.ts:54:50)
(fail) broker CLI routing > write refuses when the daemon socket is unavailable [434.32ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [2331.33ms]
72 | 
73 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
74 |     const output = `${result.stdout}\n${result.stderr}`;
75 | 
76 |     expect(result.status).not.toBe(0);
77 |     expect(output).toContain("orch daemon start");
                        ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nno harness selected — pass --agent <id> or run `orch setup` to pick one\n"

      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/broker-routing.test.ts:77:20)
(fail) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [522.73ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.32ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.15ms]
(pass) Claude adapter > detects state from a live presence status [2.01ms]
(pass) Claude adapter > extracts result.json before transcript and native output [2.20ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [2166.17ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [487.46ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [100.05ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [94.54ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [93.92ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [87.71ms]
