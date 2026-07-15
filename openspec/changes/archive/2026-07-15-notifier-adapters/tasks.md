# Tasks: notifier-adapters

Ordered so the existing notification behavior remains usable after each group and the standalone bridge never gains a source-tree import.

## 1. Lock the contract and formatter

- [x] 1.1 Define the canonical `NotifyEvent`, `NotifierMetadata`, and `Notifier` contracts, including required-config validation and availability result/error shape.
- [x] 1.2 Extract one outcome-first formatter from the current event/sink behavior: `STATE [workspace] agent: summary`, stable workspace color, and structured payload fields; add golden vectors for done/error/blocked and cross-workspace events.
- [x] 1.3 Route `orch events` event-writer output and existing `src/notify.ts` payload/title generation through the canonical formatter without changing configured sink semantics.

## 2. Implement host adapters

- [x] 2.1 Add the notifier registry and adapter lifecycle: availability probing, config metadata, `on` filters, timeout, best-effort delivery, and isolated warnings.
- [x] 2.2 Port current delivery paths into built-ins: `herdr`, desktop/WSL fallback chain, webhook, and command; preserve `config.toml` compatibility while mapping entries to adapter ids.
- [x] 2.3 Add adapter-focused tests for unavailable binaries, malformed required fields, webhook/command payloads, WSL fallback selection, and failure isolation.

## 3. Wire all producers

- [x] 3.1 Make daemon events and the work loop emit canonical events into the notifier fan-out; ensure `orch events --notify` and automatic work-loop delivery share the same path.
- [x] 3.2 Change the orchestrator bridge's `notifyHerdr` path to emit presence/canonical events for orch delivery, or implement the standalone tiny formatter fallback from the golden vectors; remove the bare-pane-key toast format.
- [x] 3.3 Verify push events remain cross-workspace and every line/payload includes `[workspace]` plus stable color, while pull views remain current-workspace scoped.

## 4. Setup and doctor integration

- [x] 4.1 Add notifier discovery to `orch setup`: probe availability, render a pick-list, collect only declared required fields, and write selected `[[notify]]` config entries.
- [x] 4.2 Extend `orch doctor` / `doctor-config` with notifier config validation, availability and WSL-chain checks, and copy-paste remediation; return non-zero on configured adapter failures.
- [x] 4.3 Add hermetic setup/doctor tests and a live smoke check covering at least one available and one unavailable notifier.

## 5. Compatibility and documentation

- [x] 5.1 Audit all notification call sites for direct host-command or formatter usage; replace them with producer emission or registry delivery.
- [x] 5.2 Document the third adapter axis and config examples, and record future `claude`, `tmux`, `orcha`, and harness adapters as follow-up work rather than built-ins.
- [x] 5.3 Run the existing events/work/doctor smoke suite plus formatter golden tests before release.
