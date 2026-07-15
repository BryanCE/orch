# Design: notifier-adapters

## Context

The current notification implementation mixes event formatting, transition filtering, and delivery in `src/notify.ts`; `orch events` also formats its own line, while the standalone bridge sends a direct herdr toast. The adapter boundary must unify output without making the bridge import repo source.

## Decisions

### D1: Canonical event and formatter

Define one serializable event model for state transitions and push alerts:

```ts
type NotifyEvent = {
  host?: string;
  key: string;
  workspace: string;
  agent: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
};
```

A shared formatter produces the same outcome-first first line everywhere: `STATE [workspace] agent: summary`, with stable workspace color and state-specific summary (`lastError` for errors, question/task for blocked). Event-writer output and every adapter payload consume this result; no adapter invents labels.

### D2: Notifier interface and registry

```ts
type NotifierMetadata = {
  requiredConfig: string[];
  description?: string;
};

interface Notifier {
  id: "herdr" | "desktop" | "webhook" | "command";
  label: string;
  metadata: NotifierMetadata;
  available(): Promise<boolean>;
  deliver(event: NotifyEvent, config: Record<string, unknown>): Promise<boolean>;
}
```

A registry owns built-ins, availability probing, config validation, `on` state filters, timeout/error isolation, and best-effort delivery. Existing `src/notify.ts` sink code becomes the delivery internals: herdr native alerts; desktop/WSL fallback chain; webhook POST; command with canonical JSON on stdin. Failed adapters warn but never block producers.

### D3: Producer/adapter split

The bridge, daemon event stream, and work loop emit canonical events to one event path. The event path formats once and fans out to configured notifiers. Producers do not call host commands directly. `orch events --notify` and automatic work-loop notifications use the same fan-out.

The bridge remains standalone. Preferred participation is writing a canonical presence/event record that orch consumes. If a direct bridge toast is retained for latency, it may carry only the tiny formatter implementation, copied from a versioned contract/test vector, and must produce byte-for-byte equivalent state/agent/workspace/summary output rather than a bare pane key.

### D4: Setup, config, and doctor pipeline

1. Probe built-in notifiers' `available()` results in the current host environment.
2. `orch setup` renders an onboarding pick-list of available integrations and asks only for each selected adapter's declared required fields (for example webhook URL or command argv).
3. Persist selections as `[[notify]]` entries in `~/.orch/config.toml`, including `id/type`, `on`, and adapter-specific metadata.
4. `orch doctor` loads and validates those entries, re-runs availability checks, verifies required fields, and reports actionable fixes (including WSL/desktop fallback status).

Doctor reuses and extends the existing `doctor-config` capability; setup must not maintain a second notification configuration format.

### D5: Workspace directionality

Pull/read views (`status`, `questions`, `tabs`, and equivalent queries) stay scoped to the current workspace by default, with existing explicit cross-workspace opt-ins. Push events/toasts intentionally cross workspace walls, but every rendered line and structured payload includes workspace name and stable color so provenance cannot be confused.

## Risks / Trade-offs

- Standalone bridge duplication can drift. Keep the formatter tiny, versioned, and covered by shared golden vectors; prefer presence emission.
- Availability probes may be platform-specific. Each adapter reports false with a reason, and doctor distinguishes unavailable from misconfigured.
- A bad notifier must not affect orchestration. Delivery is timed, isolated, and best-effort.

## Open Questions

- Whether bridge presence-event emission can cover all toast timing cases without a direct fallback.
- Exact TOML shape for adapter metadata beyond the existing `[[notify]]` compatibility fields.
