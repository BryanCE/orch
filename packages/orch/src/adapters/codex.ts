import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { errnoCode, errorMessage, isRecord, packageRoot, reinstallCommand, shellQuote } from "../util.ts";
import { declaredRuntime } from "../settings/read.ts";

import { codexNotifyArgv, codexNotifyShimPath, editCodexNotifyConfig } from "./codex-notify.ts";
import { detectCodexState, extractCodexResult, readCodexSessionView } from "./codex-events.ts";
import { modelFlag, shimRole, type AgentState } from "./adapter.ts";
import { HARNESS_SESSION_ENV } from "./session-env.ts";
import type { AdapterCommand, AgentAdapter, CodexResultExtractionInput, HarnessModel, SessionView, SessionViewInput, ShimInstallOpts, SpawnOpts, StateDetectionInput, SteerRequest } from "../types/adapter.ts";
import type { CheckResult, FixDescriptor } from "../types/doctor.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

const CODEX_MODELS_CACHE = join(homedir(), ".codex", "models_cache.json");

/** codex caches its model catalogue as `{ models: [{ slug, display_name }] }`; that
 *  shape is codex's and lives only here. */
function codexCachedModels(): { slug?: unknown; display_name?: unknown }[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(CODEX_MODELS_CACHE, "utf8"));
    return isRecord(parsed) && Array.isArray(parsed.models) ? parsed.models.filter(isRecord) : [];
  } catch {
    return [];
  }
}

/**
 * Wire the orch notify shim into `~/.codex/config.toml`'s top-level `notify`
 * key (D2a fallback). A cleaner per-spawn `-c notify=[...]` override exists on
 * current Codex CLI versions (`-c key=value` overlays ConfigToml) and needs no
 * global-config write at all, but wiring it requires changing every codex
 * spawn command (`interactiveCmd`/`headlessCmd`), which is out of scope here;
 * this fallback covers `orch setup` and any codex session not launched
 * through orch's own argv. Never overwrites a foreign value (law #5).
 */
function installCodexNotifyShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger, root: string): void {
  const shim = codexNotifyShimPath(root);
  // The DECLARED runtime, never the first one that happens to be on PATH — PATH order
  // is exactly how an install silently ends up running under something it never chose.
  const runtime = declaredRuntime(settings);
  const argv = codexNotifyArgv(shim, runtime, { orchDir });
  const codexDir = join(homedir(), ".codex");
  const configPath = join(codexDir, "config.toml");

  let raw = "";
  if (existsSync(configPath)) {
    try {
      raw = readFileSync(configPath, "utf8");
    } catch (error: unknown) {
      logger.warn("codex.notify-config-read-failed", { path: configPath, error: errorMessage(error) });
      process.stdout.write(`  warning: could not read ${configPath}; Codex notify not changed (${errorMessage(error)})\n`);
      return;
    }
  }

  const edit = editCodexNotifyConfig(raw, argv);
  if (edit.status === "ambiguous") {
    logger.warn("codex.notify-config-ambiguous", { path: configPath });
    process.stdout.write(`  warning: could not read the top-level notify key in ${configPath}; Codex notify not changed\n`);
    return;
  }
  if (edit.status === "foreign") {
    logger.warn("codex.notify-foreign", { path: configPath, value: edit.foreignValue });
    process.stdout.write(
      `  warning: ${configPath} already has a non-orch notify program (${edit.foreignValue}); leaving it - `
      + "codex notify presence is disabled (headless session-tail parsing still works)\n",
    );
    return;
  }
  if (edit.status === "unchanged") {
    process.stdout.write(`Codex notify: already configured (${runtime}) in ${configPath}\n`);
    return;
  }
  mkdirSync(codexDir, { recursive: true });
  writeFileSync(configPath, edit.text);
  process.stdout.write(`Codex notify: ${edit.status === "inserted" ? "added" : "updated"} (${runtime}) in ${configPath}\n`);
  if (!existsSync(shim)) {
    logger.warn("codex.shim-missing", { path: shim });
    process.stdout.write(`  warning: ${shim} is missing from the install; fix: ${reinstallCommand()}\n`);
  }
}

/** Codex CLI adapter using notify completion events and resume-based steering. */
export class CodexAdapter implements AgentAdapter {
  readonly id = "codex" as const;

  /** Codex exports its session pid, which doubles as its session marker. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.codex.marker;
  readonly sessionPidEnv = HARNESS_SESSION_ENV.codex.sessionPid;

  readonly thinking = null;
  readonly workerLaunch = null;
  readonly modelControl = null;
  readonly lifecycleControl = null;
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = null;
  readonly shim = shimRole(this);
  readonly defaultModel = null;
  readonly models = { listModels: (): readonly HarnessModel[] => this.listModels() };
  readonly modelWarm = null;
  readonly bridge = null;
  readonly presenceRegistration = null;
  readonly commandGate = false;

  /** Marker consumed by callers that render heuristic states with a dagger. */
  readonly stateFallback = true;

  interactiveCmd(opts: SpawnOpts): string {
    const command = ["codex"];
    if (opts.model) command.push("--model", shellQuote(opts.model));
    return command.join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return ["codex", ...modelFlag(opts)];
  }

  /** Run Codex's documented JSON event stream in a detached process. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return ["codex", "exec", "--json", ...modelFlag(opts), prompt];
  }

  detectState(input: StateDetectionInput): AgentState {
    return detectCodexState(input);
  }

  /** Resume a headless session; callers may set CODEX_INTERACTIVE=1 for a pane continuation. */
  steer(request: SteerRequest): AdapterCommand {
    const sessionId = request.opts?.env?.CODEX_SESSION_ID ?? request.key;
    const interactive = request.opts?.env?.CODEX_INTERACTIVE === "1";
    return {
      argv: interactive
        ? ["codex", "resume", sessionId, request.text]
        : ["codex", "exec", "resume", sessionId, request.text],
    };
  }

  /** Read codex's own cached catalogue; codex names models by bare slug, never provider/id. */
  listModels(): readonly HarnessModel[] {
    return codexCachedModels().flatMap((model) => typeof model.slug === "string" && model.slug
      ? [{ spec: model.slug, ...(typeof model.display_name === "string" ? { label: model.display_name } : {}) }]
      : []);
  }

  extractResult(input: CodexResultExtractionInput): string | undefined {
    return extractCodexResult(input);
  }

  readSessionView(input: SessionViewInput): SessionView | undefined {
    return readCodexSessionView(input.sessionPath);
  }

  /** Repairing codex's notify wiring IS reinstalling it — installShim is idempotent. */
  private reinstallFix(orchDir: OrchDir, settings: OrchSettings, logger: Logger): FixDescriptor {
    return { description: "register orch's codex notify shim", apply: () => { this.installShim(orchDir, settings, logger); } };
  }

  /** Verify the top-level notify artifact written by installShim. */
  diagnoseShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger): CheckResult {
    const configPath = join(homedir(), ".codex", "config.toml");
    const shim = codexNotifyShimPath(packageRoot());
    if (!existsSync(shim)) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `${shim} is missing from the install; fix: ${reinstallCommand()}` };
    let raw: string;
    try { raw = readFileSync(configPath, "utf8"); }
    catch (error: unknown) {
      if (errnoCode(error) === "ENOENT") return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `missing ${configPath}`, fix: this.reinstallFix(orchDir, settings, logger) };
      return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `could not read ${configPath}` };
    }
    const line = raw.split(/\r?\n/).find((entry) => /^\s*notify\s*=/.test(entry));
    if (!line) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `missing notify in ${configPath}`, fix: this.reinstallFix(orchDir, settings, logger) };
    if (!line.includes("codex-notify")) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `foreign notify in ${configPath}; orch notify is disabled` };
    return { id: "codex-notify", label: "Codex notify shim", status: "ok", detail: `Codex notify shim is current (${shim})` };
  }

  /** Register the orch notify shim as codex's completion writer (D2/D2a). */
  installShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger, _opts?: ShimInstallOpts): void {
    installCodexNotifyShim(orchDir, settings, logger, packageRoot());
  }
}

/** Shared Codex adapter instance for command wiring. */
export const codexAdapter = new CodexAdapter();
