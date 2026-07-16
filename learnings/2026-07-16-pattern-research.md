# LEARNING — Pattern research record (2026-07-16, online)

Companion to `2026-07-16-harness-plexer-architecture.md` (the binding direction). That entry is the law; this entry is the full content of the online research behind it, recorded verbatim-in-substance so the work can never be lost again. Every claim below maps to how orch must be built.

## 1. Bridge — the a × b class-explosion result

Sources: refactoring.guru/design-patterns/bridge · en.wikipedia.org/wiki/Bridge_pattern · maxim-gorin.medium.com "Class explosion is real — Bridge can stop it" · www2.seas.gwu.edu Bridge example · sourcemaking.com/design_patterns/bridge

- The canonical trigger: a problem with **two independent dimensions**. With inheritance or pair-coding, the number of units is the **product** of the dimensions and "grows in geometric progression" — 2 shapes × 2 colors = 4 classes; every new member of either dimension multiplies.
- Bridge "refactors this exponentially explosive inheritance hierarchy into two orthogonal hierarchies — one for platform-independent abstractions, the other for platform-dependent implementations." Each side evolves independently; the join is composition (the abstraction *holds* an implementor), never inheritance and never pair classes.
- Bridge is a **structural** pattern (how code is organized long-term); Strategy is **behavioral** (swapping algorithms at runtime). They look similar (both compose) but solve different problems — this distinction is exactly why "just Strategy" was the wrong frame for orch.
- **orch mapping:** agents × plexers is the two-dimension case verbatim. `AgentAdapter` and `Backend` are the two orthogonal hierarchies; the spawn registry row `{adapter, backend}` is the composition point. Any `PiHerdr`-shaped unit or any core branch on a specific pair recreates the explosion.

## 2. Bridge + Abstract Factory pairing — legal combinations live in the factory

Sources: refactoring.guru/design-patterns/abstract-factory · feedback.refactoring.guru topics 5014 & 5058 (Bridge v. Abstract Factory)

- Refactoring.guru's explicit combination rule: "Abstract Factory can be used along with Bridge **when some abstractions defined by Bridge can only work with specific implementations.** In this case, Abstract Factory can encapsulate these relations and hide this information from the client code."
- Bridge and Abstract Factory are orthogonal: "one for structuring, the other for creating." The factory owns *which* pairings are valid and *how* a pairing is assembled; the bridge keeps the paired hierarchies ignorant of each other.
- **orch mapping:** `resolveAdapter(config)` + `resolveBackend(config)` are the factories; if a combination is ever genuinely illegal (e.g. an adapter that cannot run headless), that constraint is encoded **in the factory/builder**, surfaced at setup/doctor time — never as an `if` at a call site. `orch setup` is the Builder face of the same level: it assembles the chosen pair by having each provider install its own integration (`installShim()`).

## 3. Strategy composed with Bridge and Factory — the academic treatment

Source: home.cs.colorado.edu/~kena/classes/5448/f12/lectures/10-strategybridgefactory.pdf (Anderson, CU Boulder, "Strategy, Bridge & Factory")

- The three patterns are taught **as a set** because real systems layer them: Strategy for interchangeable behaviors an object owns, Bridge for dual-hierarchy structure, Factory for creation/selection. Strategy's context object is the piece that makes it a pattern at all — the strategies are useless without a single context that owns invoking them.
- Strategy swaps algorithms **you own**; foreign systems with their own interfaces need Adapter to become swappable first. (This is the reasoning design.md D1 already recorded when it rejected "Strategy only.")
- **orch mapping:** Strategy legitimately appears in two places only — (a) *inside* the factory as the selection mechanism, and (b) *inside* each adapter as capability-selected behaviors (steer mechanism inbox|keys|resume|none). The missing "context" was orch's root defect: strategies existed, no dispatcher owned them, so call sites invoked concrete pi behavior directly.

## 4. Hexagonal / Ports & Adapters — the boundary discipline

Sources: jmgarridopaz.github.io/content/hexagonalarchitecture.html · docs.aws.amazon.com hexagonal-architecture pattern · teachmeidea.com · journal.optivem.com · synchronium.github.io ports-and-adapters · saadh393.github.io (two real codebases)

- Origin: Alistair Cockburn, 2005. Business logic sits at the center; **all** infrastructure (UI, DB, brokers, external APIs, CLIs) is peripheral. The mechanism is the Dependency Inversion Principle: "instead of business logic depending on infrastructure, infrastructure depends on business logic."
- A **port** is "an interface defined by the domain describing a capability the domain requires," technology-agnostic. An **adapter** "is the plug that fits the socket — each one wraps a single provider and translates between our words and theirs."
- Driver (inbound) vs driven (outbound) ports: drivers use the app to achieve goals; driven ports are what the app needs from the world. Both directions cross **only** through ports.
- **orch mapping:** core owns two driven ports (`AgentAdapter`, `Backend`). "Wraps a *single* provider" is load-bearing: pi's file protocol is pi-adapter-internal, herdr's socket verbs are herdr-backend-internal. Core importing `piAdapter` (orchd.ts:25) or writing `inbox.jsonl` raw is the textbook violation — infrastructure detail reached into the domain.

## 5. Capability negotiation — how real protocols absorb heterogeneous providers

Sources: microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification · deepwiki.com/hashicorp/terraform-ls (LSP implementation, capability negotiation, request routing) · developer.hashicorp.com/terraform/plugin/framework/providers · dev.to/quixoticmonk + manuchandrasekhar.medium.com (provider schema introspection)

- **LSP:** "Not every language server can support all features defined by the protocol. LSP therefore provides *capabilities*. A capability groups a set of language features," and flags "are exchanged between client and server during initialization." After the handshake, the client gates every feature on the negotiated capability — **never on which server it is talking to**. Compatibility across versions/implementations is maintained purely by capability flags.
- **Terraform provider model:** each provider declares its supported surface as an introspectable schema (`providers schema` exposes resource/data-source/function/action schemas as structured JSON). Core drives *any* provider through the declared schema; capability types were added over time without call-site changes because callers only ever consumed the declaration.
- terraform-ls composes both: LSP capability negotiation on one side, provider schema introspection on the other — a working a × b system (editors × providers) with no pair code.
- **orch mapping:** `caps.steer/ask/setModel/sessionTail` and backend `panes/focusable/canSendKeys` + optional-method presence are orch's capability declarations. The rule imported from these protocols: **branch on the declaration, never the identity; unsupported = loud failure, never a silent no-op.** A declared-but-unconsumed capability system (orch's current state — caps exist, nothing reads them) is the same as no capability system.

## 6. Cross-cutting synthesis (what the research says as one sentence each)

1. Two independent dimensions ⇒ Bridge, or you pay the product (refactoring.guru, Wikipedia, Gorin).
2. Legal pairings and assembly belong in a Factory/Builder, invisible to call sites (refactoring.guru pairing rule).
3. Strategy is only real when exactly one context invokes it (Anderson; GoF).
4. Foreign tools become swappable only behind per-tool Adapters wrapping a single provider each (hexagonal sources).
5. Heterogeneous providers are absorbed by declared capabilities + negotiation, never identity checks (LSP, Terraform).
6. Boundaries survive only under mechanical enforcement — dependency direction in hexagonal, protocol handshake in LSP, schema contract in Terraform; orch's equivalent is `check:bridge` + the port-boundary check as CI/migration gates.

## Settings format decision (recorded here because it came out of the same session)

**`$ORCH_DIR/settings.json` — JSON, not TOML. Final.** Rationale: config.toml required a ~150-line hand-rolled TOML parser plus a `Bun.TOML` probe (runtime-pinning smell) and textual-surgery writes (`writeDefaultEntry`); JSON gets `JSON.parse`/`stringify` in the platform, whole-file round-trip writes from setup, schema validation, and trivial doctor verification. Hand-editable by users, written by setup, `schemaVersion`-stamped, one current schema per repo Rule 8 (old `config.toml` is malformed data — reap/error, never migrate).
