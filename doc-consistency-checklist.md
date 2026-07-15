# Documentation consistency checklist

Use this as the current-truth reference. Source paths and line ranges are proof.

## 1. Events require the daemon

- **Fact:** `orch events` requires the daemon unless `--offline` is explicit. There is no silent file-watch fallback.
- **Proof:** `src/commands.ts:1000-1002` calls `ensureDaemon(orchDir())` when `!options.offline`; `src/commands.ts:1021-1022` sets `onFallback` to `die("orch events: daemon unavailable; use --offline for read-only file diagnostics.")`.

## 2. Writes use the daemon outbox

- **Fact:** Command writes route through the daemon RPC, not direct local delivery.
- **Proof:** `src/commands.ts:2984-3000` defines `writeRpc()`, calls `ensureDaemon()`, then `rpcCall()`; dispatch/steer/model call sites include `src/commands.ts:1144`, `2158`, `2170`, and `2896`.
- **Fact:** Accepted dispatch/steer writes are inserted into and drained from the daemon outbox.
- **Proof:** `src/daemon/orchd.ts:123-130` calls `insertOutboxMessage()` and `drainOutbox()` in `acceptWrite()`.

## 3. Governance wiring

- **Fact:** Governance is wired for daemon dispatch and steer writes.
- **Proof:** `src/daemon/orchd.ts:123-130` calls `governWrite()` before inserting an outbox message. `src/daemon/orchd.ts:113-121` calls both `checkWall()` and `checkOwnerWrite()` through `governWrite()` when an actor is present.
- **Fact:** Model writes also call the same governance function.
- **Proof:** `src/daemon/orchd.ts:133-140` calls `governWrite()` before writing `inbox.jsonl`.
- **Current behavior:** A missing actor skips ownership checking; wall checks still run with the unscoped actor. This is documented in `src/daemon/orchd.ts:109-111`.

## 4. Identity is still herdr-coupled

- **Fact:** Interactive presence uses the legacy `ws:pane` grammar; `HERDR_PANE_ID` supplies herdr caller context, not a universal backend-independent identity.
- **Proof:** `src/backends/herdr.ts:20-24` reads `HERDR_PANE_ID` to select the caller pane; `src/commands.ts:1731-1734` reads it to infer workspace; `src/policy/workspace.ts:10-13` parses `/^([^:]+):p[0-9A-Za-z]+$/`.
- **Fact:** The bridge also reads the herdr identity directly for herdr metadata.
- **Proof:** `extensions/orchestrator-bridge.ts:245-263` reads `HERDR_PANE_ID` and sends it as `pane_id`.

## 5. Presence key and directory format

- **Fact:** Presence directories live under `<orchDir>/agents/<key>/`.
- **Proof:** `src/store.ts:15-17` defines `presenceDir()` as `join(orchDir(), "agents")`; `src/store.ts:28-30` defines `presenceAgentDir()` with the key as the directory segment.
- **Fact:** On non-Windows, the directory name is the raw logical key. On Windows, `%` becomes `%25` and `:` becomes `%3A`; the reverse mapping decodes those sequences.
- **Proof:** `src/store.ts:20-26` (`presenceDirectoryName`) and `src/store.ts:32-34` (`presenceKeyFromDirectoryName`).
- **Fact:** Current keys include herdr `ws:pane` keys and headless `session-<pid>`-style keys.
- **Proof:** `src/policy/workspace.ts:10-13` recognizes the herdr `ws:pane` shape; `src/store.ts:28-30` stores either form without a backend-independent identity serializer.
- **Fact:** Presence status may carry the key and herdr pane id, but does not yet define a universal structured identity.
- **Proof:** `src/store.ts:36-42` declares optional `key` and `paneId` fields.
