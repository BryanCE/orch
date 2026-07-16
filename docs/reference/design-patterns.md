# orch design-pattern stack — the recorded reference

This is the durable record of the pattern research behind orch's harness × multiplexer architecture. The only prior record was the five-line summary in `openspec/changes/pluggable-plexer-backends/design.md` ("Research into comparable tools supports this architecture"); the full report was never committed. This file is now the authority — every future change that touches the adapter/backend layers must conform to this stack or amend this doc first.

## The problem shape

orch has an **a × b build**: `a` agent harnesses (pi, claude, codex, …) × `b` multiplexers (herdr, tmux, headless, …). Every harness and multiplexer has a genuinely different integration surface (pi: in-process extension API; claude: out-of-process lifecycle hooks; codex: notify events; herdr: socket RPC + CLI; tmux: CLI only; headless: bare processes). Naive designs fail in one of two ways:

1. **Pair classes** (`PiHerdrRunner`, `ClaudeTmuxRunner`, …) — the N×M class explosion Bridge exists to kill; combinations grow geometrically and each new harness requires touching every multiplexer.
2. **One "universal" code path that is secretly one pair's happy path** — what orch actually did: pi's file protocol promoted to "the protocol," every other harness broken. This is the same explosion, just deferred and hidden.

The fix is not one pattern. It is a **six-level composition**, each level solving the failure mode the level below can't:

## The stack

### L0 — Hexagonal / Ports & Adapters (system boundary)
Core owns exactly two ports — `AgentAdapter` ("what runs") and `Backend` ("where it runs") — and depends on nothing outside them; all infrastructure depends inward (dependency inversion). A port is a technology-agnostic interface the domain defines; an adapter is "the plug that fits the socket," each wrapping a single provider and translating between our vocabulary and theirs. **Rule: core code never imports a concrete adapter/backend module and never touches an adapter's private wire format.** Violating this is how `piAdapter` ended up imported in `orchd.ts` and `inbox.jsonl` written raw across core.

### L1 — Bridge (the a × b split)
The two ports are **independently varying hierarchies**: no class, function, or file may represent an (agent, plexer) pair. Adding harness N+1 or plexer M+1 touches one new adapter file + registration, zero call sites. Refactoring.guru's rule of thumb applies verbatim: reach for Bridge "when your problem has two independent dimensions" and the combinations would otherwise multiply.

#### L1b — N-axis generalization (3rd/4th concerns: notifiers, webhooks, MCP, auth, …)

Bridge is the 2-axis special case of the general rule: **every independent concern is its own port with its own provider registry, and no provider ever references another axis's provider.** Under that rule, cost is **additive, not multiplicative** — N axes with kᵢ providers each = Σkᵢ adapter modules, never Πkᵢ combinations. Explosion comes only from code that represents a combination (pair classes, or one provider branching on another axis). Mechanics that keep N axes flat:

- **One composition root.** Only the L4 factory/builder layer (plus the per-agent record) sees all axes at once and composes the configured tuple `{adapter, backend, notifiers, …}`. Everything else consumes exactly one port. Adding an axis = new port + registry + `settings.json` key; zero call-site edits.
- **Cross-axis interaction via core domain events, never direct references** (Mediator/event-bus). A notifier that fires on agent events consumes a core event carrying the identity — it never imports an adapter. Proven in-repo: notify sinks are *already a third axis* (`registerSinkProvider`, desktop/webhook/command) and stayed completely clean because they consume daemon events and know nothing about pi or herdr.
- **The axis wall generalizes to one rule:** a provider module may import core types only — never another provider family. `check:bridge` enforces this as a single direction constraint regardless of axis count.

This is the microkernel/plugin architecture shape, and it is how the precedents scale: Terraform added whole new capability families (functions, ephemeral resources, actions) without call-site changes because providers only ever meet the core contract, never each other. **Rule for future concerns (MCP, webhooks, auth): new port + registry + settings key + providers importing core types only. Never a bridge to an existing axis, never a combination unit.**

### L2 — Adapter, GoF (per concrete foreign tool)
Each of pi/claude/codex and herdr/tmux/headless is a classic Adapter over a foreign CLI/API. The adapter **owns its tool's entire wire surface**: pi's `inbox.jsonl`/`answer.json`, claude's `settings.json` hooks, codex's notify events, herdr's socket RPC, tmux's argv grammar. Those names/formats appear in exactly one module each. The moment a wire detail leaks out of its adapter, L0 is broken and L1's independence is fiction.

### L3 — Strategy + capability negotiation (inside each axis — "strategy on top")
This is the level orch's spec named but never enforced, and the direct answer to "each harness needs specific code, plugged into one adapter." Within an adapter, each varying *behavior* is a declared strategy, selected by **capability flags**, LSP-style: at LSP initialization, client and server exchange capability flags because "not every language server can support all features"; callers then gate on the negotiated capability, never on the server's name. Terraform does the same — providers expose their supported capabilities as introspectable schema, and the core drives any provider through that declaration.

orch's equivalents, already declared on the port (`adapter.ts:84-93`, `backend.ts:5-12`):
- **steer strategy**: `inbox` (pi: lossless file inbox) | `keys` (claude: backend keystroke delivery) | `resume` (codex: `codex resume` argv) | `none` (fail loudly).
- **ask / setModel / sessionTail** flags; backend `panes` / `focusable` / `canSendKeys` flags and optional-method presence.

**Rule: callers branch on capability, never on identity.** `if (caps.steer === "keys")` is the pattern; `if (adapter.id !== "pi")` (`commands.ts:1149`) is the anti-pattern that rotted the system. A declared capability whose strategy the caller can't honor is a loud exit-1 (the spec's degraded-mode rule), never a silent no-op.

### L4 — Provider Model: Registry + Factory + Builder (config-driven assembly)
Selection and assembly of the configured (a, b) pair:
- **Registry + Factory**: `registerBackend`/`resolveBackend(config)`, `resolveAdapter(config)` — Strategy is the factory's *selection* mechanism, which is the only place "Strategy" appears at the axis level (design.md D1 rejected Strategy-only correctly: Strategy swaps algorithms you own; foreign tools need Adapter + Bridge).
- **Builder (setup/onboarding)**: `orch setup` is the Builder that assembles a working installation for the chosen pair — it asks each resolved provider to install *its own* integration (`adapter.installShim()`: pi builds+links the bridge bundle, claude writes hooks, codex installs its notify shim; backend analog for plexer-side needs). Abstract Factory's pairing rule from the literature applies here: use it with Bridge "when some abstractions can only work with specific implementations" — encode legal combinations in the factory/builder, never as branches at call sites. `cmdSetup`'s `if (harness === "pi") … if (harness === "claude") …` (`commands.ts:1676-1714`) is this level done wrong.
- **Doctor** derives its checks from the resolved providers (ask each adapter/backend to self-diagnose), not from a fixed list.

#### L4b — Composition & re-pairing (the "current setup" is mutable state, not an installation)

A user's setup is any (harness, plexer) pairing — tmux+claude, herdr+pi, tmux+pi — **changeable at any time in either axis independently** (reset to tmux, keep pi). Requirements this imposes:

- **Compose, never bake.** No code path may cache or hardcode the pair. The pair is composed at exactly two moments: (1) *config-resolution time* — `resolveAdapter(config)` + `resolveBackend(config)` for each new spawn; (2) *spawn time* — the composed pair is recorded per agent (identity key carries the backend; spawn registry + presence record carry the adapter, `BackendRegistryRecord.{backend,adapter}`). Nothing between those two moments re-derives the pair from anything but config or the per-agent record.
- **Live agents keep their spawn-time composition.** Changing `defaults.backend`/`defaults.adapter` affects new spawns only. An existing herdr+pi pane remains steerable/closeable through its recorded backend+adapter after the user switches defaults to tmux+claude — this is why every control verb resolves per-target from the identity/registry (`backendTarget()` style), never from current defaults. Mixed fleets are a supported steady state, not an edge case.
- **Re-pairing is additive and idempotent.** `installShim()` per provider must be safe to run repeatedly and must never remove another provider's integration. Installed shims for non-selected providers stay dormant harmlessly (they self-gate on `ORCH_AGENT_KEY` / their own env), so switching axes is a config write, not an uninstall/reinstall cycle. `orch setup` re-run (or a `config set defaults.*`) is the whole re-pairing ceremony.
- **Doctor validates the *current* composition** — the configured pair plus any pairs still live in the fleet — not a fixed checklist.

This is composition-over-inheritance at the system level: the runtime unit is the composed `{adapter, backend}` value per agent, and "the user's setup" is just the pair of defaults the factories read next time.

**Setup installs a SET per axis; settings switch the active member.** The wizard multi-selects providers per axis (e.g. install pi AND claude; multiple plexers) and runs each selected provider's `installShim()`. `settings.json` records the installed sets plus the active `defaults.adapter`/`defaults.backend` (validated as members of the installed sets). Switching the active provider — or spawning with `--agent`/`--backend` from any installed provider — is a plain settings/flag choice with no reinstall; dormant shims self-gate. Doctor verifies every installed provider, not just the active pair.

**Storage: `$ORCH_DIR/settings.json`.** The composition's persistent form is one user-facing JSON settings file — written by the setup wizard, hand-editable by users, `schemaVersion`-stamped (Rule 8: exactly one current schema; bump the constant and fix every writer/reader/test in the same change; out-of-date files are malformed, never migrated). Loaded and validated on every command: unknown keys, wrong types, or unknown adapter/backend ids fail loudly with the file path and reason. Setup writes it by whole-file JSON round-trip — never textual surgery. Verification is first-class: `orch doctor` checks the *declared* settings against *reality* (configured backend available/inside-session, configured adapter binary on PATH, its shim installed and current, plus every pair still live in the fleet), and a `orch settings` read surface prints the effective values and where each came from (flag > env > settings.json > built-in default). This replaces `config.toml` and deletes the hand-rolled TOML parser, the `Bun.TOML` probe, the `writeDefaultEntry` text upsert, and the legacy `ssh` alias.

### L5 — Facade / Context (single dispatch surface)
The GoF Strategy/Bridge structure only holds if there is a **context object that is the sole invoker** of the strategies. orch built the strategies and skipped the context — that is the root mechanical failure. Required: one control-plane dispatcher (`deliverControl(target, action)`) that does `resolveAdapter → caps gate → port method → execute returned AdapterCommand → backend fallback per caps → loud failure`. The daemon and every command verb call the dispatcher and nothing else. Data plane stays symmetric: adapters write presence files however their harness allows; core reads presence files only.

### L6 — Enforcement (the level that keeps the others real)
Patterns without static enforcement regress to inlining — proven in this repo: the plexer axis had `check:bridge` (D6) and stayed clean; the agent axis had no check and rotted. Required checks:
- axis wall (existing `check:bridge`): adapters ↛ backend types/env; backends ↛ agent types.
- **port boundary (new)**: core (outside `src/adapters/`, `src/backends/`) may not import concrete adapter/backend modules nor contain adapter-internal wire literals (`inbox.jsonl`, `answer.json`, hook paths, socket verbs).
- capability honesty: no `adapter.id`/`backend.id` equality branches in core (grep-able).
- CI + migration gates, and openspec scenarios actually executed before a change is checked done (skipping this — task 8.2 — is how "built" was falsely claimed).

## The one-line law

**Wire formats live in adapters (L2), behaviors are capability-negotiated strategies (L3), assembly is the factory/builder's job (L4), invocation goes through one dispatcher (L5), and a static check guards every boundary (L6).** Any new harness or multiplexer = one adapter file + registration + its installShim. Anything else is a regression against this doc.

## Current conformance (as of 2026-07-16)

| Level | plexer axis | agent axis |
|---|---|---|
| L0 port owned by core | ✅ | ✅ interface exists |
| L1 no pair classes | ✅ | ✅ |
| L2 wire format contained | ✅ (herdr CLI/socket in backend) | ❌ pi's files written across core |
| L3 caps-gated strategies | ✅ callers gate on method presence | ❌ id-checks; caps never consulted |
| L4 registry/factory/builder | ✅ resolve; ❌ tmux never auto-probed | ⚠️ resolve at launch only; ❌ installShim dead; setup branches on harness |
| L5 single dispatcher | ✅ backend port is the choke point | ❌ none — orchd hardcodes piAdapter |
| L6 static enforcement | ✅ check:bridge | ❌ no port-boundary check |

Gap details and the ordered fix list: `docs/reviews/architecture-review-2026-07-16.md` §2/§4/§5.

## Sources

- [Bridge — Refactoring.Guru](https://refactoring.guru/design-patterns/bridge) (two independent dimensions; geometric class growth)
- [Abstract Factory — Refactoring.Guru](https://refactoring.guru/design-patterns/abstract-factory) and [Bridge + Abstract Factory pairing](https://feedback.refactoring.guru/communities/3/topics/5014-could-somebody-explain-me-how-to-use-bridge-with-abstrac-factory) (encapsulate legal abstraction↔implementation combinations)
- [Bridge pattern — Wikipedia](https://en.wikipedia.org/wiki/Bridge_pattern)
- [Class explosion is real — Bridge can stop it (Gorin)](https://maxim-gorin.medium.com/class-explosion-is-real-bridge-can-stop-it-4df958b95c8e)
- [Strategy, Bridge & Factory — Anderson, CU Boulder](https://home.cs.colorado.edu/~kena/classes/5448/f12/lectures/10-strategybridgefactory.pdf) (the three patterns composed)
- [Hexagonal Architecture — jmgarridopaz](https://jmgarridopaz.github.io/content/hexagonalarchitecture.html) and [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html) (ports/adapters, dependency inversion)
- [LSP 3.17 specification — capabilities](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) (capability flags because not every server supports every feature)
- [Terraform provider schema/capabilities](https://developer.hashicorp.com/terraform/plugin/framework/providers) and [provider capability introspection](https://dev.to/quixoticmonk/exploring-terraform-provider-capabilities-with-schema-analysis-1bmd) (provider model with declared capabilities)
