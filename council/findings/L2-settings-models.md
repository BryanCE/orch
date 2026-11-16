## 1. Top-level settings sections
- `runtime` — selects the JavaScript runtime that executes this install. `packages/orch/src/settings/schema.ts:138`
- `enabled` — configured harnesses and backends available for spawning. `packages/orch/src/settings/schema.ts:141`
- `defaults` — default harness/backend, model, form, thinking effort and worktree intent. `packages/orch/src/settings/schema.ts:145`
- `fleet` — fleet size, depth, memory and cross-space limits. `packages/orch/src/settings/schema.ts:156`
- `mail` — delivery behavior for agent-to-agent mail. `packages/orch/src/settings/schema.ts:178`
- `models` — per-harness launch allowlists and picker quicklists. `packages/orch/src/settings/schema.ts:182`
- `workers` — worker extensions, tools, verification commands and compaction thresholds. `packages/orch/src/settings/schema.ts:193`
- `agents` — settings keys an agent may write. `packages/orch/src/settings/schema.ts:205`
- `queue` — queued-task retries and dispatch concurrency. `packages/orch/src/settings/schema.ts:210`
- `logging` — log level and slow-tool/event-loop-stall thresholds. `packages/orch/src/settings/schema.ts:216`
- `retention` — retention windows and sweep interval. `packages/orch/src/settings/schema.ts:222`
- `lock` — command-lock retry behavior. `packages/orch/src/settings/schema.ts:240`
- `questions` — unanswered-question re-ask timing and limit. `packages/orch/src/settings/schema.ts:245`
- `monitor` — states shown by monitor and report-summary length. `packages/orch/src/settings/schema.ts:251`
- `timeouts` — operation-specific time budgets. `packages/orch/src/settings/schema.ts:257`
- `servers` — idle, silence, reconnect and event-backfill behavior for harness servers. `packages/orch/src/settings/schema.ts:275`
- `notify` — configured state-notification sinks. `packages/orch/src/settings/schema.ts:281`
- `notification` — notification placement and title length. `packages/orch/src/settings/schema.ts:282`
- `locked_commands` — commands serialized by the shared lock and applicable roles. `packages/orch/src/settings/schema.ts:286`
- `gated_commands` — commands requiring human approval. `packages/orch/src/settings/schema.ts:290`
- `denied_commands` — commands forbidden to configured roles. `packages/orch/src/settings/schema.ts:291`
- `settings_file` — unknown-key typo tolerance. `packages/orch/src/settings/schema.ts:295`
- `hosts` — connection and ORCH_DIR settings for linked machines. `packages/orch/src/settings/schema.ts:299`
- `links` — SSH link commands, timing, retries and resume age. `packages/orch/src/settings/schema.ts:301`
- `spaces` — named space paths. `packages/orch/src/settings/schema.ts:319`
- `daemon` — daemon networking, work-loop, liveness and delivery settings. `packages/orch/src/settings/schema.ts:320`
- `pty` — terminal dimensions, TERM and scrollback for held agents. `packages/orch/src/settings/schema.ts:332`
- `attach` — viewer backlog and detach key. `packages/orch/src/settings/schema.ts:340`
- `doctor` — unclaimed-agent warning delay. `packages/orch/src/settings/schema.ts:345`
- `tiling` — initial pane-split direction. `packages/orch/src/settings/schema.ts:351`
- `worktrees` — provider, naming, location, copy behavior and timeout. `packages/orch/src/settings/schema.ts:355`
- `counts` — default tail and peek counts. `packages/orch/src/settings/schema.ts:364`
- `skills` — packaged-skill installation, source store and linked harness directories. `packages/orch/src/settings/schema.ts:372`

## 2. Four declarations needed for one setting
The schema defines acceptance, `SETTINGS_DEFAULTS` supplies the setup/default value, `HELP` supplies the registry help line (the only setting roster), and `OrchSettings` gives the normalized required consumer type.

Array-valued `skills.link`:
```ts
// schema.ts
skills: z.strictObject({
  install: z.boolean().optional(),
  store: z.string().min(1).optional(),
  link: z.array(z.string().min(1)).optional(),
}).optional(),
// SETTINGS_DEFAULTS
skills: { install: true, store: "~/.agents/skills", link: ["~/.claude/skills"] },
// registry.ts HELP
"skills.link": "Harness skill directories orch symlinks into the store.",
// types/settings.ts OrchSettings
skills: { install: boolean; store: string; link: string[] };
```
`packages/orch/src/settings/schema.ts:129,372`; `packages/orch/src/settings/registry.ts:292`; `packages/orch/src/types/settings.ts:81`

Object-valued `defaults.forms` (partial map keyed by harness):
```ts
// schema.ts
forms: z.partialRecord(z.enum(ADAPTER_IDS), z.enum(FORM_IDS)).optional(),
// SETTINGS_DEFAULTS
 defaults: { worktree: false, thinking: "medium", thinking_by_harness: {}, forms: { opencode: "server" } },
// registry.ts HELP
"defaults.forms": `Default form for each harness: ${FORM_IDS.join(", ")}.`,
// types/settings.ts OrchSettings
forms: Partial<Record<AdapterId, FormId>>;
```
`packages/orch/src/settings/schema.ts:114,153`; `packages/orch/src/settings/registry.ts:175`; `packages/orch/src/types/settings.ts:51`

## 3. Settings naming models, harnesses, forms or thinking levels
Types below are the JSON schema types; defaults are the schema defaults plus normalized empty values supplied by `settings/read.ts` where relevant.
- `enabled.adapters`: `z.array(z.enum(ADAPTER_IDS))`; setup-selected list, no `SETTINGS_DEFAULTS` entry (absent `enabled` normalizes to empty adapters/backends). `packages/orch/src/settings/schema.ts:142`; `packages/orch/src/settings/read.ts:136-137`
- `defaults.adapter`: `z.enum(ADAPTER_IDS).optional()`; no literal default, omitted unless setup/user selects one. `packages/orch/src/settings/schema.ts:146`; `packages/orch/src/settings/read.ts:148`
- `defaults.models`: `z.partialRecord(z.enum(ADAPTER_IDS), z.string()).optional()`; defaults to `{}`. `packages/orch/src/settings/schema.ts:150`; `packages/orch/src/settings/read.ts:148`
- `defaults.forms`: `z.partialRecord(z.enum(ADAPTER_IDS), z.enum(FORM_IDS)).optional()`; default `{ opencode: "server" }`. `packages/orch/src/settings/schema.ts:153`; `packages/orch/src/settings/schema.ts:114`
- `defaults.thinking`: `z.enum(THINKING_LEVELS).optional()`; default `"medium"`. `packages/orch/src/settings/schema.ts:154`; `packages/orch/src/settings/schema.ts:114`
- `defaults.thinking_by_harness`: `z.partialRecord(z.enum(ADAPTER_IDS), z.enum(THINKING_LEVELS)).optional()`; default `{}`. `packages/orch/src/settings/schema.ts:155`; `packages/orch/src/settings/schema.ts:114`
- `models.allowed`: per-harness `z.array(z.string())` map; default `{}`; patterns gate launch. `packages/orch/src/settings/schema.ts:183`; `packages/orch/src/settings/read.ts:151`
- `models.preferred`: per-harness `z.array(z.string())` map; default `{}`; quicklist only, not a launch gate. `packages/orch/src/settings/schema.ts:185`; `packages/orch/src/settings/read.ts:151`
- `workers.exclude_extensions`: `ExtensionExclusionsSchema` (partial harness-keyed arrays of strings); default `{}`. `packages/orch/src/settings/schema.ts:193-197`; `packages/orch/src/settings/read.ts:166`
- `workers.compact_at_tokens`: `CompactionTableSchema` (partial harness -> model-spec -> positive-integer map); default `{}`. `packages/orch/src/settings/schema.ts:26,200`; `packages/orch/src/settings/schema.ts:120`

## 4. `--model luna:high` resolution path
1. `resolveLaunchAgent(flags: AgentFlags, settings: OrchSettings): { harness: AdapterId; model: string; thinking: ThinkingLevel }` picks the harness, calls tuning resolution and returns the launch tuple. `packages/orch/src/commands/spawn/flags.ts:168-173`
2. `resolveTuningOrDie(flags: AgentFlags, settings: OrchSettings, harness: AdapterId, pinned: AgentTuning | null): Tuning` calls `resolveTuning(request: TuningRequest): Tuning | null`; `splitThinkingSuffix(model: string): { bare: string; thinking?: ThinkingLevel }` separates `luna` and `high`. `packages/orch/src/shared/tuning.ts:20`; `packages/orch/src/policy/tuning.ts:49-59`; `packages/orch/src/policy/thinking.ts:20-31`
3. At daemon admission, `admitModel(settings: OrchSettings, adapter: AgentAdapter, catalogue: ModelCatalogue, model: string): string` expands a short name with `expandModelSpec(settings: OrchSettings, harness: AdapterId, offered: readonly HarnessModel[], bare: string): ModelExpansion`, checks membership/allowlist, and returns the expanded provider/model spec plus suffix. `packages/orch/src/policy/model.ts:30-36,106-123`
4. `resolveThinking(input: ThinkingResolutionInput): ThinkingLevel` chooses explicit flag, suffix, per-harness override, then `defaults.thinking`; `modelSpec(model: string, thinking: string | null | undefined): string` serializes the resolved pair where the control wire needs it. `packages/orch/src/policy/thinking.ts:34-48`; `packages/orch/src/policy/tuning.ts:54-58`

## 5. Adapter interface, forms and declared capabilities
The adapter contract does not declare a `forms` or generic `capabilities` field: form availability is derived from the common `tui`/`oneshot` forms plus non-null `acp`/`server` roles. The role interface excerpt:
```ts
export interface AgentAdapter {
  readonly id: AdapterId;
  readonly thinking: ThinkingStrategy | null;
  readonly workerLaunch: WorkerLaunchRole | null;
  readonly modelControl: ModelControlRole | null;
  readonly lifecycleControl: LifecycleControlRole | null;
  readonly sessionView: SessionViewRole | null;
  readonly workspaceTrust: WorkspaceTrustRole | null;
  readonly shim: ShimRole | null;
  readonly settingsFile: SettingsFileRole | null;
  readonly defaultModel: DefaultModelRole | null;
  readonly models: ModelCatalogueRole | null;
  readonly modelWarm: ModelWarmRole | null;
  readonly compaction: CompactionRole | null;
  readonly bridge: BridgeRole | null;
  readonly hooks: HookReportRole | null;
  readonly acp: AcpRole | null;
  readonly server: HeldSessionDriver | null;
  readonly resume: ResumeRole | null;
  readonly commandGate: boolean;
  interactiveCmd(opts: SpawnOpts): string;
  interactiveArgv(opts: SpawnOpts): readonly string[];
  headlessCmd(prompt: string, opts: SpawnOpts): string[];
  detectState(input: StateDetectionInput, orchDir: OrchDir): AgentState;
  steer(request: SteerRequest): AdapterCommand | undefined;
  extractResult(input: ResultExtractionInput, orchDir: OrchDir): string | undefined;
}
```
`packages/orch/src/types/adapter.ts:290-367`. `tui` and `oneshot` are available to all adapter ids; `acp`/`server` require the corresponding non-null role. `packages/orch/src/daemon/server/spawn/plan.ts:77-92`; form IDs: `packages/orch/src/types/form.ts:8-18`.
- **pi** — forms `tui`, `oneshot`; bridge takes `dispatch`, `steer`, `answer`, `model`; model control, lifecycle control, worker launch, session view, thinking strategy, workspace trust, shim, model catalogue/warm, compaction. `packages/orch/src/adapters/pi.ts:344-359,395-421`
- **omp** — forms `tui`, `oneshot`; inherited pi-bridge capabilities (bridge, controls, worker launch, session view, resume, command gate), plus shim, persisted default-model reader, model catalogue/warm; no thinking, compaction, ACP or server role. `packages/orch/src/adapters/omp.ts:65-81`
- **claude** — forms `tui`, `oneshot`; thinking strategy, lifecycle control, session view, shim/settings file, model catalogue/warm, launch compaction, hooks reporting start/prompt, resume and command gate; no bridge, ACP or server. `packages/orch/src/adapters/claude.ts:208-238`
- **codex** — forms `tui`, `oneshot`, `acp`; session view, shim, catalogue (no warm role), launch compaction, ACP binding and resume; no thinking, bridge, hooks or server. `packages/orch/src/adapters/codex.ts:95-126`
- **opencode** — forms `tui`, `oneshot`, `acp`, `server`; lifecycle control, model catalogue/warm, ACP binding, server driver and resume; no thinking, bridge, hooks or compaction. `packages/orch/src/adapters/opencode.ts:32-64`

## 6. Model catalogue, storage and `orch models` marks
Each adapter supplies a harness-native query/parser: pi runs `pi --list-models` and parses provider/model rows; omp runs `omp models --json`; Claude sends the stream-json initialize request; Codex reads its `models_cache.json`; opencode runs `opencode models`. The adapter registry warms available model queries and owns catalogue dispatch. `packages/orch/src/adapters/pi.ts:104-126`; `packages/orch/src/adapters/omp.ts:24-59`; `packages/orch/src/adapters/claude.ts:41-76`; `packages/orch/src/adapters/codex.ts:38-49,185-190`; `packages/orch/src/adapters/opencode.ts:10-13,88-90`; `packages/orch/src/adapters/registry.ts:9-22`

`createModelCatalogue(orchDir, logger)` caches results in memory and persists successful query output via the `catalogues` store table; rows are read/written by `readCatalogues`/`writeCatalogue`. `packages/orch/src/adapters/model-catalogue.ts:48-69,82-91`; `packages/orch/src/store/catalogue-rows.ts:7-24`. The table's stored entry shape is `{ command, binary, at, stdout }`; command is its key. `packages/orch/src/types/store.ts:143-147`; `packages/orch/src/db/schema.ts:68-75`.

`orch models` marks `default` when the listed bare model equals the harness's configured `defaults.models[id]` after tuning resolution; `picker` when its spec is in `models.preferred[id]`. `models.allowed` is deliberately not used to hide rows. `packages/orch/src/commands/models.ts:35-52,24-28`

## 7. Lists of models or named harness/model groups
- There is no existing setting/type for a named group of harness-plus-model pairs. `OrchSettings.defaults.models` is only a partial map from one harness id to one model string; `models.allowed` and `models.preferred` are per-harness lists, not named groups. `packages/orch/src/types/settings.ts:51,54`; `packages/orch/src/settings/schema.ts:150,183-185`
- Model-list types that do exist:
```ts
export type CompactionTable = Partial<Record<AdapterId, Readonly<Record<string, number>>>>;
export interface HarnessModel {
  readonly spec: string;
  readonly label?: string;
  readonly resolved?: string;
}
```
`packages/orch/src/types/settings.ts:43`; `packages/orch/src/types/adapter.ts:169-176`
