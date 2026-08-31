import { describe, expect, test } from "bun:test";
import { buildSections, pickedSpec, renderSections } from "../src/commands/models.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import type { AdapterId, HarnessModel } from "../src/types/adapter.ts";
import type { OrchSettings } from "../src/types/settings.ts";

// `orch models` exists so a small quicklist never hides a harness's catalogue: every offered
// model is listed by default, and one outside models.preferred is still discoverable and
// still launchable. models.allowed gates launches, not what this command shows.

const PI_CATALOGUE: HarnessModel[] = [
  { spec: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { spec: "openai/gpt-5.6", label: "GPT-5.6 Luna" },
  { spec: "openrouter/qwen3-coder" },
];
const CLAUDE_CATALOGUE: HarnessModel[] = [{ spec: "sonnet" }, { spec: "opus" }];

const catalogues: Partial<Record<AdapterId, HarnessModel[]>> = { pi: PI_CATALOGUE, claude: CLAUDE_CATALOGUE };
const read = (id: AdapterId): readonly HarnessModel[] => catalogues[id] ?? [];

const settings = (): OrchSettings => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
  locked_commands: [],
  defaults: { models: { pi: "openai/gpt-5.6:high", claude: "sonnet" }, worktree: false },
  fleet: { worker_peer_tools: false, max_agents_per_pack: 10, max_depth: 1, cross_space: false, max_agents_per_space: {} },
  models: { allowed: { pi: ["anthropic/*"] }, preferred: { pi: ["anthropic/claude-sonnet-4.5"] } },
  workers: { inherit_extensions: false, exclude_extensions: [], builtin_tools: true, allow_tools: [] },
  queue: { max_retries: 1 },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  notify: [],
  hosts: {},
  spaces: {},
  tiling: { first_split: "rows" },
  skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
});

const listAll = (targets: AdapterId[] = ["pi", "claude"]) =>
  buildSections(targets, settings(), { quicklistOnly: false }, read);

describe("orch models lists the whole catalogue", () => {
  test("shows every offered model, quicklisted or not, allowed or not", () => {
    const [pi] = listAll(["pi"]);

    expect(pi!.models.map((row) => row.spec)).toEqual(PI_CATALOGUE.map((model) => model.spec));
    // models.allowed is "anthropic/*", yet the two models it would refuse are still listed.
    expect(pi!.models.map((row) => row.index)).toEqual([1, 2, 3]);
  });

  test("marks the launch default (thinking suffix removed) and the quicklist members", () => {
    const [pi] = listAll(["pi"]);

    expect(pi!.default).toBe("openai/gpt-5.6:high");
    expect(pi!.models.find((row) => row.spec === "openai/gpt-5.6")).toMatchObject({ default: true, preferred: false });
    expect(pi!.models.find((row) => row.spec === "anthropic/claude-sonnet-4.5")).toMatchObject({ default: false, preferred: true });
    expect(pi!.models.find((row) => row.spec === "openrouter/qwen3-coder")).toMatchObject({ default: false, preferred: false });
  });

  test("keeps harness sections in configured order", () => {
    expect(listAll().map((section) => section.id)).toEqual(["pi", "claude"]);
  });

  test("a harness that enumerates nothing gets an empty section, not another's models", () => {
    const [codex] = buildSections(["codex"], settings(), { quicklistOnly: false }, read);

    expect(codex!.models).toEqual([]);
    expect(renderSections([codex!])).toContain("no models listed");
  });
});

describe("orch models filters", () => {
  test("--preferred narrows to the quicklist and renumbers what is shown", () => {
    const [pi] = buildSections(["pi"], settings(), { quicklistOnly: true }, read);

    expect(pi!.models.map((row) => row.spec)).toEqual(["anthropic/claude-sonnet-4.5"]);
    expect(pi!.models[0]!.index).toBe(1);
  });

  test("--search matches spec and label case-insensitively", () => {
    const bySpec = buildSections(["pi"], settings(), { quicklistOnly: false, search: "QWEN" }, read);
    const byLabel = buildSections(["pi"], settings(), { quicklistOnly: false, search: "luna" }, read);

    expect(bySpec[0]!.models.map((row) => row.spec)).toEqual(["openrouter/qwen3-coder"]);
    expect(byLabel[0]!.models.map((row) => row.spec)).toEqual(["openai/gpt-5.6"]);
  });

  test("filters combine, and no match is an empty result rather than the full list", () => {
    const combined = buildSections(["pi"], settings(), { quicklistOnly: true, search: "gpt" }, read);

    expect(combined[0]!.models).toEqual([]);
  });
});

describe("orch models --pick prints one spec", () => {
  test("a numeric pick reads the displayed index of a single harness", () => {
    expect(pickedSpec(buildSections(["pi"], settings(), { quicklistOnly: false }, read), "2")).toBe("openai/gpt-5.6");
  });

  test("an exact spec pick resolves after filtering", () => {
    expect(pickedSpec(listAll(), "openrouter/qwen3-coder")).toBe("openrouter/qwen3-coder");
  });

  test("ambiguous, missing, zero, and out-of-range picks fail", () => {
    const all = listAll();
    // A numeric pick across two harness sections names two different rows.
    expect(() => pickedSpec(all, "1")).toThrow(/ambiguous/);
    expect(() => pickedSpec(buildSections(["pi"], settings(), { quicklistOnly: false }, read), "0")).toThrow(/out of range/);
    expect(() => pickedSpec(buildSections(["pi"], settings(), { quicklistOnly: false }, read), "9")).toThrow(/out of range/);
    expect(() => pickedSpec(all, "anthropic/nope")).toThrow(/matched no listed model/);
    // Filtered out is picked out: --preferred hides it, so picking it fails.
    expect(() => pickedSpec(buildSections(["pi"], settings(), { quicklistOnly: true }, read), "openai/gpt-5.6")).toThrow(/matched no listed model/);
  });
});

describe("orch models --json", () => {
  test("emits the pinned harness/model shape", () => {
    const payload: unknown = JSON.parse(JSON.stringify({ harnesses: buildSections(["claude"], settings(), { quicklistOnly: false }, read) }));

    expect(payload).toEqual({
      harnesses: [{
        id: "claude",
        default: "sonnet",
        preferred: [],
        models: [
          { index: 1, spec: "sonnet", default: true, preferred: false },
          { index: 2, spec: "opus", default: false, preferred: false },
        ],
      }],
    });
  });
});
