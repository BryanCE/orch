Found 0 warnings and 0 errors.
Finished in 13.7s on 190 files with 65 rules using 8 threads.
src/setup/notifiers.ts(88,31): error TS2322: Type 'unknown' is not assignable to type 'string'.
src/setup/notifiers.ts(93,31): error TS2322: Type 'string | string[]' is not assignable to type 'string | [string, ...string[]]'.
  Type 'string[]' is not assignable to type 'string | [string, ...string[]]'.
    Type 'string[]' is not assignable to type '[string, ...string[]]'.
      Source provides no match for required element at position 0 in target.
test/owner-scoping.test.ts(36,39): error TS2339: Property 'ORCH_OWNER' does not exist on type '{ ORCH_DIR: string; NODE_ENV?: string | undefined; TZ?: string | undefined; }'.
test/owner-scoping.test.ts(37,12): error TS2339: Property 'ORCH_OWNER' does not exist on type '{ ORCH_DIR: string; NODE_ENV?: string | undefined; TZ?: string | undefined; }'.
test/owner-scoping.test.ts(82,35): error TS2741: Property 'group' is missing in type '{ backend: Backend<unknown>; adapter: never; adapterId: string; name: string; cwd: string; workspace: string; model: null; }' but required in type 'TabSpawnSpec'.
test/owner-scoping.test.ts(116,5): error TS2322: Type '() => { handle: string; }[]' is not assignable to type '(() => BackendTarget<unknown>[]) & (() => { handle: string; }[])'.
  Type '() => { handle: string; }[]' is not assignable to type '() => BackendTarget<unknown>[]'.
    Type '{ handle: string; }[]' is not assignable to type 'BackendTarget<unknown>[]'.
      Type '{ handle: string; }' is missing the following properties from type 'BackendTarget<unknown>': workspace, group, groupLabel, name, and 4 more.
test/worker-tools.test.ts(5,60): error TS2741: Property 'daemon' is missing in type '{ runtime: "node"; installed: { adapters: never[]; backends: never[]; }; locked_commands: never[]; defaults: { worktree: false; }; fleet: { worker_peer_tools: boolean; spawn_cap: number; cross_workspace: false; workspace_caps: {}; }; ... 5 more ...; workspaces: {}; }' but required in type 'OrchConfig'.
