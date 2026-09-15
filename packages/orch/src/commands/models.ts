import { resolveAdapter } from "../adapters/registry.ts";
import { resolveTuning } from "../policy/tuning.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { validateSetupFlag } from "../setup/flags.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { Services } from "../types/services.ts";
import type { AdapterId, HarnessModel } from "../types/adapter.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { CatalogueReader, HarnessSection, ModelFilters, ModelRow } from "../types/command.ts";

/**
 * `orch models` — what each installed harness says it can run.
 *
 * This is DISCOVERY, and it is why a quicklist can stay small: every model a harness offers is
 * listed here whether or not it is in `models.preferred` or `models.allowed`, so a model outside
 * the picker quicklist stays findable and stays launchable.
 */

const USAGE = "usage: orch models [--agent=<id>] [--preferred] [--search=<text>] [--json] [--pick=<index|spec>]";

/** The harnesses to list: the one named by --agent, else every installed one in order. */
function readTargets(only: string | undefined, enabled: readonly AdapterId[]): AdapterId[] {
  if (!enabled.length) die("no harnesses are installed - run: orch setup");
  return only === undefined ? [...enabled] : [validateSetupFlag("harness", only, enabled)];
}

/** What a harness reports it can run. One that cannot enumerate lists nothing here rather than
 *  borrowing another harness's catalogue or inventing entries. */
function readAdapterCatalogue(id: AdapterId, services: Pick<Services, "logger" | "models">): readonly HarnessModel[] {
  try {
    return resolveAdapter(id).models?.listModels(services.models) ?? [];
  } catch (error: unknown) {
    const message = errorMessage(error);
    services.logger.error("models.catalogue-failed", { adapter: id, error: message });
    process.stdout.write(`  ${id}: could not list models - ${message}\n`);
    return [];
  }
}

/** Keep the rows the filters admit. No match is an empty result, never a fall back to the
 *  whole catalogue. `models.allowed` is deliberately not consulted: it gates launches, not sight. */
function matchingModels(
  offered: readonly HarnessModel[],
  preferred: readonly string[],
  filters: ModelFilters,
): readonly HarnessModel[] {
  const needle = filters.search?.toLowerCase();
  return offered.filter((model) => {
    if (filters.quicklistOnly && !preferred.includes(model.spec)) return false;
    if (needle === undefined) return true;
    return model.spec.toLowerCase().includes(needle) || (model.label?.toLowerCase().includes(needle) ?? false);
  });
}

/** One harness's section, numbered in display order so `--pick=<n>` names the row the user read. */
function buildSection(id: AdapterId, settings: OrchSettings, filters: ModelFilters, read: CatalogueReader): HarnessSection {
  const preferred = settings.models.preferred[id] ?? [];
  const configuredDefault = settings.defaults.models[id];
  const defaultBare = resolveTuning({ model: configuredDefault, harness: id, settings })?.model;
  const models = matchingModels(read(id), preferred, filters).map((model, position) => ({
    index: position + 1,
    spec: model.spec,
    ...(model.label ? { label: model.label } : {}),
    default: model.spec === defaultBare,
    preferred: preferred.includes(model.spec),
  }));
  return { id, ...(configuredDefault ? { default: configuredDefault } : {}), preferred: [...preferred], models };
}

/** Every targeted harness's catalogue, in configured order. */
export function buildSections(
  targets: readonly AdapterId[],
  settings: OrchSettings,
  filters: ModelFilters,
  read: CatalogueReader,
): HarnessSection[] {
  return targets.map((id) => buildSection(id, settings, filters, read));
}

/** How a row is marked: what the harness launches on, what its own picker cycles. */
function rowMarks(row: ModelRow): string {
  return [row.default ? "default" : "", row.preferred ? "picker" : ""].filter(Boolean).join(",");
}

/** The human-readable listing: one titled table per harness. */
export function renderSections(sections: readonly HarnessSection[]): string {
  return sections.map((section) => {
    const title = `${section.id}  (default ${section.default ?? "(none)"}, picker ${section.preferred.length || "none"})`;
    if (!section.models.length) return `${title}\n  no models listed\n`;
    const rows = section.models.map((row) => [String(row.index), row.spec, row.label ?? "", rowMarks(row)]);
    return `${title}\n${renderTable(["#", "MODEL", "LABEL", "MARKS"], rows, [4, 48, 40, 14])}\n`;
  }).join("\n");
}

/** The one spec a `--pick` names; throws naming why it named none. A numeric pick reads the
 *  displayed index, so it needs exactly one harness section to be unambiguous. */
export function pickedSpec(sections: readonly HarnessSection[], pick: string): string {
  const wanted = Number(pick);
  if (Number.isInteger(wanted)) {
    if (sections.length !== 1) throw new Error(`--pick=${pick} is ambiguous across ${sections.length} harnesses - name one with --agent=<id>`);
    const section = sections[0]!;
    const row = section.models.find((candidate) => candidate.index === wanted);
    if (!row) throw new Error(`--pick=${pick} is out of range - ${section.id} listed ${section.models.length} model(s)`);
    return row.spec;
  }
  const matches = sections.filter((section) => section.models.some((row) => row.spec === pick));
  if (!matches.length) throw new Error(`--pick=${pick} matched no listed model`);
  if (matches.length > 1) throw new Error(`--pick=${pick} is offered by ${matches.map((section) => section.id).join(", ")} - name one with --agent=<id>`);
  return pick;
}

/** Print the one spec `--pick` resolves to, so another command can consume it verbatim. */
function writePickedSpec(sections: readonly HarnessSection[], pick: string): void {
  try {
    process.stdout.write(`${pickedSpec(sections, pick)}\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/**
 * List what each installed harness can run. Reads adapters only; writes nothing — neither
 * `--pick` nor a filter ever changes a recorded default, quicklist, or allowlist.
 */
export function cmdModels(services: Services, args: string[]): void {
  const { flags, positional } = parseCommand("models", args);
  if (positional.length) die(`orch models: unknown ${positional.length === 1 ? "argument" : "arguments"} ${positional.join(" ")}\n${USAGE}`);
  const json = flags.has("--json");
  const pick = flags.value("--pick");
  if (pick !== undefined && json) die("--pick prints one model spec and --json prints the catalogue; pass one or the other");

  let settings: OrchSettings;
  try {
    settings = services.settings.current();
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const search = flags.value("--search");
  const sections = buildSections(readTargets(flags.value("--agent"), settings.enabled.adapters), settings, {
    quicklistOnly: flags.has("--preferred"),
    ...(search === undefined ? {} : { search }),
  }, (id) => readAdapterCatalogue(id, services));

  if (pick !== undefined) {
    writePickedSpec(sections, pick);
    return;
  }
  process.stdout.write(json ? JSON.stringify({ harnesses: sections }, null, 2) + "\n" : renderSections(sections));
}
