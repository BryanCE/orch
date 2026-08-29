# Thinking effort — its own axis

**Status: DECIDED. This is the implementation contract.**

## The problem

Thinking effort exists today only as a **suffix welded onto the model string**:
`defaults.models.<harness>` is one `z.string()` holding `"provider/id:medium"`, and
`splitThinkingSuffix` (`src/policy/thinking.ts`) tears it apart again at every use.
There is no `thinking` setting anywhere. `src/adapters/pi.ts:238` hardcodes `"medium"`
as the fallback, inside a pi-specific function.

Three separate faults:

1. **Welded to the model.** Changing the model changes the thinking level, because they
   are one string. A user who wants "same model, think harder" must retype the model id,
   and a user who wants "different model, same thinking" must remember to re-append the
   suffix. This is the same welding mistake `01-agent-model.md` names for identity:
   *four facts, never welded*. Model and thinking effort are two facts.
2. **Not configurable.** There is no setting to change. The only way to set thinking is
   to spell it inside a model string, per harness, in `defaults.models`.
3. **Coupled to a harness.** The only default lives in pi's adapter. Thinking applies to
   *any* model; each harness merely spells it differently — and some cannot express it at
   all. Orch already owns a neutral vocabulary (`THINKING_LEVELS`), so the coupling is
   accidental, not essential.

## Decision

**Thinking effort is an independent, user-configurable axis with one neutral orch
vocabulary, translated per harness by that harness's adapter.**

### 1. It is a setting, not a substring

`$ORCH_DIR/settings.json` gains a thinking default alongside the model default:

```jsonc
{
  "defaults": {
    "models":   { "pi": "openai-codex/gpt-5.6-luna", "claude": "opus" },
    "thinking": "high"
  }
}
```

`defaults.thinking` is one of `THINKING_LEVELS`
(`off | minimal | low | medium | high | xhigh | max`) and applies to **every harness and
every model**. It is what a spawn launches with when nothing overrides it.

A per-harness override exists only because a harness's ladder may genuinely not line up:

```jsonc
"defaults": { "thinking_by_harness": { "codex": "medium" } }
```

Resolution order, highest first: `--thinking <level>` flag → `model:<level>` suffix on an
explicit `--model` → `defaults.thinking_by_harness.<harness>` → `defaults.thinking` → the
harness's own default. **`defaults.models` values must no longer carry a `:level` suffix**
(Rule 8: one shape — a stored model id is a model id).

### 2. The `model:level` spelling survives as INPUT ONLY

`--model provider/id:high` stays valid on the command line because it is convenient. It is
parsed at the CLI boundary into two fields and **never stored welded**. `splitThinkingSuffix`
becomes a boundary parser, not a thing every consumer calls.

### 3. The harness translates; orch never learns a harness's vocabulary

Orch speaks exactly one thinking vocabulary: `THINKING_LEVELS`. The adapter port gains

```ts
/** Translate orch's neutral thinking level into this harness's own launch vocabulary.
 *  A harness with no thinking control composes nothing and orch answers accordingly. */
readonly thinking?: ThinkingStrategy;

interface ThinkingStrategy {
  /** Launch-time spelling for this level, e.g. argv fragments or a model-id suffix. */
  launchArgs(level: ThinkingLevel): readonly string[];
  /** Apply to a running session, where the harness supports it. */
  set(level: ThinkingLevel): void;
}
```

This follows `07-port-seam.md` exactly: a **required-method role that a provider composes
only if it implements it completely**, nullable at the composition point. `thinking === null`
means that harness has no thinking control — and per E13/E14 that is a **boundary answer**
("claude does not expose a thinking control"), never a thrown "unsupported", never a boolean
flag, and never `if (harness === "pi")`.

`src/adapters/pi.ts:238`'s hardcoded `"medium"` is DELETED: the fallback is
`defaults.thinking`, resolved by orch, not by pi.

### 4. Nothing branches on a harness id

Per Rule 9 and E13: no consumer may test `harness === "pi"` to decide whether thinking
applies. Adding a harness with a novel thinking ladder edits **only that adapter file**.

## Slices

1. **Setting + resolution.** Add `defaults.thinking` and `defaults.thinking_by_harness` to
   the config schema and `SETTINGS_DEFAULTS`; add one `resolveThinking({flag, modelSuffix,
   harness, config})` that implements the order above. Test the order exhaustively, including
   that a bare model id with no setting yields the harness default.
2. **Unweld storage.** `defaults.models` values are bare model ids. Setup and
   `orch settings models` stop writing a suffix; a stored value carrying one is malformed
   (Rule 8) — reject it at load with a message naming the fix, never silently split it.
3. **The port role.** Add `ThinkingStrategy` to the adapter port; pi composes it; harnesses
   without thinking control compose nothing. Delete pi's hardcoded `"medium"`. Route spawn,
   `orch model`, and reset's re-pin through the role.
4. **CLI surface.** `--thinking <level>` on `spawn` / `dispatch` / `reset` / `model`;
   `orch settings` shows the effective thinking level and which source won; the boundary
   answers for a harness that composes no role.

## Why this and not "just add a thinking column to the model string"

The model string already IS the thinking string, and that is the bug. Every additional
consumer of the welded form is another place that must remember to split, and
`src/adapters/pi.ts:238` is the proof that the split gets forgotten and replaced with a
hardcoded constant in a harness-specific file.
