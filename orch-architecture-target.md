# orch — TARGET architecture (daemon as broker)

Compare with `orch-architecture-current.md`. The move: everything that today goes *beside* the daemon now goes *through* it. Socket for live push, durable store underneath, writes brokered + governed.

```mermaid
flowchart TB
  classDef broker fill:#e8e8ff,stroke:#5555cc,color:#222;
  classDef store fill:#e6f7e6,stroke:#33aa33,color:#222;
  classDef future fill:#fff3d6,stroke:#cc9a00,color:#333;

  subgraph CLIENTS["Orchestrators / operators — MANY (local now)"]
    C1["orch CLI = THIN client<br/>(no direct herdr for writes)"]
    C2["remote operator: laptop -> VPS"]:::future
  end

  subgraph DAEMON["orchd — THE broker  (REQUIRED for any write)"]
    SOCK["transport endpoint<br/>unix orchd.sock now<br/>-> TCP+TLS / SSH tunnel later"]
    CONN["connection mgr<br/>subscribe + PUSH events (no polling)"]
    BROKER["dispatch broker<br/>enforces OWNERSHIP + WORKSPACE WALL"]
    DELIV["message delivery<br/>at-least-once: persist -> send -> ack -> retry"]
    WL["workLoop (workspace-scoped)"]
    PW["presence aggregator = SINGLE watcher"]
    NOTIFY["notify sinks"]
    CW["configWatch (hot-reload)"]
  end

  subgraph STORE["durable store under $ORCH_DIR"]
    SQL["SQLite (WAL)<br/>queue, ownership, inbox/outbox, spawn registry<br/>concurrent + queryable + crash-safe"]
    JSONL["jsonl logs<br/>results, transitions, transcripts<br/>(durable + human visibility + replay)"]
  end

  subgraph PLEX["Backend / Plexer: herdr | headless  (+ tmux later)"]
    HERDR["plexer: panes/tabs/workspaces"]
  end

  subgraph AGENT["Agent pane"]
    ADAPTER["Harness / Adapter: pi | claude"]
    BRIDGE["pi + orchestrator-bridge<br/>writes jsonl AND notifies daemon"]
  end

  %% clients connect once, get pushed
  C1 -->|"connect once (RPC)"| SOCK
  C2 -.->|"future: authenticated network"| SOCK
  SOCK --> CONN
  CONN -->|"PUSH events"| C1

  %% writes are brokered + governed
  C1 -->|"dispatch/steer/model -> RPC"| BROKER
  BROKER -->|"check owner + wall; allowed -> execute"| HERDR
  BROKER --> DELIV
  DELIV --> SQL
  HERDR --> ADAPTER
  ADAPTER --> BRIDGE

  %% agent reports: durable jsonl + notify the single watcher
  BRIDGE -->|"state -> jsonl (durable/visible)"| JSONL
  BRIDGE -->|"notify"| PW
  PW --> CONN

  %% resident subsystems live INSIDE the broker
  WL --> SQL
  WL -->|"scoped assign -> broker"| BROKER
  CW --> STORE

  class DAEMON broker
  class STORE,SQL,JSONL store
```

## What MOVES (beside -> inside the daemon)

| concern | today (beside) | target (inside broker) |
|---|---|---|
| dispatch / steer / model | CLI -> herdr direct, ungoverned | RPC -> broker, ownership + wall enforced |
| live events | every CLI file-watches / polls `/mnt` | one socket, daemon pushes |
| workLoop assign | cross-workspace, direct path | workspace-scoped, through broker |
| message durability | fire-and-forget into inbox.jsonl | persist -> send -> ack -> retry (at-least-once) |
| presence watching | N watchers | 1 aggregator in the daemon |
| when daemon is down | writes sneak through direct path | writes REFUSE (reads still file-fallback) |

## Design principles baked in
- **Socket for live, store for durable.** Push over `orch.sock`; nobody polls files. jsonl stays as the durable/visible log + replay source.
- **At-least-once messaging.** Steers/dispatches are persisted before send, acked by the agent, retried on failure, and survive a daemon restart. No lost messages.
- **Reconnect replay.** Clients track a sequence number; on reconnect the daemon replays missed transitions from the log.
- **Transport-agnostic from day one.** RPC semantics don't assume a unix socket — the same protocol swaps to TCP+TLS or an SSH tunnel for the long-term cross-machine goal (laptop steering a VPS) without changing call sites.
- **Governance is free.** Because writes go through one broker, ownership + workspace walls live in exactly one place.
- **Reads stay resilient.** `status`/`events` prefer the socket but fall back to file-watch — daemon absence degrades *reads*, and *refuses* writes.
