## 1. Settings-file check exports

- Exported signatures:
  ```ts
  export async function checkSpawnLimits(settings: OrchSettings | null): Promise<CheckResult>
  export async function checkCommandLocks(settings: OrchSettings | null, gatesCommands: (adapterId: string) => boolean): Promise<CheckResult>
  export async function checkSettingsFile(orchDir: OrchDir): Promise<CheckResult>
  export function isDrvFsPath(resolved: string): boolean
  export async function checkOrchDirLocation(orchDir: OrchDir): Promise<CheckResult>
  export async function checkWorktreeProvider(settings: OrchSettings | null): Promise<CheckResult>
  export async function checkWorktreeGitignore(settings: OrchSettings | null): Promise<CheckResult>
  ``` (packages/orch/src/daemon/server/doctor/settings-file.ts:16-132)
- The locked-command count is:
  ```ts
  const count = settings === null ? 0 : settings.locked_commands.commands.length +settings.gated_commands.length;
  ``` (packages/orch/src/daemon/server/doctor/settings-file.ts:34)
- `process.cwd()` use:
  ```ts
  const worktrees = path.join(process.cwd(), directory);
  ``` (packages/orch/src/daemon/server/doctor/settings-file.ts:127)

## 2. CLI to orchd

- `cmdDoctor` in `packages/orch/src/commands/doctor.ts` calls exported `askDoctor`; that function asks orchd through `askDaemon`:
  ```ts
  export function askDoctor(services: DaemonClient, params: ParamsOf<"doctor">): Promise<ResultOf<"doctor">> {
    return askDaemon(services, "doctor", params, timeoutMs(services, "machine_ms"));
  }
  ``` (packages/orch/src/commands/doctor.ts:20-21; cmdDoctor call at :60)
- RPC method is `doctor`; request schema:
  ```ts
  doctor: z.object({ fix: z.boolean(), only: z.array(nonBlank).optional() }),
  ``` (packages/orch/src/daemon/client/protocol.ts:691)
- orchd routes to `doctorRun`, then calls `runDoctor` and the check is run there:
  ```ts
  export async function doctorRun(state: DaemonState, params: ParamsOf<"doctor">): Promise<ResultOf<"doctor">> {
    const { orchDir, logger, models } = state.services;
    const run = (): Promise<CheckResult[]> => runDoctor({ orchDir, logger, models, socket: state.server?.transport ?? null, pipes: state.pipes });
  ``` (packages/orch/src/daemon/server/handlers/machine.ts:17-19)
  ```ts
  isolated("settings", "Settings validity", () => checkSettingsFile(orchDir)),
  ``` (packages/orch/src/daemon/server/doctor/runner.ts:140)

## 3. Finding shape and invalid-value example

- Check result type:
  ```ts
  export interface CheckResult {
    id: string;
    label: string;
    status: CheckStatus;
    detail: string;
    fix?: FixDescriptor;
    backends?: DoctorBackendReport[];
    ignoredRecords?: IgnoredPresenceRecord[];
  }
  ``` (packages/orch/src/types/doctor.ts:29-37)
- Existing invalid-value check (`checkHarnessModels`) returns a fail finding when the recorded model is not among offered models:
  ```ts
  if (!offered.some((model) => model.spec === bare)) {
    return { id, label, status: "fail", detail: `recorded default ${bare} is not among the ${offered.length} models ${harness} now offers - run: ${repickCommand(harness)}` };
  }
  ``` (packages/orch/src/daemon/server/doctor/models.ts:26-28)

## 4. First settings-defects test

- The first test builds a temporary orch directory via `tempDir()` (which calls `tempOrchDir` and tracks it for cleanup), then passes that directory directly to `checkSettingsFile` and expects the absent-settings result:
  ```ts
  test("accepts an absent settings file", async () => {
    const directory = tempDir();

    expect(await checkSettingsFile(directory)).toEqual({
      id: "settings",
      label: "Settings validity",
      status: "ok",
      detail: "no settings.json",
    });
  });
  ``` (packages/orch/test/doctor-settings-defects.test.ts:26-35)
