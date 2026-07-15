# orch — current (as-built) architecture

Verified against disk 2026-07-15 (working tree, tests 231/0). Proof lines in `doc-consistency-checklist.md`.

Solid arrows = normal flow. Agent control-message writes (dispatch/steer/model) are **brokered, durable, AND governed** — they go through the daemon, which enforces the workspace wall + ownership before accepting them. Agent self-report files and other local CLI mutations are not all daemon-brokered.

```mermaid
flowchart TB
  classDef daemon fill:#e8e8ff,stroke:#5555cc,color:#222;
  classDef store fill:#e6f7e6,stroke:#33aa33,color:#222;
  classDef gov fill:#e6f7e6,stroke:#33aa33,color:#161;

  subgraph ORCH["Orchestrator — a Claude in a pane (e.g. wD:p1). MANY can exist."]
    CLI["orch CLI<br/>bin/orch.ts -> src/commands.ts<br/>writeRpc() threads the herdr caller actor when available"]
  end

  subgraph DAEMON["orchd daemon — src/daemon/orchd.ts  (REQUIRED for writes; auto-started via ensureDaemon)"]
    RPC["JSON-RPC @ orchd.sock<br/>src/daemon/rpc.ts"]
    GOV["governWrite(): checkWall -> checkOwnerWrite<br/>refuses foreign/cross-workspace writes"]
    AW["acceptWrite(): dispatch/steer<br/>outbox insert -> drainOutbox"]
    SM["setModel(): also governed -> inbox.jsonl"]
    OB["drainOutbox -> deliverBackend<br/>src/daemon/outbox.ts (at-least-once + retry)"]
    PW["presenceWatch -> transitions"]
    NOTIFY["notify sinks (toast/webhook)"]
    WL["workLoop<br/>queue auto-assign"]
    CW["configWatch (hot-reload)"]
  end

  subgraph STORE["$ORCH_DIR — durable store + file bus"]
    SQL["SQLite (WAL) src/store/sqlite.ts<br/>queue, outbox, ownership (written at spawn), spawned"]
    CFG["config.toml"]
    subgraph PRES["agents/[key]/ — one dir per agent"]
      STATUS["status.json<br/>agent -> world"]
      RESULT["result.json"]
      INBOX["inbox.jsonl<br/>world -> agent"]
    end
  end

  subgraph PLEX["Plexer = Backend (src/backends): herdr | tmux | headless"]
    HERDR["Backend port / adapter<br/>identity + workspace + probes<br/>spawn/close/list/deliver/focus/layout/sendKeys<br/>capabilities: panes, focusable, canSendKeys"]
  end

  subgraph AGENT["Agent pane / process"]
    ADAPTER["Harness = AgentAdapter (src/adapters): pi | claude | codex"]
    BRIDGE["Plexer-agnostic agent bridge<br/>opaque ORCH_AGENT_KEY"]
  end

  %% 1 spawn — owner IS recorded now
  CLI -->|"1 resolveBackend(config) -> Backend.spawn"| HERDR
  HERDR -->|"launch adapter cmd + ORCH_AGENT_KEY"| ADAPTER
  ADAPTER --> BRIDGE
  CLI -->|"recordSpawned -> insertSpawnedRecord + setOwner(actor)"| SQL

  %% 2 writes go THROUGH the daemon and are GOVERNED
  CLI -->|"2 dispatch/steer/model -> writeRpc (+actor)"| RPC
  RPC --> GOV
  GOV -->|"allowed"| AW
  GOV -->|"allowed"| SM
  GOV -->|"refused: foreign owner / cross-workspace"| CLI
  AW --> OB
  AW --> SQL
  SM --> INBOX
  OB -->|"deliverBackend: pane run / agent send / piAdapter.steer"| HERDR
  OB -.->|"steer to headless/presence key"| INBOX
  INBOX -->|"bridge reads"| BRIDGE

  %% 3 self-report state
  BRIDGE -->|"3 writes own state"| STATUS
  BRIDGE --> RESULT

  %% 4 observe
  CLI -->|"4 status/result: read files (no daemon needed)"| STATUS
  CLI -->|"4 events: RPC subscribe (push) — daemon REQUIRED"| RPC
  CLI -.->|"no daemon -> die; --offline = explicit read-only file mode"| PRES

  %% daemon internals
  RPC --> PW
  PW --> PRES
  PW --> NOTIFY
  WL --> SQL
  WL -.->|"assign (workspace scoping partial)"| RPC
  CW --> CFG

  class DAEMON daemon
  class STORE,SQL,PRES store
  class GOV gov
```

## What the daemon is now
The daemon is **the required broker for agent control-message writes** — `orch dispatch/steer/model/broadcast/pipe` all call `writeRpc()` (`src/commands.ts`), which `ensureDaemon()`s, threads the caller's actor id when present, and hits the RPC socket. These writes are:
- **Centralized** — one broker (`orchd`), not N direct herdr calls.
- **Durable** — dispatch/steer persist to the SQLite `outbox` before delivery, drain with retry + ack (`src/daemon/outbox.ts`), survive a restart. Real at-least-once messaging.
- **Governed when the caller has an actor identity** — `governWrite()` runs `checkWall()` then `checkOwnerWrite()` before an outbox insert or a model write (`src/daemon/orchd.ts:113-140`). A foreign-owned or cross-workspace write is refused unless the caller passes `--steal` / `--cross-workspace`; an unscoped caller still gets the wall check but skips ownership.

## The four flows (as-built)
1. **Spawn** — CLI resolves a **Backend** (herdr/tmux/headless), launches an **AgentAdapter** (pi/claude/codex), records a `spawned` row **and records the spawning orchestrator as the owner** (`recordSpawned` → `setOwner`).
2. **Write (dispatch/steer/model)** — CLI → `writeRpc` (with actor) → daemon RPC → `governWrite` (wall + ownership) → outbox → `deliverBackend`. Durable, brokered, **governed**.
3. **State (self-report)** — each agent's bridge writes its own `status.json`/`result.json`.
4. **Observe (READ)** — `status`/`result` read the presence files directly (no daemon needed). `events` **requires** the daemon: it subscribes to the socket and the daemon **pushes** transitions. No daemon → it `die()`s and points at `--offline`, an explicit opt-in read-only file-watch mode, *not* an automatic fallback.

## Governance details (wired, with one documented gap)
- Ownership is recorded at every spawn site; `writeRpc` threads the herdr caller actor when available; `governWrite` gates dispatch/steer/model on `checkWall` + `checkOwnerWrite` (`src/daemon/orchd.ts:109-140`).
- **Caveat:** a write with no actor (headless / not inside a herdr pane) skips the ownership check; the wall still runs with the unscoped actor (`orchd.ts:109-111`). Unscoped writers are wall-eligible by policy.

## The Bridge spine and backend port
The shipped architecture keeps the two axes independent: agent adapters (pi/claude/codex) and plexer backends (herdr/tmux/headless) vary independently. Each concrete plexer is an Adapter over its native tool; a registry plus `resolveBackend(config)` factory selects it (Provider Model).

The backend is the identity authority. Its PORT exposes `mintIdentity(handle)` → `{backend, workspace, handle}`, `isAvailable()`, `isInsideSession()`, `spawn(adapter, opts)`, `close(handle)`, and `list()`, plus delivery/control operations (`deliver`, `focus`, `sendKeys`, `applyLayout`). Capability flags `panes`, `focusable`, and `canSendKeys` gate unsupported operations. Workspace policy consumes the backend-reported workspace; no core code parses a plexer string.

Spawn mints the identity before the agent starts and passes its opaque serialized key in `ORCH_AGENT_KEY`. Bridges are plexer-agnostic and never read `HERDR_PANE_ID` (or another backend variable); backends are agent-agnostic. Presence uses the versioned flat key/record format documented in `docs/files-and-data-layout.md`.
