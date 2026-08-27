# orch issue log

## 2026-08-27 — spawn/registration bug RESOLVED

The morning spawn failure (herdr `pane run` empty ack, then `no bridge dir`
stalls) is fixed: the pane launch command now loads
`~/.pi/agent/extensions/pi-bridge.js` instead of `orchestrator-bridge.js`, and
`orch spawn` registers agents cleanly; dispatch + `orch events` stream verified
working (doccheck fleet, ~21:40).

Open annoyance, unchanged: after a pane's first completed dispatch, name
targets can resolve ambiguous (`Ambiguous target "research-1"` on `orch
close`). Workaround: address by pane id.

## 2026-08-27 (~21:50) — `orch tile` creates a pane but never starts the harness

`orch spawn` works (doccheck-1/2 registered, dispatched, streaming). But
`orch tile doccheck --name doccheck-3` (and -4) added the pane, ECHOED the `pi`
launch command into it twice, and left a bare `t3reports >` shell — pi never
ran. Signals: the tile output itself warns `could not pin ...: no presence dir
for pi inbox delivery`; `orch status` shows AGENT `-` / STATE `unknown?`;
a dispatch then fails `write ... was not applied or acknowledged`. `orch
restart doccheck-3` refuses: `Target "doccheck-3" has no recorded harness -
cannot determine its restart mechanism`.

Repro: working spawned fleet → `orch tile <tab> --name <x>` → dead shell pane.
Workaround: never grow a fleet with `tile`; close the dead pane by ID and use
`orch spawn N --name <prefix>` (grows into the live tab). Orchestrator lesson:
treat the `could not pin` warning as fatal — check registration before any
dispatch to a tiled pane.
