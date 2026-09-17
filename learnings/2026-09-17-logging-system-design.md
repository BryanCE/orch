# One logging system for orchd and the CLI

Outside research, 2026-09-17. Question: orchd logs almost nothing and what it logs
comes from 18 ad-hoc logger constructions. Two live bugs (a 2 s stall on
`orch close a b c`, a bridge attach refused before `register-agent`) left no line.
What do the primary sources say a daemon's log must look like so a stall or a
refusal is readable?

## 1. One wide event per unit of work, emitted at the end

Honeycomb's rule: "arbitrarily wide structured events that describe the request and
its context, one event per request per service". Accumulate everything known into one
record and emit it once as the request exits or errors. Many narrow lines lose
context and need manual correlation; writing once at exit makes each extra field
nearly free. Put in it "any unique id, any high-cardinality variable", every timing,
every remote call. (https://charity.wtf/2019/02/05/logs-vs-structured-events/)

Stripe's canonical log line is the same rule in production: one line per request,
emitted by middleware after the stack finished, carrying the verb, path, request id,
status, the authenticated identity, request duration, database time, and the release.
Downstream code fills fields on a request-scoped object; the middleware emits it.
Signal-to-noise beats scattered trace lines; flexibility beats pre-built metrics.
(https://brandur.org/canonical-log-lines)

Consequence: an `rpc.request` line and an `rpc.answered` line is the anti-pattern.
One `rpc` record at answer time with `method`, `id`, `ok`, `elapsedMs`, and whatever
the handler learned is the pattern. The start line exists only for work that may
never finish, and then it is a watchdog's job, not the request's.

## 2. Severity is a number with a meaning, and the check comes first

OpenTelemetry's log data model fixes six ranges: TRACE 1-4 "fine-grained debugging",
DEBUG 5-8, INFO 9-12, WARN 13-16, ERROR 17-20, FATAL 21-24 ("application or system
crash"). ERROR and above mean an erroneous situation. A record carries `Timestamp`,
`SeverityNumber`, `SeverityText`, `Body`, `Attributes`, `Resource`, and the trace
context (`TraceId`, `SpanId`) when the record is part of request processing.
(https://opentelemetry.io/docs/specs/otel/logs/data-model/)

Go's slog picks the same gap of 4 between levels "to match OpenTelemetry's mapping",
holds the threshold in a `LevelVar` that changes at runtime without rebuilding loggers,
and calls `Handler.Enabled` "early, before any arguments are processed, to save effort
if the log event should be discarded". Child loggers via `With` carry bound
attributes. (https://go.googlesource.com/proposal/+/master/design/56345-structured-logging.md)

Consequence: the threshold is a mutable cell every logger reads, not a value baked at
construction. The level check precedes field construction. `trace` is for a line per
tick or per drain; `debug` for a line per tool exec; `info` for a state change an
operator cares about (attach, detach, start, stop); `warn` for something slow or
refused that the system survives; `error` for a failed operation.

## 3. Latency is a histogram; the tail is the number

Google SRE: latency, traffic, errors, saturation. "1% of requests might easily take
5 seconds" while the mean is 100 ms; collect latency by bucket, not as a mean.
Separate the symptom ("responses are slow") from the cause ("CPUs are overloaded").
(https://sre.google/sre-book/monitoring-distributed-systems/)

Consequence: every unit of work logs its own `elapsedMs`. A stall then shows as one
record whose `elapsedMs` is the stall, next to the records that waited behind it.

## 4. A sync child process blocks the loop; the log must say for how long

`execFileSync` "will not return until the child process has fully closed", blocking
all other code. `timeout` kills the child with `killSignal` and throws an error that
carries `stdout` and `stderr`. (https://nodejs.org/api/child_process.html#child_processexecfilesyncfile-args-options)

`perf_hooks.monitorEventLoopDelay` samples loop delay into a histogram (`min`, `max`,
`mean`, `percentile`) at a set resolution; `enable`, `disable`, `reset`.
(https://nodejs.org/api/perf_hooks.html)

Consequence: time every sync call at its seam and log it with the binary, args, attempt
and `elapsedMs`. A loop-delay watchdog that logs `loop.stalled` with the max delay per
interval names the symptom; the timed seam names the cause.

## 5. Names and keys

One dotted `subject.outcome` name per event, stable, never a sentence, never carrying
an id (ids are fields, so a name has bounded cardinality and greps). One key per fact
across the whole log: `elapsedMs` for a duration, `error` for a failure message, `key`
for an agent id in fields, `method` for an RPC method. OpenTelemetry's RPC semantic
conventions name the method `rpc.method` and the system `rpc.system`; the shape orch
needs is the same, spelled in orch's own keys.
(https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/)

## What this means for orchd

- One daemon logger, held in `DaemonState`, handed down. `decisionLogger(dir, null)`
  builds a fresh logger at the default level and ignores `logging.level`; every such
  call site is a filtered line that never lands. The daemon's one logger goes to the
  handlers through state and to the leaves (`tool-exec`, `store/connection`,
  `presence/history`) through their existing observer hooks.
- The level is a cell. `createLogger` reads the threshold on every call. The settings
  watch that already fires `config.reloaded` sets the cell. No rebuild.
- One record per RPC, at answer time: `rpc` with `method`, `id`, `transport`, `ok`,
  `elapsedMs`, and `error` when refused. Level `trace`. Attach is a state change, so
  `bridge.attached` and `bridge.refused` are `info` with `key` and `reason`.
- One record per tool exec attempt at `debug`: `tool.exec` with `binary`, `args`,
  `attempt`, `ok`, `elapsedMs`. Above `logging.slow_tool_ms` the same record is
  `warn` as `tool.slow`. Every herdr call the daemon makes is synchronous, so this is
  the record that names the 2 s stall.
- One record per drain at `trace`: `store.drained` with `rows`, `batched`,
  `elapsedMs`. One per liveness tick: `tick.liveness` with `exited`, `reaped`,
  `elapsedMs`. One per work-loop pass: `tick.work` with `idle`, `claimed`, `open`,
  `elapsedMs`.
- A loop watchdog at `warn`: `loop.stalled` with `maxDelayMs` when the sampled
  delay exceeds a settings threshold. It is the symptom line; the timed seams above
  are the cause lines that sit beside it in time.
- The log write stays synchronous. A crash loses nothing; the cost is one append per
  record, which the level check already keeps off the hot path when `trace` is off.
- Names: `subject.outcome`, hyphens inside a word, never underscores. Keys: one
  spelling per fact everywhere.
