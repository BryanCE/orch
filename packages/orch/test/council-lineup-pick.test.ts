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

/** Run the pick with the picker's progress lines kept off the test output. */
async function picked(settings: OrchSettings, harnesses: readonly AdapterId[], pick: Parameters<typeof resolveCouncilModels>[3]): Promise<Awaited<ReturnType<typeof resolveCouncilModels>>> {
  let lineup: Awaited<ReturnType<typeof resolveCouncilModels>> = null;
  await captureStdout(async () => { lineup = await resolveCouncilModels(settings, offers, harnesses, pick); });
  return lineup;
}

describe("picking the council's lineup", () => {
  test("offers each harness the models it lists and may launch, with the recorded ones checked", async () => {
    const asked: { harness: string; offered: string[]; already: string[] }[] = [];
    const lineup = await picked(settingsWith({ pi: ["openai-codex/gpt-6-luna:high"] }), ["pi", "claude"], (harness, offered, already) => {
      asked.push({ harness, offered: offered.map((model) => model.spec), already: [...already] });
      return Promise.resolve(harness === "pi" ? ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol"] : ["sonnet"]);
    });

    expect(asked).toEqual([
      { harness: "pi", offered: ["openai-codex/gpt-6-luna", "openai-codex/gpt-6.1-sol"], already: ["openai-codex/gpt-6-luna"] },
      { harness: "claude", offered: ["sonnet", "opus"], already: [] },
    ]);
    expect(lineup).toEqual({ pi: ["openai-codex/gpt-6-luna:high", "openai-codex/gpt-6.1-sol"], claude: ["sonnet"] });
  });

  test("an empty pick seats nobody from that harness", async () => {
    expect(await picked(settingsWith({ pi: ["openai-codex/gpt-6-luna"], claude: ["opus"] }), ["pi", "claude"], (harness) => Promise.resolve(harness === "pi" ? [] : ["opus"]))).toEqual({ claude: ["opus"] });
  });

  test("a harness that lists nothing keeps its recorded members, and a cancel changes nothing", async () => {
    expect(await picked(settingsWith({ claude: ["opus"] }), ["omp"], () => Promise.resolve(["never asked"]))).toEqual({ claude: ["opus"] });
    expect(await picked(settingsWith({ claude: ["opus"] }), ["claude"], () => Promise.resolve(null))).toBeNull();
  });
});
