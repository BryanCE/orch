# Notifier adapters

## The three adapter axes

orch has three pluggable adapter axes:

1. **Agent adapters** — `pi`, `claude`, and `codex` describe how orch starts and communicates with agents.
2. **Execution backends** — `herdr` and `headless` describe where work executes.
3. **Notifier adapters** — this axis delivers push alerts to host integrations.

orch owns one canonical event model and formatter. Producers emit the event; notifier adapters only deliver it. Push notifications include the originating workspace (`[workspace]` in the rendered title) and its stable workspace color, so cross-workspace alerts retain provenance.

## Built-in notifier adapters

Each entry is an array table in `config.toml`. The `on` field is optional and defaults to `["blocked", "error"]`; it filters delivery by the event's `newState`. Adapter-specific fields are the remaining keys in the table.

### `herdr`

Sends a native Herdr notification using the canonical title and body. It is available when `herdr` is on `PATH`.

```toml
[[notify]]
id = "herdr"
on = ["blocked", "error", "done"]
```

### `desktop`

Sends a desktop notification. It tries `herdr` first when `HERDR_ENV=1`, then `notify-send`, `wsl-notify-send`, and the WSL PowerShell toast fallback. It requires no configuration fields.

```toml
[[notify]]
id = "desktop"
on = ["blocked", "error"]
```

The WSL fallback requires `powershell.exe`, `wslpath`, and the repository's `scripts/wsl-toast.ps1` file. Availability is detected from those host integrations.

### `webhook`

POSTs the canonical JSON payload with `Content-Type: application/json`. **Required:** `url`. The request has a three-second delivery timeout; the response must be successful.

```toml
[[notify]]
id = "webhook"
url = "https://example.test/orch-events"
on = ["blocked", "error"]
```

### `command`

Runs a configured command and writes the canonical JSON payload to its standard input. **Required:** `command`, as a non-empty string array. The loader also accepts a string and runs it through `sh -c`.

```toml
[[notify]]
id = "command"
command = ["/usr/local/bin/orch-notify"]
on = ["blocked", "error", "done"]
```

The configured executable must be available on `PATH` (or be an existing path).

## Canonical event payload

Webhook and command adapters receive this JSON object. `title` contains the outcome-first rendered line, including the `[workspace]` tag; `body` contains that title plus details. Nullable fields are emitted as `null`.

```json
{
  "title": "BLOCKED [demo] worker: approve deployment",
  "body": "BLOCKED [demo] worker: approve deployment\nWorkspace: demo (#db2777)\nTab: tab-1\nModel: model-1",
  "workspace": "demo",
  "workspaceColor": "#db2777",
  "host": null,
  "key": "demo:worker",
  "agent": "worker",
  "tab": "tab-1",
  "model": "model-1",
  "oldState": "working",
  "newState": "blocked",
  "task": "Q: approve deployment",
  "cost": null,
  "ts": "2026-01-01T00:00:00.000Z",
  "lastError": null
}
```

The workspace color is calculated from the workspace name and is stable for that name. Error events use `lastError` in the summary when present; blocked events use the task (with a leading `Q:` removed from the displayed summary).

## Configuring notifiers

Each `[[notify]]` table maps to one adapter through `id`. The legacy spelling `type` is also accepted. Keys other than `id`, `type`, and `on` become that adapter's configuration. Multiple tables configure multiple sinks:

```toml
[[notify]]
id = "desktop"

[[notify]]
id = "webhook"
url = "https://example.test/orch-events"

[[notify]]
id = "command"
command = ["logger", "-t", "orch"]
```

Entries are delivered independently and best-effort. An unavailable adapter, invalid configuration, timeout, rejected delivery, or delivery failure is reported as a warning and does not block delivery to the other configured adapters or the producer.

## Future adapters (follow-up work; not built-in)

The following are explicitly future follow-up work, **not shipped built-in adapters**:

- `claude`
- `tmux`
- `orcha`
- generic harness notifier adapters

When implemented, they will plug into the same notifier registry and receive the same canonical event contract. They are not valid built-in `[[notify]]` adapter ids today.
