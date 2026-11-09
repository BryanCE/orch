import { confirm, isCancel } from "@clack/prompts";
import { reapUnreadableSettings } from "../settings/read.ts";
import { automaticSettingsRepair } from "../settings/auto-repair.ts";
import { settingsPath } from "../settings/schema.ts";
import { writeSettingsNotify, writeSettingsSkills } from "../settings/write.ts";
import { ORCH_RUNTIMES } from "../runtime.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { promptText } from "../setup/io.ts";
import { buildSelectedNotifyEntries, type NotifierSelection } from "../setup/notifiers.ts";
import { describeSkillPlacement, installSkills, packagedSkillNames, type SkillRoots } from "../setup/skills.ts";
import { chooseInstalls, setupIntro, setupOutro, selectNotifiers } from "../setup/wizard.ts";
import type { Services } from "../types/services.ts";
import { compositionUnrecorded, resolveSetupComposition, recordComposition } from "../setup/composition.ts";
import type { SetupComposition } from "../setup/composition.ts";
import { parseSetupOptions } from "../setup/flags.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import type { SetupOptions } from "../setup/flags.ts";
import { countOf, errorMessage } from "../util.ts";
import { runSetupSmoke } from "../setup/smoke.ts";
import { askDaemon } from "./daemon.ts";
import { askDoctor } from "./doctor.ts";
import { setupProbes, timeoutMs } from "./machine.ts";
import type { CheckFinding } from "../types/doctor.ts";
import type { OrchDir } from "../types/core.ts";


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
  forced: boolean | undefined,
  interactive: boolean,
  ask: (roots: SkillRoots, recorded: boolean) => Promise<boolean> = askSkillsConsent,
): Promise<void> {
  // A build that packaged no skills has nothing to consent to; asking would offer an
  // empty list and then write nothing.
  if (!packagedSkillNames().length) return;
  const { install: recorded, store, link } = services.settings.current().skills;
  const roots = { store, link };
  const install = forced ?? (interactive ? await ask(roots, recorded) : recorded);
  writeSettingsSkills(services.settings, { install });
  process.stdout.write("Skills:\n");
  if (!install) {
    process.stdout.write("  not installed - turn it back on with: orch settings skills --skills\n");
    return;
  }
  for (const placed of installSkills(roots)) process.stdout.write(`  ${describeSkillPlacement(placed)}\n`);
}

/** Surface the reappable malformed presence records the closing doctor pass found and, on a TTY,
 * offer to reap them (default: keep) — so setup resolves what it can rather than reporting it as a
 * post-setup failure (11.2). Non-interactive runs report only. orchd reaps them, through the check's
 * own fix. Returns the doctor pass after the reap, or null when nothing was reaped. */
async function offerReapMalformedRecords(
  services: Services,
  results: readonly CheckFinding[],
  interactive: boolean,
  askConfirm: (count: number) => Promise<boolean> = (count) => promptConfirm(`Reap ${countOf(count, "malformed presence record")} now?`),
): Promise<CheckFinding[] | null> {
  const malformed = results.find((result) => result.id === "malformed-presence");
  const records = malformed?.ignoredRecords ?? [];
  if (!malformed || !records.length) return null;
  process.stdout.write(
    `Malformed presence records (${records.length}):\n` +
    records.map((record) => `  - ${record.path}: ${record.reason}`).join("\n") + "\n",
  );
  if (!interactive || !(await askConfirm(records.length))) {
    process.stdout.write("  kept - orch clean can reap them later\n");
    return null;
  }
  const { results: after } = await askDoctor(services, { fix: true, only: [malformed.id] });
  process.stdout.write(`  reaped ${countOf(records.length, "record")}\n`);
  return after;
}

/** Print the lines orchd wrote for one setup step. */
function printLines(lines: readonly string[]): void {
  for (const line of lines) process.stdout.write(`${line}\n`);
}

async function initializeSetup(options: SetupOptions, services: Services): Promise<void> {
  // Before the first prompt: the model step reads what orchd's catalogues hold, so a refresh
  // asks every harness again now instead of stalling that step.
  if (options.refresh) await askDaemon(services, "catalogue-refresh", undefined, timeoutMs(services, "machine_ms"));
  if (options.interactive) setupIntro();

  // A reinstall moves the person forward onto the current shape: every key this build cannot read
  // is renamed, set, or dropped to its default, and everything it can read stays. Only a file no
  // repair can mend (bad JSON) is moved aside so re-recording can proceed.
  const repair = automaticSettingsRepair(services.settings);
  if (repair) {
    try {
      repair.apply();
      process.stdout.write(`  repaired settings.json for this orch:\n${repair.changes.map((change) => `    ${change}\n`).join("")}`);
    } catch (error: unknown) {
      process.stdout.write(`  could not repair settings.json: ${errorMessage(error)}\n`);
    }
  }
  const reaped = reapUnreadableSettings(services.orchDir);
  if (reaped) process.stdout.write(`  previous settings.json was unreadable (older schema or invalid values) - moved aside to ${reaped}, re-recording from scratch\n`);
}

/** Probe the selected providers' binaries in orchd, then have it install the chosen missing ones:
 *  all with --install, none with --no-install, else the multiselect on a TTY. Returns false only
 *  when that multiselect is cancelled, so the caller can abort. */
async function installPrerequisites(services: Services, composition: SetupComposition, options: SetupOptions): Promise<boolean> {
  process.stdout.write("Prerequisites:\n");
  const { adapters, backends } = composition;
  const probe = await askDaemon(services, "setup-prerequisites", { adapters, backends }, timeoutMs(services, "machine_ms"));
  printLines(probe.lines);
  const { missing } = probe;
  let bins: string[];
  if (options.install === true) bins = missing.map(({ bin }) => bin);
  else if (missing.length && options.install === undefined && options.interactive) {
    const picked = await chooseInstalls(missing);
    if (picked === null) return false;
    for (const { bin, cmd } of missing)
      if (!picked.includes(bin)) process.stdout.write(`  skipped ${bin} - install later with: ${cmd}\n`);
    bins = picked;
  } else {
    for (const { bin, cmd } of missing) process.stdout.write(`  install ${bin}: ${cmd}\n`);
    bins = [];
  }
  if (!bins.length) return true;
  const installed = await askDaemon(services, "setup-install", { adapters, backends, bins }, timeoutMs(services, "machine_ms"));
  printLines(installed.lines);
  return true;
}

/** What integrating left undone: the gaps, and why a smoke cannot run here. */
interface Integration {
  readonly gaps: readonly string[];
  readonly smokeBlocker: string | null;
}

async function installSetupComposition(services: Services, composition: SetupComposition, options: SetupOptions): Promise<Integration | null> {
  recordComposition(services.settings, composition.runtime, composition.adapters, composition.defaultAdapter, composition.backends, composition.defaultBackend, composition.models);
  if (!(await installPrerequisites(services, composition, options))) return null;
  const integrated = await askDaemon(services, "setup-integrate", { adapters: composition.adapters, runtime: composition.runtime, copy: options.copy }, timeoutMs(services, "machine_ms"));
  printLines(integrated.lines);
  await offerSkills(services, options.skills, options.interactive);
  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (options.interactive) await configureNotifiers(services);
  return { gaps: integrated.gaps, smokeBlocker: integrated.smokeBlocker };
}

async function runDoctorPass(services: Services, interactive: boolean): Promise<void> {
  process.stdout.write("Running doctor checks...\n");
  let { results } = await askDoctor(services, { fix: false });
  // Re-run after a reap so the passed/total count reflects the reaped records, not the pre-reap state.
  results = await offerReapMalformedRecords(services, results, interactive) ?? results;
  process.stdout.write(`Doctor: ${results.filter((result) => result.status === "ok" || result.status === "skip").length}/${results.length} checks passed\n`);
}

async function finishSetup(services: Services, options: SetupOptions, integration: Integration): Promise<void> {
  if (integration.gaps.length) {
    process.stdout.write("Setup incomplete:\n" + integration.gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }
  // The smoke spawns a real agent and spends real tokens, so it runs only when asked for.
  if (options.smoke) {
    if (integration.smokeBlocker) process.stdout.write(`Smoke test skipped - ${integration.smokeBlocker}.\n`);
    else {
      process.stdout.write("Smoke test - verifying orch can deliver work (headless spawn on a prompt + result)...");
      await runSetupSmoke(services, process.cwd());
    }
  }
  const doneMessage = "Done. Try: orch spawn <name>... --tab <tab>";
  if (options.interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Onboarding wizard: record the composition, then have orchd install prerequisites and adapter
 * shims and wire bins, then run a closing doctor pass. The prompts are the CLI's; every step that
 * acts on this machine runs in orchd. */
export async function cmdSetup(services: Services, args: string[]) {
  const invocation = parseCommand("setup", args);
  if (invocation.positional.length) throw usageError(invocation, `orch setup takes no arguments, got ${invocation.positional.join(" ")}`);
  const options = parseSetupOptions(invocation.flags);
  await initializeSetup(options, services);

  // `currentOrNull`: setup is the command that writes settings.json, so an absent file is the
  // normal first-run state here, never a refusal.
  const composition = await resolveSetupComposition(services.settings.currentOrNull(), setupProbes(services), options);
  if (composition === null) return;
  const integration = await installSetupComposition(services, composition, options);
  if (integration === null) return;

  await runDoctorPass(services, options.interactive);
  await finishSetup(services, options, integration);
}

/** Interactive notifier onboarding: probe all notifiers in orchd, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
async function configureNotifiers(services: Services): Promise<void> {
  const { choices } = await askDaemon(services, "notifier-probe", undefined, timeoutMs(services, "machine_ms"));
  if (!choices.length) return;
  const picked = await selectNotifiers(choices);
  if (!picked?.length) return;
  const selections: NotifierSelection[] = [];
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
    selections.push({ id, requiredFields: choice.requiredFields, config });
  }
  const result = buildSelectedNotifyEntries(selections);
  for (const error of result.errors) {
    services.logger.warn("setup.notifier-missing-fields", { notifier: error.id, missing: error.missing.join(", ") });
    process.stdout.write(`  notifier ${error.id}: missing required fields - ${error.missing.join(", ")}\n`);
  }
  if (result.entries.length) {
    writeSettingsNotify(services.settings, result.entries);
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
    + `Non-interactive: orch setup --yes --harness <${ADAPTER_IDS.join("|")}> `
    + `--plexer <${BACKEND_IDS.join("|")}> [--runtime ${ORCH_RUNTIMES.join("|")}]`;
}

/** Walk the first run through the setup wizard, then dispatch the original command via the injected dispatcher. */
export async function runFirstTimeSetup(services: Services, argv: string[], dispatch: (argv: string[]) => void): Promise<void> {
  process.stdout.write("First run - no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup(services, []);
  // A cancelled wizard records nothing, so the original command must not run.
  // `process.exitCode`, never `process.exit()`: exiting truncates whatever the
  // wizard already wrote (src/commands/index.ts:272 states the same rule).
  if (compositionUnrecorded(services.settings.currentOrNull())) {
    process.exitCode = 1;
    return;
  }
  dispatch(argv);
}
