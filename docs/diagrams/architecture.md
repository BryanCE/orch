# orch architecture

High-level view of how the pieces fit. The binding rules are in `CLAUDE.md` (Rules 9, 10, 11) and `learnings/2026-07-16-harness-plexer-architecture.md`; this diagram is the picture, those are the law.

```mermaid
flowchart TB
    subgraph Callers["Callers"]
        CLI["orch CLI<br/>packages/orch/bin + src/commands"]
        WEB["Web UI<br/>packages/web (server + browser)"]
        SEAT["Orchestrator seat<br/>src/seat (pi session driving orch)"]
    end

    subgraph Daemon["orchd — one daemon per $ORCH_DIR (src/daemon)"]
        RPC["RPC server<br/>unix socket, JSON lines<br/>src/daemon/rpc"]
        WORK["Work loop<br/>task queue → claim → deliver"]
        DISPATCH["Control dispatcher (L5)<br/>src/control/dispatch.ts<br/>resolve adapter → gate on caps → run AdapterCommand"]
        OUTBOX["Outbox / mail<br/>at-least-once delivery + ack"]
        EVENTS["Event bus + presence watch<br/>src/daemon/events.ts"]
        RPC --> WORK
        RPC --> DISPATCH
        WORK --> DISPATCH
        DISPATCH --> OUTBOX
        EVENTS --> RPC
    end

    subgraph Core["Core domain (src)"]
        POLICY["policy/<br/>caller, capacity, scope, space, model, workers"]
        QUEUE["queue.ts<br/>durable tasks, attempts, cancellations"]
        SETTINGS["settings/<br/>$ORCH_DIR/settings.json, one schema"]
        PRESENCE["presence/history.ts<br/>orchd-only appender: status.jsonl, results.jsonl, outcomes.jsonl"]
        STORE[("store/<br/>SQLite via node:sqlite<br/>agents, leases, tasks, runs, events, outbox")]
    end

    subgraph Providers["Provider axes — composed from settings.json, never paired in code"]
        subgraph Adapters["Harness adapters (L2) src/adapters"]
            PI["pi"]
            CLAUDE["claude"]
            CODEX["codex"]
            OMP["omp"]
        end
        subgraph Backends["Plexer backends (L2) src/backends"]
            HERDR["herdr"]
            TMUX["tmux"]
            HEADLESS["headless"]
        end
        NOTIFY["Notify sinks (3rd axis)<br/>src/notify"]
    end

    subgraph Agents["Running agents — each one an orch agent with a minted id"]
        EXT_PI["extensions/pi + omp<br/>bundled bridge in-process<br/>src/agent/harness-bridge"]
        EXT_CLAUDE["extensions/claude<br/>settings.json hook shim"]
        EXT_CODEX["extensions/codex<br/>notify program shim"]
        PRESDIR[/"$ORCH_DIR/agents/&lt;id&gt;/<br/>status.jsonl · results.jsonl · outcomes.jsonl<br/>history only, nothing reads it"/]
    end

    CLI -- "rpc over socket" --> RPC
    WEB -- "rpc over socket" --> RPC
    SEAT -- "rpc over socket" --> RPC

    DISPATCH -- "caps.steer / answer / model" --> Adapters
    DISPATCH -- "spawn / send-keys / close fallback" --> Backends
    WORK --> QUEUE
    DISPATCH --> POLICY
    QUEUE --> STORE
    POLICY --> STORE
    OUTBOX --> STORE
    EVENTS --> NOTIFY
    Daemon --> SETTINGS

    Backends -- "open pane / process" --> Agents
    OUTBOX -- "bridge link push over socket<br/>(outbox row → ack)" --> EXT_PI
    EXT_PI -- "daemon-client: register, ack, report" --> RPC
    EXT_PI -- "report-status / report-result over the link" --> RPC
    EXT_CLAUDE -- "report-status / report-result, one-shot socket" --> RPC
    EXT_CODEX -- "report-status / report-result, one-shot socket" --> RPC
    PRESENCE --> PRESDIR
    RPC -- "merge agent_status row, publish transition" --> STORE
    RPC -- "append history" --> PRESENCE

    DOCTOR["orch doctor<br/>src/doctor — declared vs reality"]
    DOCTOR -.-> SETTINGS
    DOCTOR -.-> Adapters
    DOCTOR -.-> Backends
    DOCTOR -.-> Daemon
```

## Reading it

- **One daemon, one dispatcher.** Every caller (CLI, web, an orchestrator seat) talks to `orchd` over the socket. All control traffic (steer, answer, model, dispatch) goes through `src/control/dispatch.ts`, which resolves the agent's spawn-time adapter, gates on declared capabilities, and executes the returned command. Nothing else invokes adapter strategies.
- **Two independent axes plus notify.** Harness adapters (`pi`, `claude`, `codex`, `omp`) and plexer backends (`herdr`, `tmux`, `headless`) are composed at spawn from `settings.json`. There is no (harness, plexer) pair code anywhere. Notify sinks are a third axis with the same shape.
- **Presence is orch's protocol.** Every harness writes `status.json` / `result.json` through the single writer in `src/presence/`. The daemon watches that directory and turns changes into events. pi-shaped harnesses run the bridge in-process and hold a live socket link; claude and codex report through bundled shims that run under whatever runtime is on PATH.
- **The store is the truth.** SQLite holds agents, leases, tasks, runs, outbox rows, and events. Identity is a minted id; environment (cwd, plexer, handle) is columns, never part of the key.
- **Doctor closes the loop.** `orch doctor` verifies every declared provider against what is actually installed, on PATH, and live in the fleet.
