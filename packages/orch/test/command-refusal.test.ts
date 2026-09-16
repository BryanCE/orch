import { orchDirAt } from "../src/services.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdRuns } from "../src/commands/runs.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { errorMessage } from "../src/util.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { servedServices } from "./helpers/daemon-state.ts";

const SETTINGS = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const previous: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
  if (previous === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previous;
});

/** A temp orch dir with orchd served in-process: the command resolves its target through the daemon. */
function fixture(): Promise<Services> {
  const dir = tempOrchDir("orch-refusal-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, SETTINGS);
  return servedServices({ orchDir: dir, settings: SETTINGS }, servers);
}

// A command that refuses by calling process.exit() cannot be tested and cannot be
// composed: inside `bun test` it kills the RUNNER, so every test file after it is
// silently never run and the suite reports no summary at all. That is how a whole
// suite can look green while most of it never executed. A refusal is a value the
// boundary turns into an exit code, never an exit from the middle of the program.
describe("a command refusal is thrown, not exited", () => {
  test("an unresolvable target throws a CommandRefusal instead of killing the process", async () => {
    const refusal = await cmdRuns(await fixture(), ["absentag01", "--json"]).then(() => null, (error: unknown) => error);
    expect(refusal).toBeInstanceOf(CommandRefusal);
  });

  test("the refusal carries the reason a human needs", async () => {
    const refusal = await cmdRuns(await fixture(), ["absentag01", "--json"]).then(() => null, (error: unknown) => errorMessage(error));
    expect(refusal).toMatch(/No target matches/);
  });
});
