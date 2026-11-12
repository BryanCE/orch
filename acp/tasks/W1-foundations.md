# W1: foundations

Three tasks. No behavior changes and no schema changes. Each task owns its files and no other
task in this wave touches them. Paths are relative to the repo root `/home/bryan/orch`.

Rules for every section:
- Never run `orch`, `bun run build`, `bun db:*`, `git`, or anything under `packages/orch/scripts/`.
- Verify means: run `bun check` once, then `bun test <the test files the section names>` once,
  from the repo root.
- No `as` casts, no `any`, no `Bun.*`, no parentheses in a string a program prints.

## T1 Forms, and the stdio each backend offers
Create `packages/orch/src/types/form.ts` with exactly this content:

```ts
/** The stdio a harness process is started on. */
export const STDIO_KINDS = ["terminal", "pipes", "none"] as const;
export type StdioKind = (typeof STDIO_KINDS)[number];

/** One way a harness runs. `tui` is its interactive terminal program, `oneshot` runs one
 *  prompt and exits, `acp` speaks the Agent Client Protocol over its stdio. */
export const FORM_IDS = ["tui", "oneshot", "acp"] as const;
export type FormId = (typeof FORM_IDS)[number];

/** The stdio each form needs from the backend that holds its process. A backend states what it
 *  offers, and that match is the only thing that joins a form to a backend. */
export const FORM_STDIO: Readonly<Record<FormId, StdioKind>> = { tui: "terminal", oneshot: "none", acp: "pipes" };

/** The form a backend runs when a spawn names none: the one whose stdio the backend offers
 *  first. Null when the backend offers nothing a form needs. */
export function nativeForm(offers: readonly StdioKind[]): FormId | null {
  for (const stdio of offers) {
    const form = FORM_IDS.find((id) => FORM_STDIO[id] === stdio);
    if (form !== undefined) return form;
  }
  return null;
}

/** Whether a backend offering `offers` can hold a process in `form`. */
export function offersForm(offers: readonly StdioKind[], form: FormId): boolean {
  return offers.includes(FORM_STDIO[form]);
}
```

Edit `packages/orch/src/types/backend.ts`:
- Add `import type { StdioKind } from "./form.ts";` with the other type imports at the top.
- In `export interface Backend<Handle = BackendHandle> {`, directly under the line
  `readonly id: BackendId;`, add:
  ```ts
  /** The stdio this backend can start a process on, most natural first. A form runs here only
   *  when its stdio is listed. */
  readonly offers: readonly StdioKind[];
  ```

Add one member directly under the `readonly id = ...;` line of each backend class, importing
`StdioKind` as a type from `../../types/form.ts`:
- `packages/orch/src/backends/herdr/index.ts` under L141: `readonly offers: readonly StdioKind[] = ["terminal"];`
- `packages/orch/src/backends/tmux/index.ts` under L66: `readonly offers: readonly StdioKind[] = ["terminal"];`
- `packages/orch/src/backends/orca/index.ts` under L95: `readonly offers: readonly StdioKind[] = ["terminal"];`
- `packages/orch/src/backends/headless/index.ts` under L80: `readonly offers: readonly StdioKind[] = ["none"];`
- `packages/orch/src/backends/held/index.ts` under L103: `readonly offers: readonly StdioKind[] = ["terminal", "pipes"];`

Edit `packages/orch/test/helpers/backend.ts`: in `class FakePanedBackend`, under the line
`readonly id: BackendId;` at L50, add `readonly offers: readonly StdioKind[] = ["terminal"];`
and import `StdioKind` as a type from `../../src/types/form.ts`.

Create `packages/orch/test/form.test.ts` with `bun:test`. Cases:
- `nativeForm(["terminal"])` is `"tui"`. `nativeForm(["none"])` is `"oneshot"`.
  `nativeForm(["terminal", "pipes"])` is `"tui"`. `nativeForm([])` is `null`.
- `offersForm(["terminal", "pipes"], "acp")` is `true`. `offersForm(["terminal"], "acp")` is
  `false`. `offersForm(["none"], "oneshot")` is `true`.
- Import `herdrBackend`, `tmuxBackend`, `orcaBackend`, `headlessBackend`, `heldBackend`, each
  from `../src/backends/<id>/index.ts`, and expect their `offers` to equal the arrays listed above.

Any other object that fails `bun check` for missing `offers` is a `Backend` fixture: give it
`offers: ["terminal"]` and name the file in your report.
Verify: `bun check`, then `bun test packages/orch/test/form.test.ts`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 The `acp` role on adapters, null everywhere
Edit `packages/orch/src/types/adapter.ts`:
- Directly above the comment that starts `/** The harness runs orch's bridge:` at L242, add:
  ```ts
  /** The harness has a binding that speaks the Agent Client Protocol over its stdio. orchd
   *  starts the binding on pipes and drives it as the agent's `acp` form. */
  export interface AcpRole {
    /** The binding's executable and its arguments, never a shell line. */
    argv(opts: SpawnOpts): readonly string[];
    /** Environment the binding needs on top of the launch environment. */
    env(opts: SpawnOpts): Readonly<Record<string, string>>;
    /** True when the binding and the harness's own terminal program read one session store, so
     *  a restart in the other form resumes the conversation by session id. */
    readonly sharesSessions: boolean;
  }
  ```
- In `interface AgentAdapter`, directly under `readonly hooks: HookReportRole | null;` at L298,
  add `readonly acp: AcpRole | null;`.

Add `readonly acp = null;` directly under the `readonly hooks` line in each adapter class:
- `packages/orch/src/adapters/pi.ts` under L350. `omp` inherits it.
- `packages/orch/src/adapters/claude.ts` under L232.
- `packages/orch/src/adapters/codex.ts` under L113.

Edit `packages/orch/test/helpers/adapter.ts`: add `acp: null,` under `hooks: null,` at L21.

Any other object that fails `bun check` for missing `acp` is an `AgentAdapter` fixture: give it
`acp: null` and name the file in your report.
Verify: `bun check`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The link registry holds any agent link
The registry in `packages/orch/src/control/bridge-links.ts` will hold a bridge's link and an
ACP session's link. Rename it. No logic changes.

1. Move `packages/orch/src/control/bridge-links.ts` to `packages/orch/src/control/agent-links.ts`
   with `mv`. Move `packages/orch/test/bridge-links.test.ts` to
   `packages/orch/test/agent-links.test.ts` with `mv`.
2. In the moved source file, rename these exports and fix every use under `packages/orch/src/`,
   `packages/orch/test/` and `packages/orch/scripts/`:

   | Old | New |
   |---|---|
   | `BridgeLink` | `AgentLink` |
   | `BridgeDetachedError` | `LinkDetachedError` |
   | `isBridgeDetached` | `isLinkDetached` |
   | `attachBridge` | `attachLink` |
   | `detachBridge` | `detachLink` |
   | `bridgeAttached` | `linkAttached` |
   | `pushToBridge` | `pushToLink` |
   | `dropBridges` | `dropLinks` |

   The error's `name` string becomes `"LinkDetachedError"` and its message becomes
   `` `no link for ${key}` ``.
3. Replace the doc comments in the moved file with these:
   - On `AgentLink`: `/** One live link orchd can push a delivery down to an agent: a bridge's connection, or an ACP session orchd holds. */`
   - On `close`: `/** End the link. Whoever owns it attaches again. */`
   - On `LinkDetachedError`: `/** No link is held for the key: the row stays open and the drain retries. */`
   - On the map: `/** Daemon-only registry: canonical target key to the link held for that agent. */`
4. Fix every import path that names `bridge-links.ts`. Leave `BridgeDelivery`, `BridgeMessage`,
   `BridgeAction`, `BridgeRole` and the file `bridge-link-server.test.ts` named as they are.
5. Run `grep -rn "bridge-links\|BridgeLink\b\|pushToBridge\|attachBridge\|detachBridge\|dropBridges\|bridgeAttached\|isBridgeDetached\|BridgeDetachedError" packages/orch/src packages/orch/test packages/orch/scripts packages/orch/layers-baseline.json`.
   It must print nothing. Paste its output in the report if it prints a line you cannot fix.

Verify: `bun check`, then `bun test packages/orch/test/agent-links.test.ts packages/orch/test/control-dispatch.test.ts packages/orch/test/outbox-ack.test.ts packages/orch/test/bridge-link-server.test.ts`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
