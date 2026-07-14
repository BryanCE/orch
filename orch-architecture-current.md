# orch — current (as-built) architecture

Solid arrows = normal flow. **Dashed red = write/dispatch path that BYPASSES the daemon (no wall, no ownership).**

```mermaid
flowchart TB
  classDef daemon fill:#e8e8ff,stroke:#5555cc,color:#222;
  classDef store fill:#e6f7e6,stroke:#33aa33,color:#222;
  classDef warn fill:#ffe6e6,stroke:#cc3333,color:#900;

  subgraph ORCH["Orchestrator — a Claude in a pane (e.g. wD:p1). MANY can exist."]
    CLI["orch CLI<br/>bin/orch.ts -> src/commands.ts"]
  end

  subgraph DAEMON["orchd daemon — src/daemon/orchd.ts  (OPTIONAL, often NOT running)"]
    RPC["JSON-RPC @ orchd.sock"]
    PW["presenceWatch -> transitions"]
    NOTIFY["notify sinks (toast/webhook)"]
    WL["workLoop<br/>queue auto-assign"]
    CW["configWatch (hot-reload)"]
  end

  subgraph STORE["$ORCH_DIR — the ACTUAL message bus (plain files)"]
    QUEUE["queue"]
    CFG["config.toml"]
    subgraph PRES["agents/[key]/ — one dir per agent"]
      STATUS["status.json<br/>agent -> world"]
      RESULT["result.json"]
      INBOX["inbox.jsonl<br/>world -> agent"]
    end
  end

  subgraph PLEX["Plexer = Backend (src/backends): herdr | headless"]
    HERDR["herdr control socket<br/>panes / tabs / workspaces<br/>agent start/send, pane send-keys"]
  end

  subgraph AGENT["Agent pane"]
    ADAPTER["Harness = Adapter (src/adapters): pi | claude<br/>(how to launch the agent binary)"]
    BRIDGE["pi process + orchestrator-bridge extension<br/>identity from HERDR_PANE_ID"]
  end

  %% 1 spawn
  CLI -->|"1 Backend.spawn"| HERDR
  HERDR -->|"launch adapter cmd"| ADAPTER
  ADAPTER --> BRIDGE

  %% 2 dispatch / steer  -- UNGOVERNED DIRECT PATH
  CLI -.->|"2 dispatch / run / steer / model"| HERDR
  HERDR -.->|"agent send + send-keys Enter"| BRIDGE
  CLI -.->|"2b append steer"| INBOX
  INBOX -->|"bridge reads"| BRIDGE

  %% 3 self-report state
  BRIDGE -->|"3 writes own state"| STATUS
  BRIDGE --> RESULT

  %% 4 observe
  CLI -->|"4 status: read files"| STATUS
  CLI -->|"4 events: try RPC first"| RPC
  CLI -.->|"...else fall back to file-watch"| PRES

  %% daemon internals
  RPC --> PW
  PW --> PRES
  PW --> NOTIFY
  WL --> QUEUE
  WL -.->|"assign uses the SAME direct path<br/>(cross-workspace, ungoverned)"| HERDR
  CW --> CFG

  WARN["the gap: every WRITE (dashed) skips the daemon.<br/>no ownership check, no workspace wall, any orch caller can hit any agent"]:::warn
  CLI -.-> WARN

  class DAEMON daemon
  class STORE,PRES store
```

## The four flows
1. **Spawn** — CLI calls a **Backend** (herdr/headless), which launches an **Adapter** (pi/claude). Backend = *where it runs* (plexer). Adapter = *what runs* (harness).
2. **Dispatch/steer (WRITE)** — CLI goes **straight to herdr** (`agent send` + `send-keys Enter`) or appends to `inbox.jsonl`. **The daemon is not in this path.** No wall, no ownership.
3. **State (self-report)** — each agent's bridge writes its own `status.json`/`result.json`. This is the file-based part you don't love — the agent *is* the source of truth, files *are* the bus.
4. **Observe (READ)** — `status` reads files; `events` tries the daemon RPC then **falls back to file-watch**.

## Harness vs Plexer
- **Plexer / Backend** (herdr, headless): owns panes/tabs/**workspaces** and process placement.
- **Harness / Adapter** (pi, claude): owns how the agent binary is invoked.
- **Workspace identity** today = parsed from `HERDR_PANE_ID` (`ws:pane`) — herdr-coupled, not abstracted.

## Where the daemon actually sits
It only **watches** (presence→notify) and **auto-assigns** (workLoop→queue). It brokers **nothing** on the write path — which is why dispatch is ungoverned and why the workLoop pulls agents across workspaces.
