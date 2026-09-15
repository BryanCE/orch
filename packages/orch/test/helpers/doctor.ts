import type { OrchDir } from "../../src/types/core.ts";
import { runDoctor } from "../../src/doctor/runner.ts";
import type { CheckResult, DoctorOptions } from "../../src/types/doctor.ts";
import { testServices } from "./services.ts";

/** runDoctor with a test logger: doctor tests exercise the runner, never the logger. */
export function runTestDoctor(orchDir: OrchDir, options: DoctorOptions = {}): Promise<CheckResult[]> {
  return runDoctor(testServices({ orchDir }), options);
}
