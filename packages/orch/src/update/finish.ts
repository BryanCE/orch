import { applySafeFixes, runDoctor } from "../doctor/runner.ts";
import { ensureDaemonOrWarn } from "../daemon/client/reach.ts";
import { settingsRepair } from "../settings/auto-repair.ts";
import { closeAllStores, orm } from "../store/connection.ts";
import { errorMessage } from "../util.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { Services } from "../types/services.ts";

export interface FinishFailure {
  readonly kind: "failed";
  readonly step: "settings" | "store";
  readonly reason: string;
}
export type FinishReport =
  | {
      readonly kind: "finished";
      readonly settingsChanges: readonly string[];
      /** Doctor fixes applied (non-destructive only, as doctor -y applies). */
      readonly fixes: readonly string[];
      /** Doctor rows still `fail` after the fixes: reported, never a rollback (they are environmental). */
      readonly failing: readonly { readonly label: string; readonly detail: string }[];
    }
  | FinishFailure;

export type FinishServices = Pick<Services, "orchDir" | "logger" | "models" | "settings">;

export interface FinishSteps {
  readonly doctor: (services: FinishServices) => Promise<CheckResult[]>;
  readonly startDaemon: (services: FinishServices) => Promise<void>;
}

export const FINISH_STEPS: FinishSteps = {
  doctor: (services) => runDoctor(services, {}),
  startDaemon: (services) => ensureDaemonOrWarn(services.orchDir, services.logger),
};

export async function finishUpdate(services: FinishServices, steps: FinishSteps = FINISH_STEPS): Promise<FinishReport> {
  let settingsChanges: readonly string[] = [];
  try {
    const repair = settingsRepair(services.settings);
    switch (repair.plan.kind) {
      case "clean":
        break;
      case "repair":
        repair.apply();
        settingsChanges = repair.plan.changes;
        break;
      case "unrepairable":
        return { kind: "failed", step: "settings", reason: repair.plan.reason };
      default: {
        const exhaustive: never = repair.plan;
        return exhaustive;
      }
    }
    services.settings.reload();
  } catch (error: unknown) {
    return { kind: "failed", step: "settings", reason: errorMessage(error) };
  }

  try {
    orm(services.orchDir);
    closeAllStores();
  } catch (error: unknown) {
    return { kind: "failed", step: "store", reason: errorMessage(error) };
  }

  const initial = await steps.doctor(services);
  const fixes = applySafeFixes(initial).applied;
  const checked = await steps.doctor(services);
  const failing = checked
    .filter((result) => result.status === "fail")
    .map(({ label, detail }) => ({ label, detail }));
  await steps.startDaemon(services);
  return { kind: "finished", settingsChanges, fixes, failing };
}
