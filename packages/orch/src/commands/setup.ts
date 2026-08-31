import { confirm, isCancel } from "@clack/prompts";
import * as files from "node:fs";
import { refreshAdapterCatalogues, resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { loadSettings, reapUnreadableSettings } from "../settings/read.ts";
import { settingsPath } from "../settings/schema.ts";
import { writeSettingsNotify, writeSettingsSkills } from "../settings/write.ts";
import { ORCH_RUNTIMES } from "../runtime.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { runDoctor } from "../doctor/runner.ts";
import { promptText } from "../setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "../setup/notifiers.ts";
import { installSkills, packagedSkillNames } from "../setup/skills.ts";
import { setupIntro, setupOutro, selectNotifiers } from "../setup/wizard.ts";
import { orchDir, presenceDir } from "../presence/store.ts";
import { commandLogger } from "./logging.ts";
import { compositionUnrecorded, resolveSetupComposition, recordComposition } from "../setup/composition.ts";
import type { SetupComposition } from "../setup/composition.ts";
import { parseSetupOptions } from "../setup/flags.ts";
import type { SetupOptions } from "../setup/flags.ts";
import { installPrerequisites, installAdapterShims, wireBinaries, alignEntrypointToRuntime } from "../setup/install.ts";
import { runSetupSmoke, smokeBlocker } from "../setup/smoke.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { CheckResult } from "../types/doctor.ts";

export { compositionUnrecorded };

/** Confirm-to-record prompt, defaulting to NO — a cancelled or declined prompt records nothing. */
async function promptConfirm(message: string): Promise<boolean> {
  const answer = await confirm({ message, initialValue: false });
  return !isCancel(answer) && answer === true;
}

/** Ask whether orch may write its packaged skills into the user's harness directories,
 *  defaulting to YES. Copying files into `~/.claude` and `~/.agents` is the user's call,
 *  so a declined or cancelled prompt records the refusal rather than installing anyway. */
async function askSkillsConsent(roots: readonly string[], recorded: boolean): Promise<boolean> {
  const answer = await confirm({
    message: `Install orch's skills (${packagedSkillNames().join(", ")}) into ${roots.join(" and ")}?`,
    initialValue: recorded,
  });
  return !isCancel(answer) && answer === true;
}

/** Resolve skills consent from `--skills`/`--no-skills`, the prompt, or what is already
 *  recorded, then write every packaged skill into the configured roots when allowed. */
async function offerSkills(
  args: string[],
  interactive: boolean,
  ask: (roots: readonly string[], recorded: boolean) => Promise<boolean> = askSkillsConsent,
): Promise<void> {
  // A build that packaged no skills has nothing to consent to; asking would offer an
  // empty list and then write nothing.
  if (!packagedSkillNames().length) return;
  const { install: recorded, roots } = loadSettings(orchDir()).skills;
  const forced = args.includes("--skills") ? true : args.includes("--no-skills") ? false : undefined;
  const install = forced ?? (interactive ? await ask(roots, recorded) : recorded);
  writeSettingsSkills(orchDir(), { install });
  process.stdout.write("Skills:\n");
  if (!install) {
    process.stdout.write("  not installed - turn it back on with: orch settings skills --install\n");
    return;
  }
  for (const written of installSkills(roots)) process.stdout.write(`  ${written}\n`);
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

async function initializeSetup(options: SetupOptions): Promise<void> {
  // Before the first prompt, and for every harness rather than the ones about to be picked:
  // the registry queries then run under the whole wizard instead of stalling the model step.
  if (options.refresh) await refreshAdapterCatalogues();
  else warmAdapterCatalogues();
  if (options.interactive) setupIntro();

  // setup is the ONE recovery path: a settings.json from an older schema (or otherwise invalid)
  // is malformed data, not something to migrate — reap it so re-recording can proceed.
  const reaped = reapUnreadableSettings(orchDir());
  if (reaped) process.stdout.write(`  previous settings.json was unreadable (older schema or invalid values) - moved aside to ${reaped}, re-recording from scratch\n`);
}

async function installSetupComposition(composition: SetupComposition, options: SetupOptions, args: string[]): Promise<string[] | null> {
  recordComposition(composition.runtime, composition.adapters, composition.defaultAdapter, composition.backends, composition.defaultBackend, composition.models);
  if (!(await installPrerequisites(composition.adapters, composition.backends, options.interactive, options.yes, options.noInstall))) return null;
  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);
  const gaps = await installAdapterShims(composition.adapters, options.copy);
  await offerSkills(args, options.interactive);
  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (options.interactive) await configureNotifiers();
  wireBinaries(options.copy);
  alignEntrypointToRuntime(composition.runtime);
  await diagnoseAdapters(composition.adapters);
  return gaps;
}

async function diagnoseAdapters(adapters: readonly AdapterId[]): Promise<void> {
  // Validate each selected (installed) adapter through its own provider port.
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (!adapter.shim) continue;
    const result = await adapter.shim.diagnoseShim();
    process.stdout.write(`  ${result.status.toUpperCase()} ${result.label}: ${result.detail}\n`);
  }
}

async function runDoctorPass(interactive: boolean): Promise<CheckResult[]> {
  process.stdout.write("Running doctor checks...\n");
  let doctorResults = await runDoctor(orchDir());
  // Re-run after a reap so the passed/total count reflects the reaped records, not the pre-reap state.
  if (await offerReapMalformedRecords(doctorResults, interactive)) doctorResults = await runDoctor(orchDir());
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  return doctorResults;
}

async function finishSetup(options: SetupOptions, gaps: readonly string[]): Promise<void> {
  if (gaps.length) {
    process.stdout.write("Setup incomplete:\n" + gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }
  // Closing smoke round-trip reports its verdict but never gates setup's exit code.
  if (options.interactive && !options.noSmoke) {
    const blocker = smokeBlocker();
    if (blocker) process.stdout.write(`Smoke test skipped - ${blocker}.\n`);
    else {
      process.stdout.write("Smoke test - verifying orch can deliver work (headless spawn on a prompt + result)...");
      await runSetupSmoke(process.cwd());
    }
  } else if (!options.interactive) {
    process.stdout.write("Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.\n");
  } else {
    process.stdout.write("Smoke test skipped (--no-smoke).\n");
  }
  const doneMessage = "Done. Open a plexer workspace and try: orch spawn 2 --tab Team1";
  if (options.interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Onboarding wizard: record the composition, install prerequisites and adapter shims, wire bins,
 * then run a closing doctor pass. Each step is a single-purpose helper; this orchestrates them. */
export async function cmdSetup(args: string[]) {
  const options = parseSetupOptions(args);
  await initializeSetup(options);

  const composition = await resolveSetupComposition(options);
  if (composition === null) return;
  const gaps = await installSetupComposition(composition, options, args);
  if (gaps === null) return;

  await runDoctorPass(options.interactive);
  await finishSetup(options, gaps);
}

/** Interactive notifier onboarding: probe all notifiers, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
async function configureNotifiers(): Promise<void> {
  const choices = await probeNotifiers();
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
    commandLogger().warn("setup.notifier-missing-fields", { notifier: error.id, missing: error.missing.join(", ") });
    process.stdout.write(`  notifier ${error.id}: missing required fields - ${error.missing.join(", ")}\n`);
  }
  if (result.entries.length) {
    writeSettingsNotify(orchDir(), result.entries);
    process.stdout.write(`  recorded ${result.entries.length} notifier(s): ${result.entries.map((entry) => entry.id).join(", ")}\n`);
  }
}

/** The plain-language line for a command that needs a recorded setup when there is no TTY to walk
 * the wizard on. Names what is missing, the file, and the exact command that fixes it — a refusal
 * to proceed is communicated, never thrown as a stack trace. */
export function setupRequiredMessage(): string {
  // The accepted ids are compile-time constants, so the message lists them rather than printing
  // <id> and leaving the reader to go find them.
  return `orch is not set up yet - no harness/backend recorded in ${settingsPath(orchDir())}.\n`
    + `Run: orch setup\n`
    + `Non-interactive: orch setup --yes --agent <${ADAPTER_IDS.join("|")}> `
    + `--backend <${BACKEND_IDS.join("|")}> [--runtime ${ORCH_RUNTIMES.join("|")}]`;
}

/** Walk the first run through the setup wizard, then dispatch the original command via the injected dispatcher. */
export async function runFirstTimeSetup(argv: string[], dispatch: (argv: string[]) => void): Promise<void> {
  process.stdout.write("First run - no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup([]);
  // A cancelled wizard records nothing, so the original command must not run.
  // `process.exitCode`, never `process.exit()`: exiting truncates whatever the
  // wizard already wrote (src/commands/index.ts:272 states the same rule).
  if (compositionUnrecorded()) {
    process.exitCode = 1;
    return;
  }
  dispatch(argv);
}
