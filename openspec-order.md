All six changes are authored, complete, and passing openspec validate --strict on disk:

┌─────┬──────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
│  #  │            change            │                             what it fixes                             │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ L5 dispatcher (src/control/dispatch.ts), orchd de-pi'd, caps gating,  │
│ 1   │ adapter-control-authority    │ executed AdapterCommands, pi wire format contained,                   │
│     │                              │ port-boundary-guard static check, sanctioned src/adapters/registry.ts │
│     │                              │  composition root                                                     │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ codex notify shim + live parser wiring, installShim() on the port for │
│ 2   │ adapter-presence-writers     │  all three adapters, readSessionView() kills isPi,                    │
│     │                              │ herdrStatus→backendStatus, caps-aware worker prompts                  │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ settings.json replaces config.toml, both TOML parsers deleted (incl.  │
│ 3   │ settings-json-config         │ the second one it found in notify.ts), atomic JSON writes, orch       │
│     │                              │ settings with provenance, Rule 8 no-migration                         │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ setup as Builder calling installShim(), selected-provider prereqs,    │
│ 4   │ provider-driven-setup-doctor │ real installer ids, notifier wizard wired, provider-derived doctor +  │
│     │                              │ live mixed-fleet verification                                         │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ full optional port surface via pane user options, presence-sourced    │
│ 5   │ tmux-backend-completion      │ status, orch-only list(), tmux auto-probe, uniform fail-fast session  │
│     │                              │ validation, cross-session wall                                        │
├─────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│     │                              │ commands.ts → 14 domain modules + pure dispatch index, bridge → 4     │
│ 6   │ monolith-file-breakdown      │ modules, doctor/notify split, ≤700 ceiling mechanically verified,     │
│     │                              │ hard-gated to land last                                               │
└─────┴──────────────────────────────┴───────────────────────────────────────────────────────────────────────┘

Implementation order is encoded in the changes themselves: 1 → (2, 3 in either order) → 4 → 5 → 6, and every tasks.md ends with actually executing its spec scenarios — the gate whose absence let the last change lie about being done.

Two coherence items I've already caught for the cross-check: the orphaned notifier-adapters spec wording (settings and setup each deferred it to the other — needs assigning to settings-json-config), and codex's shim potentially editing the user's global ~/.codex/config.toml (presence-writers flagged per-spawn notify as preferred if codex supports it). One stale note to ignore: monolith's report says the siblings are "bare scaffolds" — it checked early in its run; all five are fully authored now, and its task 0.1 gate re-verifies at implementation time anyway.

Say the word and I'll run the coherence-verify workflow across the six (boundary contracts, law conformance, scenario quality, overlap/gap detection) before you approve implementation — or if you're satisfied with the two flagged items as the only risks, we can go straight to /opsx:apply adapter-control-authority.


● Teammate @spec-monolith finished

● Teammate @spec-tmux finished

Those are just the final idle confirmations from spec-monolith and spec-tmux — both reports already received and all six changes verified valid on disk. Nothing pending. The fleet's work is done; next step is yours to call: coherence-verify workflow across the six changes, or straight to implementation starting with adapter-control-authority.