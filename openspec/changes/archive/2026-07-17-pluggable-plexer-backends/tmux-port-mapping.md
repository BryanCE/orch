# tmux command surface for the Backend port

Research notes for `src/backends/tmux.ts`. This file is design research only; it does not prescribe source changes.

## Identity mapping

- orch `workspace` = tmux **session name**. A tmux session is the workspace wall.
- orch `handle` = tmux **pane id**, the stable `%N` token (for example `%5`). Do not use the window index or pane index as the handle.
- orch identity = `{ backend: "tmux", workspace: session_name, handle: pane_id }`.
- Inside an agent pane, tmux sets `$TMUX_PANE` to its pane id. Pass the serialized orch identity as `ORCH_AGENT_KEY`; the agent must not mint or parse the tmux identity.

A pane id remains stable when panes are reordered or windows are tiled. It is suitable for `-t` on pane operations. Session and window indexes are useful for display and layout, but are not stable handles.

## Port method mapping

### `spawn`

Create a detached workspace/session when the requested workspace does not exist:

```sh
tmux new-session -d -s "$NAME" -n orch -- env ORCH_AGENT_KEY="$KEY" "$AGENT" ...
```

The first pane id can be captured at creation time:

```sh
tmux new-session -d -s "$NAME" -n orch -P -F '#{pane_id}' -- env ORCH_AGENT_KEY="$KEY" "$AGENT" ...
```

Add another agent as a window in an existing session:

```sh
tmux new-window -d -t "$NAME:" -n orch -P -F '#{pane_id}' -- env ORCH_AGENT_KEY="$KEY" "$AGENT" ...
```

Alternatively, add the agent as a pane in a selected window:

```sh
tmux split-window -d -h -t "$TARGET_PANE" -P -F '#{pane_id}' -- env ORCH_AGENT_KEY="$KEY" "$AGENT" ...
```

Use `-v` instead of `-h` for a vertical split. `-P -F '#{pane_id}'` prints the newly created pane id, which becomes the opaque backend handle. `-d` prevents the caller from being attached or moved.

If tmux itself must launch the process through a shell, pass a carefully quoted command string or use `env` plus individually quoted argv. Never interpolate untrusted prompt text into an unquoted shell string.

### `close`

For a pane handle `%N`:

```sh
tmux kill-pane -t "$PANE_ID"
```

The backend should treat a failed command or a missing pane as a failed/already-closed handle according to the port's close contract. If orch chooses one window per agent instead, `kill-window -t SESSION:WINDOW` is possible, but `kill-pane` is the direct port operation and preserves other panes.

### `list`

Enumerate all panes and enough metadata to rebuild identities and liveness:

```sh
tmux list-panes -a -F '#{pane_id} #{session_name} #{window_index} #{pane_pid}'
```

Each output row is:

```text
%ID SESSION WINDOW_INDEX PANE_PID
```

The backend maps `%ID` to `handle` and `SESSION` to `workspace`. Add fields if implementation needs window name, command, or pane-active state, but keep the requested format as the minimal stable surface. A non-zero result (including no tmux server) should produce an empty list or the port's documented unavailable result, not a fabricated handle.

### `mintIdentity(backend, workspace, handle)`

The method's returned `backend` is the literal backend id (`tmux`). The handle is normally already `%N`; query tmux to validate it and derive the workspace:

```sh
tmux display-message -p -t "$PANE_ID" '#{session_name}'
```

For a complete lookup, use the same inventory command as `list` and select the row whose first field equals `$PANE_ID`:

```sh
tmux list-panes -a -F '#{pane_id} #{session_name} #{window_index} #{pane_pid}'
```

For the current pane, the stable handle comes directly from the environment:

```sh
printf '%s\n' "$TMUX_PANE"       # e.g. %5
tmux display-message -p -t "$TMUX_PANE" '#{session_name}'
```

Do not derive a handle from `#{window_index}`, `#{pane_index}`, or the pane PID. Serialize `%` and `:` only at the orch identity/storage boundary; keep the raw `%N` handle for tmux `-t` arguments.

### `isAvailable`

The requested availability probe is:

```sh
which tmux
```

Exit status zero means the executable is discoverable on `PATH`; non-zero means unavailable. Capturing stdout is optional. `command -v tmux` is a more portable shell primitive, but `which tmux` is the explicit command surface this backend research records.

### `isInsideSession`

Check the environment of the orch process:

```sh
test -n "$TMUX"
```

A non-empty `$TMUX` means the process is inside tmux. `$TMUX_PANE` is the current pane handle when available. These are probes only: an explicit `--backend tmux` or configured backend must not silently switch based on detection. A backend may create a detached session outside the current session if the product contract allows it; the tmux spec currently calls for non-zero failure when tmux cannot be used outside a session, so this policy needs to be made explicit by the implementation.

### `applyLayout` / `tiling`

Apply tmux's built-in tiled layout to a window:

```sh
tmux select-layout -t "$SESSION:$WINDOW_INDEX" tiled
```

If the backend has only a pane handle, first query its session and window:

```sh
tmux display-message -p -t "$PANE_ID" '#{session_name} #{window_index}'
tmux select-layout -t "$SESSION:$WINDOW_INDEX" tiled
```

For all windows in a session, enumerate windows and run `select-layout` once per window. Tiling is meaningful after `new-window`/`split-window` has created at least two panes.

## `send-keys` surface

If the backend needs to deliver input after spawn, use the raw pane handle:

```sh
tmux send-keys -t %ID -- "$TEXT" C-m
```

The variable form is equivalent and safer for dynamic handles:

```sh
tmux send-keys -t "$PANE_ID" -- "$TEXT" C-m
```

`C-m` submits a line. Omit it when sending text that must not be submitted, or use tmux key names such as `C-c`, `C-d`, or `Escape` as required by the caller.

## Keys, targets, and escaping

- Shell-quote every dynamic value: `"$PANE_ID"`, `"$SESSION"`, and `"$KEY"`.
- `%` is part of a tmux pane id (`%5`). It is not a shell wildcard, but quoting it avoids accidental interpretation when composed into larger arguments. Do not percent-encode it before passing it to tmux.
- `:` separates session, window, and pane components in tmux target syntax (`session:window.pane`). For pane lifecycle and lookup, pass the raw pane id (`-t "$PANE_ID"`) rather than constructing `session:window.pane`; this avoids ambiguity and avoids treating a session name or handle colon as a target separator.
- `send-keys` sends literal key arguments or tmux key names. A colon in text is ordinary input; a percent sign is ordinary input. Shell-quote text so the shell does not expand it:

```sh
tmux send-keys -t "$PANE_ID" -- "$TEXT" C-m
```

- `--` is useful for separating tmux options from text where supported; verify the installed tmux version. If a command string contains spaces, `%`, `:`, `$`, quotes, or shell metacharacters, prefer an argv-safe launcher or robust shell quoting.
- The serialized identity key must escape `%` and `:` (and its own separator) for filesystem safety. That escaped key is for `ORCH_AGENT_KEY` and presence paths, not for tmux target arguments. Round-trip tests must include handles such as `%5` and values containing `:`.

## Open questions for the tmux backend implementation

1. Must tmux spawn require `$TMUX`, or may it create/use a detached session from outside tmux? The current scenarios imply failure outside a session.
2. Does each orch agent get a new window, or do agents share one window and split into panes? This affects targeting, layout, and close semantics.
3. How is the workspace/session name chosen, validated, and made collision-safe? Are user-supplied names allowed to contain `:`?
4. Should a backend-owned session be created and later garbage-collected when its last orch pane exits?
5. What exact spawn contract carries `ORCH_AGENT_KEY` and agent argv without shell-string injection?
6. What should `list()` return when the tmux server is absent, a pane has exited, or a pane is not an orch-owned process?
7. Should close verify pane ownership/`ORCH_AGENT_KEY` before `kill-pane`?
8. Should layout target only the selected window or every window containing orch panes?
9. What tmux minimum version and platform behavior must be supported, especially for `-P -F` and `--`?
10. How should nested tmux sessions be handled when `$TMUX` points at an outer server?
