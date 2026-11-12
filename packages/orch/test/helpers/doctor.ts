import type { OrchDir } from "../../src/types/core.ts";
import { runDoctor } from "../../src/daemon/server/doctor/runner.ts";
import type { CheckResult } from "../../src/types/doctor.ts";
import type { PipesProvider } from "../../src/types/pipes.ts";
import { fakePipes } from "./fake-pipes.ts";
import { testDaemonServices } from "./services.ts";

/** runDoctor with a test logger and no socket bound: doctor tests exercise the runner, never
 *  the logger or a live orchd. Bindings start on fake pipes unless a test supplies its own. */
export function runTestDoctor(orchDir: OrchDir, pipes: PipesProvider = fakePipes().provider): Promise<CheckResult[]> {
  return runDoctor({ ...testDaemonServices({ orchDir }), socket: null, pipes });
}
