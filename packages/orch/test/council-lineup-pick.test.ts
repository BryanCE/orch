import { afterEach, describe, expect, test } from "bun:test";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { resolveCouncilModels, type HarnessOffer, type HarnessOffers } from "../src/setup/composition.ts";
import type { AdapterId } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { OrchSettings } from "../src/types/settings.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { captureStdout } from "./helpers/stdout.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) removeTempDir(directory);
});

function settingsWith(council: Record<string, string[]>): OrchSettings {
  const directory = tempOrchDir("orch-council-lineup-pick-");
  directories.push(directory);
  writeSettingsFixture(directory, {
    enabled: { adapters: ["pi", "claude"], backends: [] },
    models: { allowed: { pi: ["openai-codex/*"] } },
    council: { models: council },
  });
  return fileSettingsManager(directory).current();
}

function offer(id: AdapterId, specs: readonly string[]): HarnessOffer {
  return { id, models: specs.map((spec) => ({ spec })), suggested: null, compaction: false, signIn: null, error: null };
}

const CATALOGUES: Record<string, readonly string[]> = { pi: ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol", "openrouter/other"], claude: ["sonnet", "opus"] };
const offers: HarnessOffers = (harnesses) => Promise.resolve(harnesses.map((id) => offer(id, CATALOGUES[id] ?? [])));

type Pickers = NonNullable<Parameters<typeof resolveCouncilModels>[3]>;

/** Every member keeps the level the picker starts it on. */
const keepLevel: Pickers["thinking"] = (_harness, _model, current) => Promise.resolve(current);

/** Run the pick with the picker's progress lines kept off the test output. */
async function picked(settings: OrchSettings, harnesses: readonly AdapterId[], models: Pickers["models"], thinking: Pickers["thinking"] = keepLevel): Promise<Awaited<ReturnType<typeof resolveCouncilModels>>> {
  let lineup: Awaited<ReturnType<typeof resolveCouncilModels>> = null;
  await captureStdout(async () => { lineup = await resolveCouncilModels(settings, offers, harnesses, { models, thinking }); });
  return lineup;
}

describe("picking the council's lineup", () => {
  test("offers each harness the models it lists and may launch, with the recorded ones checked", async () => {
    const asked: { harness: string; offered: string[]; already: string[] }[] = [];
    await picked(settingsWith({ pi: ["openai-codex/gpt-6-luna:high"] }), ["pi", "claude"], (harness, offered, already) => {
      asked.push({ harness, offered: offered.map((model) => model.spec), already: [...already] });
      return Promise.resolve(harness === "pi" ? ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol"] : ["sonnet"]);
    });

    expect(asked).toEqual([
      { harness: "pi", offered: ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol"], already: ["openai-codex/gpt-6-luna"] },
      { harness: "claude", offered: ["sonnet", "opus"], already: [] },
    ]);
  });

  test("asks each member's thinking level, starting on its recorded level or the launch default, and writes it on the member", async () => {
    const asked: { harness: string; model: string; current: string }[] = [];
    const lineup = await picked(
      settingsWith({ pi: ["openai-codex/gpt-6-luna:high"] }),
      ["pi", "claude"],
      (harness) => Promise.resolve(harness === "pi" ? ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol"] : ["sonnet"]),
      (harness, model, current) => {
        asked.push({ harness, model, current });
        return Promise.resolve(model === "sonnet" ? "xhigh" : current);
      },
    );

    expect(asked).toEqual([
      { harness: "pi", model: "openai-codex/gpt-6-luna", current: "high" },
      { harness: "pi", model: "openai-codex/gpt-6.1-sol", current: "medium" },
      { harness: "claude", model: "sonnet", current: "medium" },
    ]);
    expect(lineup).toEqual({ pi: ["openai-codex/gpt-6-luna:high", "openai-codex/gpt-6.1-sol:medium"], claude: ["sonnet:xhigh"] });
  });

  test("an empty pick seats nobody from that harness", async () => {
    expect(await picked(settingsWith({ pi: ["openai-codex/gpt-6-luna"], claude: ["opus"] }), ["pi", "claude"], (harness) => Promise.resolve(harness === "pi" ? [] : ["opus"]))).toEqual({ claude: ["opus:medium"] });
  });

  test("a harness that lists nothing keeps its recorded members, and a cancel changes nothing", async () => {
    expect(await picked(settingsWith({ claude: ["opus"] }), ["omp"], () => Promise.resolve(["never asked"]))).toEqual({ claude: ["opus"] });
    expect(await picked(settingsWith({ claude: ["opus"] }), ["claude"], () => Promise.resolve(null))).toBeNull();
    expect(await picked(settingsWith({ claude: ["opus"] }), ["claude"], () => Promise.resolve(["opus"]), () => Promise.resolve(null))).toBeNull();
  });
});
