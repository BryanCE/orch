# orch — pattern architecture chart

How the pattern stack (`docs/reference/design-patterns.md`, binding per `learnings/2026-07-16-harness-plexer-architecture.md`) fits together as one machine. This is the **target end-state after the six open changes land**; the comparison at the bottom maps it against the two existing architecture charts.

## The pattern machine

```mermaid
flowchart TB
  classDef core fill:#e8e8ff,stroke:#5555cc,color:#222;
  classDef port fill:#fff3d6,stroke:#cc9a00,color:#333;
  classDef provider fill:#e6f7e6,stroke:#33aa33,color:#222;
  classDef enforce fill:#ffe6e6,stroke:#cc3333,color:#511;
  classDef store fill:#f0f0f0,stroke:#888,color:#222;

  SETTINGS["settings.json  (L4b storage)<br/>defaults.adapter · defaults.backend · notify · …<br/>hand-editable · schemaVersion · loud validation"]:::store

  subgraph CORE["CORE — owns the ports, knows NO provider (L0 Hexagonal)"]
    CMDS["command layer  src/commands/*<br/>(L: post-breakdown, ≤700-line domain modules)"]
    DISPATCH["control dispatcher  src/control/dispatch.ts  (L5 Facade/Context)<br/>resolve adapter → gate on caps → invoke → EXECUTE returned AdapterCommand<br/>keys fallback via backend.deliver · absent cap = loud exit 1"]
    FACTORY["composition root  (L4 Provider Model)<br/>resolveAdapter(config) · resolveBackend(config)<br/>orch setup = Builder → provider.installShim()"]
    EVENTS["core domain events<br/>(daemon transitions — the ONLY cross-axis channel, L1b)"]
    CMDS --> DISPATCH
    CMDS --> FACTORY
  end

  subgraph AXIS_A["AXIS a — AgentAdapter PORT (L1 Bridge leg 1)"]
    APORT["AgentAdapter port  (L0)<br/>caps: steer inbox|keys|resume|none · ask · setModel · sessionTail  (L3 capability negotiation)"]:::port
    PI["pi adapter  (L2)<br/>wire: inbox.jsonl · answer.json<br/>shim: bridge extension"]:::provider
    CLAUDE["claude adapter  (L2)<br/>wire: settings hooks<br/>shim: hook installer"]:::provider
    CODEX["codex adapter  (L2)<br/>wire: notify events · resume argv<br/>shim: notify writer"]:::provider
    APORT --- PI & CLAUDE & CODEX
  end

  subgraph AXIS_B["AXIS b — Backend PORT (L1 Bridge leg 2)"]
    BPORT["Backend port  (L0)<br/>caps: panes · focusable · canSendKeys · optional-method presence  (L3)"]:::port
    HERDR["herdr backend  (L2)<br/>wire: socket RPC + CLI"]:::provider
    TMUX["tmux backend  (L2)<br/>wire: argv + pane options"]:::provider
    HEADLESS["headless backend  (L2)<br/>wire: processes + registry"]:::provider
    BPORT --- HERDR & TMUX & HEADLESS
  end

  subgraph AXIS_N["AXIS n — every future concern (L1b: notify TODAY, MCP/webhooks/auth LATER)"]
    NPORT["sink port + registerSinkProvider"]:::port
    SINKS["desktop · webhook · command"]:::provider
    NPORT --- SINKS
  end

  subgraph PRESENCE["DATA PLANE — presence protocol  $ORCH_DIR/agents/&lt;key&gt;/"]
    FILES["status.json · result.json<br/>written by each adapter's shim, READ by core<br/>identity: opaque ORCH_AGENT_KEY = backend~workspace~handle"]:::store
  end

  CHECKS["L6 STATIC ENFORCEMENT — check:bridge + port-boundary check<br/>① adapters ↛ backends ↛ agents (axis wall, any N axes)<br/>② core ↛ concrete providers, ↛ wire literals, ↛ id-branches<br/>CI + migration gates · scenarios MUST actually run"]:::enforce

  SETTINGS --> FACTORY
  FACTORY -->|"compose (adapter, backend) per spawn<br/>record pair in identity + spawn registry<br/>live agents keep spawn-time pair (L4b)"| APORT
  FACTORY --> BPORT
  DISPATCH -->|"steer / answer / model"| APORT
  DISPATCH -->|"deliver / keys fallback"| BPORT
  PI & CLAUDE & CODEX -->|"shims write"| FILES
  FILES -->|"core reads files only"| CMDS
  EVENTS --> NPORT
  FILES --> EVENTS

  class CORE core
  CHECKS -.-> AXIS_A
  CHECKS -.-> AXIS_B
  CHECKS -.-> CORE
```

## One control message through the machine (steer, per adapter strategy)

```mermaid
sequenceDiagram
  participant U as orch steer <target>
  participant D as orchd (broker: wall+owner)
  participant X as control dispatcher (L5)
  participant A as adapter (L3 strategy)
  participant B as backend port

  U->>D: writeRpc steer (governed, durable outbox)
  D->>X: deliverControl(target, steer)
  X->>X: resolve adapter from target's recorded pair (L4b)
  alt caps.steer = inbox  (pi)
    X->>A: adapter.steer() — writes its OWN inbox.jsonl (L2 wire containment)
  else caps.steer = resume  (codex)
    X->>A: adapter.steer() → AdapterCommand argv
    X->>X: EXECUTE the returned command (was dropped pre-fix)
  else caps.steer = keys  (claude)
    X->>B: backend.deliver(kind: message)
  else caps.steer = none
    X-->>U: loud exit 1 — never a silent no-op
  end
```

## Comparison vs the existing charts

| | `docs/charts/old/system-asbuilt-2026-07-15.md` (as-built chart) | `docs/charts/old/broker-target-2026-07-15.md` (broker chart) | **this chart (pattern machine)** |
|---|---|---|---|
| **Question it answers** | "what runs today and in what order" | "which writes go through the daemon" | "why any harness×plexer combination works and what stops it regressing" |
| **Adapter axis** | one box "AgentAdapter: pi \| claude \| codex" — hides that only pi was wired | same single box | three concrete adapters, each with its **own wire format and shim**, behind one caps-negotiated port |
| **The defect, visibly** | the defect is *in* the chart as normal flow: `OB → deliverBackend: … piAdapter.steer` and `SM → inbox.jsonl` — pi hardcoded inside the broker, drawn as if universal | same: "message delivery" arrows terminate in the pi inbox; adapter heterogeneity invisible | the L5 dispatcher + per-caps strategy branches make the pi-only path impossible to draw — there is no arrow from core to `inbox.jsonl` |
| **Control plane** | CLI → RPC → govern → outbox → backend/pi-inbox (no adapter dispatch step) | RPC → broker → backend (adapter step absent) | broker → **dispatcher → adapter strategy** → backend fallback; the missing L5 layer is explicit |
| **Capabilities** | listed only for backends (`panes, focusable, canSendKeys`) | same | both axes carry caps; caps are the *branching mechanism*, drawn as the alt-paths of the sequence diagram |
| **Settings/composition** | `config.toml` box, no consumer arrows to selection | `configWatch` only | `settings.json → composition root → per-spawn recorded pair`, re-pairing + mixed fleets (L4b) first-class |
| **Enforcement** | absent | absent | L6 box gating all three boundaries — the layer whose absence let the agent axis rot |
| **N-axis growth** | notify sinks drawn as daemon internals | same | notify drawn as **axis n** with the same port+registry shape, the template for MCP/webhooks/auth |
| **Honesty about state** | claims "Bridges are plexer-agnostic" (true for identity, false for the herdr-wired HUD half) | claims broker/governance "IMPLEMENTED" while steer terminates in pi's inbox | target-state chart, explicitly labeled as post-six-changes; conformance table lives in `docs/reference/design-patterns.md` |

**Bottom line:** the two existing charts are *flow* charts — they show plumbing order and both faithfully drew the pi-hardcoded delivery path as if it were the universal protocol, which is exactly how the defect stayed invisible. This chart is a *contract* chart: it draws the boundaries (ports, wire containment, caps, dispatcher, enforcement), so a pi-only arrow from core to `inbox.jsonl` is not drawable without visibly crossing a red boundary. After the six changes land, `docs/charts/old/system-asbuilt-2026-07-15.md` should be regenerated to match this shape (that's covered by monolith-file-breakdown's doc task).
