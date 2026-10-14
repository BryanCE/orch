import type { AdapterId, ModelCatalogue } from "../../types/adapter.ts";
import type { CompactionTable, EditingState } from "../../types/settings.ts";
import type { SettingsManager } from "../../types/services.ts";
import { resolveAdapter } from "../../adapters/registry.ts";
import { readHarnessCatalogue } from "../../setup/composition.ts";
import { parseIntegerSetting } from "../parse.ts";
import { askChoice, askValue } from "./ask.ts";
import { cancelEdit, commitAndFlush, type Session } from "./state.ts";

const TOKENS = { kind: "integer", min: 1 } as const;
const HARNESS_DEFAULT = "harness default";

/** The table with one pair set, or dropped when `tokens` is null so the harness default wins. */
function withPair(table: CompactionTable, harness: AdapterId, model: string, tokens: number | null): CompactionTable {
  const { [model]: _dropped, ...rest } = table[harness] ?? {};
  const models = tokens === null ? rest : { ...rest, [model]: tokens };
  return Object.fromEntries(Object.entries({ ...table, [harness]: models }).filter(([, entries]) => Object.keys(entries ?? {}).length));
}

/** Every model the harness lists, then any recorded model it no longer lists, so that one can be cleared. */
async function harnessModels(harness: AdapterId, catalogue: ModelCatalogue, recorded: Readonly<Record<string, number>>): Promise<string[]> {
  const offered = (await readHarnessCatalogue(resolveAdapter(harness), catalogue, false)).map((model) => model.spec);
  return [...new Set([...offered, ...Object.keys(recorded)])];
}

/** Empty clears the pair; anything else is a positive token count. */
function tokensRefusal(input: string): string | undefined {
  if (!input.trim()) return undefined;
  const parsed = parseIntegerSetting(TOKENS, input.trim());
  return parsed.ok ? undefined : parsed.reason;
}

/** The enabled harness to edit: asked only when more than one takes a compaction point. */
async function pickHarness(session: Session, manager: SettingsManager, harnesses: readonly AdapterId[]): Promise<AdapterId | undefined> {
  const picked = harnesses.length === 1 ? harnesses[0] : await askChoice(session, manager, harnesses, undefined);
  return harnesses.find((candidate) => candidate === picked);
}

/** One of the harness's models, each shown with the point it compacts at now. */
async function pickModel(session: Session, manager: SettingsManager, models: readonly string[], recorded: Readonly<Record<string, number>>): Promise<string | null> {
  const notes = Object.fromEntries(models.map((model) => [model, String(recorded[model] ?? HARNESS_DEFAULT)]));
  return askChoice(session, manager, models, undefined, notes);
}

/** Pick a harness that takes a compaction point, one of its models, then the token count.
 *  An empty count drops the pair, so that model launches on the harness's own default. */
export async function editCompaction(session: Session, manager: SettingsManager, catalogue: ModelCatalogue, editing: EditingState): Promise<void> {
  const table = manager.current().workers.compact_at_tokens;
  const harnesses = manager.current().enabled.adapters.filter((id) => resolveAdapter(id).compaction !== null);
  if (!harnesses.length) return cancelEdit(session, editing, "no enabled harness takes a compaction point");
  const id = await pickHarness(session, manager, harnesses);
  if (id === undefined) return cancelEdit(session, editing);
  const recorded = table[id] ?? {};
  const models = await harnessModels(id, catalogue, recorded);
  if (!models.length) return cancelEdit(session, editing, `${id} lists no models`);
  const model = await pickModel(session, manager, models, recorded);
  if (model === null) return cancelEdit(session, editing);
  const typed = await askValue(session, manager, `${id} ${model} compacts at (tokens, empty for ${HARNESS_DEFAULT})`, String(recorded[model] ?? ""), undefined, tokensRefusal);
  if (typed === null) return cancelEdit(session, editing);
  commitAndFlush(session, manager, editing, withPair(table, id, model, typed.trim() ? Number(typed.trim()) : null));
}
