import { confirm, isCancel } from "@clack/prompts";
import * as files from "node:fs";
import { refreshAdapterCatalogues, resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { reapUnreadableSettings } from "../settings/read.ts";
import { settingsPath } from "../settings/schema.ts";
import { writeSettingsNotify, writeSettingsSkills } from "../settings/write.ts";
import { ORCH_RUNTIMES } from "../runtime.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { runDoctor } from "../doctor/runner.ts";
import { promptText } from "../setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "../setup/notifiers.ts";
import { describeSkillPlacement, installSkills, packagedSkillNames, type SkillRoots } from "../setup/skills.ts";
import { setupIntro, setupOutro, selectNotifiers } from "../setup/wizard.ts";
import { presenceDir } from "../presence/store.ts";
import type { Services } from "../types/services.ts";
import { compositionUnrecorded, resolveSetupComposition, recordComposition } from "../setup/composition.ts";
import type { SetupComposition } from "../setup/composition.ts";
import { parseSetupOptions } from "../setup/flags.ts";
import type { SetupOptions } from "../setup/flags.ts";
import { installPrerequisites, installAdapterShims, wireBinaries, alignEntrypointToRuntime } from "../setup/install.ts";
import { runSetupSmoke, smokeBlocker } from "../setup/smoke.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { OrchDir } from "../types/core.ts";

export { compositionUnrecorded };

/** Confirm-to-record prompt, defaulting to NO — a cancelled or declined prompt records nothing. */
async function promptConfirm(message: string): Promise<boolean> {
  const answer = await confirm({ message, initialValue: false });
  return !isCancel(answer) && answer === true;
}

/** Ask whether orch may install its packaged skills, defaulting to YES. Writing the store
 *  and linking a harness directory into it is the user's call, so a declined or cancelled
 *  prompt records the refusal rather than installing anyway. */
async function askSkillsConsent(roots: SkillRoots, recorded: boolean): Promise<boolean> {
  const linked = roots.link.length ? `, linked into ${roots.link.join(" and ")}` : "";
  const answer = await confirm({
    message: `Install orch's skills (${packagedSkillNames().join(", ")}) into ${roots.store}${linked}?`,
    initialValue: recorded,
  });
  return !isCancel(answer) && answer === true;
}

/** Resolve skills consent from `--skills`/`--no-skills`, the prompt, or what is already
 *  recorded, then write the store and its harness links when allowed. */
async function offerSkills(
  services: Pick<Services, "orchDir" | "settings">,
  args: string[],
  interactive: boolean,
  ask: (roots: SkillRoots, recorded: boolean) => Promise<boolean> = askSkillsConsent,
): Promise<void> {
  // A build that packaged no skills has nothing to consent to; asking would offer an
  // empty list and then write nothing.
  if (!packagedSkillNames().length) return;
  const { install: recorded, store, link } = services.settings.current().skills;
  const roots = { store, link };
  const forced = args.includes("--skills") ? true : args.includes("--no-skills") ? false : undefined;
  const install = forced ?? (interactive ? await ask(roots, recorded) : recorded);
  writeSettingsSkills(services.orchDir, { install });
  process.stdout.write("Skills:\n");
  if (!install) {
    process.stdout.write("  not installed - turn it back on with: orch settings skills --install\n");
    return;
  }
  for (const placed of installSkills(roots)) process.stdout.write(`  ${describeSkillPlacement(placed)}\n`);
}

/** Surface the reappable malformed presence records the closing doctor pass found and, on a TTY,
 * offer to reap them (default: keep) — so setup resolves what it can rather than reporting it as a
 * post-setup failure (11.2). Non-interactive runs report only. Returns whether any were reaped. */
export async function offerReapMalformedRecords(
  results: readonly CheckResult[],
  interactive: boolean,
  askConfirm: (count: number) => Promise<boolean> = (count) => promptConfirm(`Reap ${count} malformed presence record${count === 1 ? "" : "s"} now?`),
): Promise<boolean> {
  const malformed = results.find((result) => result.id === "malformed-presence");
  const records = malformed?.ignoredRecords ?? [];
  if (!records.length) return false;
  process.stdout.write(
    `Malformed presence records (${records.length}):\n` +
    records.map((record) => `  - ${record.path}: ${record.reason}`).join("\n") + "\n",
  );
  if (!interactive || !(await askConfirm(records.length))) {
    process.stdout.write("  kept - orch clean can reap them later\n");
    return false;
  }
  for (const record of records) files.rmSync(record.path, { recursive: true, force: true });
  process.stdout.write(`  reaped ${records.length} record${records.length === 1 ? "" : "s"}\n`);
  return true;
}

async function initializeSetup(options: SetupOptions, services: Pick<Services, "orchDir" | "models">): Promise<void> {
  // Before the first prompt, and for every harness rather than the ones about to be picked:
  // the registry queries then run under the whole wizard instead of stalling the model step.
  if (options.refresh) await refreshAdapterCatalogues(services.models);
  else warmAdapterCatalogues(services.models);
  if (options.interactive) setupIntro();

  // setup is the ONE recovery path: a settings.json from an older schema (or otherwise invalid)
  // is malformed data, not something to migrate — reap it so re-recording can proceed.
  const reaped = reapUnreadableSettings(services.orchDir);
  if (reaped) process.stdout.write(`  previous settings.json was unreadable (older schema or invalid values) - moved aside to ${reaped}, re-recording from scratch\n`);
}

async function installSetupComposition(
  services: Pick<Services, "orchDir" | "settings" | "logger">,
  composition: SetupComposition,
  options: SetupOptions,
  args: string[],
): Promise<string[] | null> {
  recordComposition(services.orchDir, composition.runtime, composition.adapters, composition.defaultAdapter, composition.backends, composition.defaultBackend, composition.models);
  if (!(await installPrerequisites(services.logger, composition.adapters, composition.backends, options.interactive, options.yes, options.noInstall))) return null;
  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(services.orchDir), { recursive: true });
  process.stdout.write(`  ${presenceDir(services.orchDir)}\n`);
  const gaps = await installAdapterShims(services.orchDir, services.settings.current(), services.logger, composition.adapters, options.copy);
  await offerSkills(services, args, options.interactive);
  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (options.interactive) await configureNotifiers(services);
  wireBinaries(options.copy);
  alignEntrypointToRuntime(composition.runtime);
  await diagnoseAdapters(services.orchDir, services.settings.current(), services.logger, composition.adapters);
  return gaps;
}

async function diagnoseAdapters(orchDir: OrchDir, settings: OrchSettings, logger: Services["logger"], adapters: readonly AdapterId[]): Promise<void> {
  // Validate each selected (installed) adapter through its own provider port.
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (!adapter.shim) continue;
    const result = await adapter.shim.diagnoseShim(orchDir, settings, logger);
    process.stdout.write(`  ${result.status.toUpperCase()} ${result.label}: ${result.detail}\n`);
  }
}

async function runDoctorPass(services: Pick<Services, "orchDir" | "logger" | "models">, interactive: boolean): Promise<CheckResult[]> {
  process.stdout.write("Running doctor checks...\n");
  let doctorResults = await runDoctor(services, {});
  // Re-run after a reap so the passed/total count reflects the reaped records, not the pre-reap state.
  if (await offerReapMalformedRecords(doctorResults, interactive)) doctorResults = await runDoctor(services, {});
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  return doctorResults;
}

async function finishSetup(services: Services, options: SetupOptions, gaps: readonly string[]): Promise<void> {
  if (gaps.length) {
    process.stdout.write("Setup incomplete:\n" + gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }
  // The smoke spawns a real agent and spends real tokens, so it runs only when asked for.
  if (options.smoke) {
    const blocker = smokeBlocker(services.settings.current());
    if (blocker) process.stdout.write(`Smoke test skipped - ${blocker}.\n`);
    else {
      process.stdout.write("Smoke test - verifying orch can deliver work (headless spawn on a prompt + result)...");
      await runSetupSmoke(services, process.cwd());
    }
  }
  const doneMessage = "Done. Open a plexer workspace and try: orch spawn 2 --tab Team1";
  if (options.interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Onboarding wizard: record the composition, install prerequisites and adapter shims, wire bins,
 * then run a closing doctor pass. Each step is a single-purpose helper; this orchestrates them. */
export async function cmdSetup(services: Services, args: string[]) {
  const options = parseSetupOptions(args);
  await initializeSetup(options, services);

  const composition = await resolveSetupComposition(services.settings.current(), services.models, options);
  if (composition === null) return;
  const gaps = await installSetupComposition(services, composition, options, args);
  if (gaps === null) return;

  await runDoctorPass(services, options.interactive);
  await finishSetup(services, options, gaps);
}

/** Interactive notifier onboarding: probe all notifiers, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
async function configureNotifiers(services: Pick<Services, "orchDir" | "logger" | "settings">): Promise<void> {
  const choices = await probeNotifiers(services.settings.currentOrNull());
  if (!choices.length) return;
  const picked = await selectNotifiers(choices);
  if (!picked?.length) return;
  const selections: { id: string; config: Record<string, unknown> }[] = [];
  for (const id of picked) {
    const choice = choices.find((notifier) => notifier.id === id);
    if (!choice?.available) continue;
    const config: Record<string, unknown> = {};
    for (const field of choice.requiredFields) {
      const answer = await promptText(`${id}: ${field.label ?? field.name}`);
      if (answer === null) return; // cancel skips the whole notifier step
      // Keep command strings in settings; the notifier router normalizes them at delivery time.
      config[field.name] = answer;
    }
    selections.push({ id, config });
  }
  const result = await buildSelectedNotifyEntries(selections);
  for (const error of result.errors) {
    services.logger.warn("setup.notifier-missing-fields", { notifier: error.id, missing: error.missing.join(", ") });
    process.stdout.write(`  notifier ${error.id}: missing required fields - ${error.missing.join(", ")}\n`);
  }
  if (result.entries.length) {
    writeSettingsNotify(services.orchDir, result.entries);
    process.stdout.write(`  recorded ${result.entries.length} notifier(s): ${result.entries.map((entry) => entry.id).join(", ")}\n`);
  }
}

/** The plain-language line for a command that needs a recorded setup when there is no TTY to walk
 * the wizard on. Names what is missing, the file, and the exact command that fixes it — a refusal
 * to proceed is communicated, never thrown as a stack trace. */
export function setupRequiredMessage(orchDir: OrchDir): string {
  // The accepted ids are compile-time constants, so the message lists them rather than printing
  // <id> and leaving the reader to go find them.
  return `orch is not set up yet - no harness/backend recorded in ${settingsPath(orchDir)}.\n`
    + `Run: orch setup\n`
    + `Non-interactive: orch setup --yes --agent <${ADAPTER_IDS.join("|")}> `
    + `--backend <${BACKEND_IDS.join("|")}> [--runtime ${ORCH_RUNTIMES.join("|")}]`;
}

/** Walk the first run through the setup wizard, then dispatch the original command via the injected dispatcher. */
export async function runFirstTimeSetup(services: Services, argv: string[], dispatch: (argv: string[]) => void): Promise<void> {
  process.stdout.write("First run - no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup(services, []);
  services.settings.reload();
  // A cancelled wizard records nothing, so the original command must not run.
  // `process.exitCode`, never `process.exit()`: exiting truncates whatever the
  // wizard already wrote (src/commands/index.ts:272 states the same rule).
  if (compositionUnrecorded(services.settings.currentOrNull())) {
    process.exitCode = 1;
    return;
  }
  dispatch(argv);
}
