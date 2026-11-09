import type { OrchDir } from "../../src/types/core.ts";
import { runDoctor } from "../../src/daemon/server/doctor/runner.ts";
import type { CheckResult } from "../../src/types/doctor.ts";
import { testDaemonServices } from "./services.ts";

/** runDoctor with a test logger and no socket bound: doctor tests exercise the runner, never
 *  the logger or a live orchd. */
export function runTestDoctor(orchDir: OrchDir): Promise<CheckResult[]> {
  return runDoctor({ ...testDaemonServices({ orchDir }), socket: null });
}
