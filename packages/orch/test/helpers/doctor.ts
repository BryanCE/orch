import { runDoctor } from "../../src/doctor/runner.ts";
import type { CheckResult, DoctorOptions, SshRunner } from "../../src/types/doctor.ts";
import { testServices } from "./services.ts";

/** runDoctor with a test logger: doctor tests exercise the runner, never the logger. */
export function runTestDoctor(orchDir: string, options: SshRunner | DoctorOptions = {}): Promise<CheckResult[]> {
  return runDoctor(orchDir, testServices({ orchDir }).logger, options);
}
