
● Teammate @setup-daemon-audit finished

› Message from adapter-audit (ctrl+o to expand)

Adapter/bridge audit is in — the big finding: the AgentAdapter interface is partly a facade. detectState, extractResult, and installShim are never called by the live orchestrator; pi works via the bundled bridge extension, claude via a coarse settings.json hook shim, and codex has no presence writer at all — its well-tested parsers are dead code, so codex agents spawn and then run blind. Two reports left (commands.ts routing, setup+daemon), then I'll write the synthesis.

› Message from commands-audit (ctrl+o to expand)

Commands audit is in — it confirms the pattern split: the Backend port is honored (no herdr CLI bypasses, no backend-id branches), but the AgentAdapter port is a facade on the write path — steer/model/answer/result and the daemon (orchd.ts:101,152) are hardwired to the pi bridge protocol, and there's even a bug where a non-pi adapter's steer() command is silently dropped instead of executed (commands.ts:1149). One report left (setup+daemon), then the synthesis.


● Teammate @adapter-audit finished

● Teammate @commands-audit finished

Those are just delivery confirmations for reports I already have. Still waiting on setup-daemon-audit's report — I've already requested it; once it lands I'll write the full synthesis.

› Message from setup-daemon-audit (ctrl+o to expand)

All five audits are in. Saving the key finding to memory, then the full review.

  Ran 1 shell command, wrote 1 memory

Here's the full architecture review, synthesized from five parallel audits (specs, commands.ts, adapters+bridge, backends, setup+daemon), all findings verified with file:line evidence.

TLDR verdict

You got half the pattern. The backend/plexer strategy pattern is real — commands.ts and the daemon genuinely route pane operations through the Backend port with zero herdr CLI bypasses and zero if (backend.id === "herdr") branches. The AgentAdapter pattern is a facade: the interface exists and looks right, but the live system bypasses its methods on every write path and hardcodes the pi bridge protocol. When you were told "it's built," what was actually built was the interfaces plus one full implementation of each — the substitution part of the pattern, the entire point, was never wired for agents. And the openspec change that promises all of this (pluggable-plexer-backends) was never verified or archived — its "run the spec scenarios" task is still open, so the completion claim was never proven.

What's actually rotten, ranked

1. The daemon hardcodes pi on every control write — the single worst thing

src/daemon/orchd.ts:25 imports piAdapter directly. deliverBackend (orchd.ts:99-103) routes every steer to piAdapter.steer whenever the target has presence — regardless of which adapter is running. setModel (orchd.ts:146-154) unconditionally appends {cmd:"model"} to inbox.jsonl, the pi bridge inbox, and never checks caps.setModel. Since dispatch-broker forces all writes through the daemon, this means orch steer, orch model, orch broadcast, orch pipe, and review reject are pi-only at the choke point, no matter what the adapter layer says. Worse: for a claude agent the steer writes an inbox file claude never reads, returns true, and is reported as delivered while silently lost. The broker you built to centralize governance also centralized the pi coupling.

2. The AgentAdapter methods are dead code

Grep-verified: adapter.detectState(), adapter.extractResult(), and adapter.installShim() are called nowhere in src/ outside the adapter files themselves. cmdResult (commands.ts:1080-1127) and cmdPipe (:1183) read result.json/parseSession directly. cmdAnswer (:814-832) writes answer.json straight into the presence dir and never calls adapter.answer(); caps.ask is consulted nowhere in the file. And commands.ts:1149 has a genuine bug: if (!command && adapter.id !== "pi") — (a) name-checks pi instead of gating on capability, and (b) if a non-pi adapter's steer() returns an AdapterCommand, the truthy return skips the fallback and nothing ever executes the command. Codex's steer() builds a real codex resume argv that is dropped on the floor.

3. Codex is a shell

src/adapters/codex.ts is 269 lines of well-tested parsers (detectState, extractResult, resume-based steer) that the running system never calls. No presence writer exists for codex — setup installs nothing (commands.ts:1676/1714 handle pi and claude only), the headless backend pipes codex's JSONL output to a log file nothing parses (headless/index.ts:191-198). Codex agents spawn fine and then run completely blind: no status, no steer, no result harvest, in every backend.

4. Presence is two bespoke side-channels, not an adapter contract

The spec (agent-adapters/spec.md L18) says every adapter surfaces state through the presence protocol uniformly. Reality: pi gets the 1,779-line bridge extension (rich per-tool/cost/context updates), claude gets a coarse settings.json hook shim (scripts/claude-hooks.ts — start/stop/notification only, no mid-run anything), codex gets nothing. The result: deriveView (commands.ts:112-129) special-cases isPi for session parsing, model fallback, and cost — non-pi agents render -. entities.ts:120 hardcodes agent: "pi" for presence-only entities, so any other adapter is mislabeled. Lifecycle verbs reset/reload/restart (commands.ts:2271-2358) poll status.json refresh and send /new//reload//quit slash commands — pi bridge protocol, meaningless to claude/codex. And WORKER_PROMPT_HEADER (commands.ts:2166) bakes the pi-only orch_ask tool name into every worker prompt.

5. tmux is a runnable skeleton, and can never be auto-picked

The tmux backend implements the 11 required port methods with real tmux calls — spawn/deliver/focus/close work inside a session. But it omits the entire optional surface: no inventory, groups, workspaces, read, waitAgentStatus, renameAgent, createGroup. Every cockpit/fleet-visibility feature walks those methods and sees nothing — launch-and-steer works, see does not, which guts the whole cockpit thesis for tmux users. On top of that, resolveBackend (registry.ts:34-40) probes herdr-inside-session then falls straight to headless — tmux.isInsideSession() is never consulted, so a user sitting inside tmux gets the headless backend unless they explicitly configure tmux. And validateBackend only checks isAvailable() (binary on PATH), not isInsideSession(), so backend = tmux in config validates outside any tmux session and blows up later at spawn.

6. Onboarding is combination-aware in the questions, pi-shaped in the checks

Credit: the wizard genuinely asks adapter (pi/codex/claude) and backend (herdr/headless/tmux) and writes both to config (commands.ts:1638-1644) — that part matches what you asked for. But: the prereq loop (commands.ts:1653-1658) probes all four of bun, plexer, pi, claude regardless of selection — a claude+tmux user is told pi MISSING and offered a pi install. The plexer installer entry points at a placeholder URL https://example.invalid/install.sh (commands.ts:1459) and the id doesn't even match the backend name herdr. Doctor never reads defaults.adapter/defaults.backend to tailor its checks: it hard-requires pi (doctor.ts:100-112), always runs the claude hooks check (:296), and has no tmux check at all. The notifier wizard (setup/notifiers.ts) is fully dead code — written, tested, never called from cmdSetup; setup writes zero [[notify]] entries.

7. The specs lied about being done — structurally

The "any harness × any plexer, independently selectable, no hardcoded cross-branches" promise lives only in 



























































──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
❯
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ auto mode on (shift+tab to cycle) · ← 2 agents

`openspec/changes/pluggable-plexer-backends/design.md` defines the architecture as four cooperat
ing patterns, and D1 explicitly rejects Strategy-only: **Ports & Adapters (Hexagonal)** — core o
wns ports, foreign tools adapt to them; **Bridge** — agent × plexer as independent hierarchies,
no pair classes; **Adapter** — one per foreign CLI wrapping it to a port; **Provider Model (Fact
ory + Strategy)** — registry + factory for config-driven selection, Strategy only as the factory
's selection mechanism.

The failure, in that vocabulary: **the design was executed for one leg of the Bridge.** D2 ("the
 backend port is the identity and control authority") had migration gates and got enforced — hen
ce the clean plexer axis. **No D2-equivalent was ever written for the agent axis**, so nothing f
orced orchd/commands through the AgentAdapter port. And D6's `check:bridge` guards only the axis
 wall (adapters ↛ backends, backends ↛ agents), not the port boundary — core importing `piAdapte
r` and writing `inbox.jsonl` raw passes it. Hexagonal violated on the agent port; pi's Adapter n
ot actually wrapping (its internals leaked into core); Provider Model present at launch, absent
on the control path.

The remedy is the mirror openspec change (working name `adapter-control-authority`), with the mi
ssing decisions:

- **D2′ — the adapter port is the control authority for agent-directed messages.** One control d
ispatcher in core: `resolveAdapter → caps gate → port method → execute returned AdapterCommand`,
 backend `deliver` fallback per caps, loud exit-1 on absent capability. Deletes orchd's `piAdapt
er` import and every direct control write.
- **D3′ — pi's file protocol is pi-adapter-internal.** `inbox.jsonl`/`answer.json` I/O lives onl
y in `src/adapters/pi.ts`.
- **D6′ — extend `check:bridge` with a port-boundary check.** Core (outside `src/adapters/`, `sr
c/backends/`) may not import concrete adapter/backend modules nor contain adapter-internal file
literals. CI-gated — the plexer axis proved the pattern only holds where a static check holds it
.
- **Provider Model on install.** `cmdSetup`/doctor branches on harness die; setup calls `resolve
Adapter(config).installShim()` — each adapter installs its own integration (pi: bridge bundle; c
laude: hooks; codex: the missing `agent-turn-complete` notify shim). Doctor derives its checks f
rom the resolved adapter+backend.
- Migration gates like D2/D6 had, and the openspec scenarios actually run this time (the skipped
 8.2 gate is what allowed the false "done").

## 5. Fix list in dependency order

1. **orchd `deliverBackend`/`setModel`** (`orchd.ts:82-154`): resolve the target's adapter; exec
ute returned `AdapterCommand` or fall back to `backend.deliver` per `caps.steer`; check `caps.se
tModel` and fail loudly (exit 1, per the spec's degraded-mode rule) instead of silently dropping
. Un-breaks steer/model/broadcast/pipe for every non-pi adapter.
2. **commands.ts:1149 + answer/result/pipe**: execute adapter commands; gate on caps not `id !==
 "pi"`; route through `adapter.answer`/`extractResult`.
3. **Codex presence writer**: notify-hook shim on `agent-turn-complete`, or headless pipes outpu
t through `adapter.detectState`/`extractResult` (parsers exist and are tested).

❯ we have aa x b so multi level build we need strategy on top of other patterns and you did a whole report and were told to fuckgin record this what the fuck happneed to that

He's right that there was supposed to be a recorded pattern report. Let me hunt for it — repo docs, memory, and git history for deleted files:

● Running 2 shell commands, searching memories · 8s…
  ⎿  $ git log --all --oneline --name-only --pretty='%h %s' | grep -in 'pattern\|research\|design' | head -20; echo ---; grep -n 'Provider Model\|Hexagonal\|Bridge\|Adapter\|Strategy\|Factory' /mnt/c/Users/Bryan/Documents/orch/orch-architecture-current.md | head -20; echo ---; grep -rn 'pattern' /mnt/c/… (8s)
     (ctrl+b to run in background)
     (ctrl+b to run in background)

· Symbioting… (1m 54s · ↓ 5.5k tokens)