$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (926 files scanned)
check:bridge | Done in 524ms
tc           | src/backends/herdr/index.ts(154,5): error TS2353: Object literal may only specify known properties, and 'handleFor' does not exist in type 'EnvironmentIdentityRole'.
tc           | src/backends/tmux/index.ts(5,3): error TS2300: Duplicate identifier 'EnvironmentIdentityRole'.
tc           | src/backends/tmux/index.ts(6,3): error TS2300: Duplicate identifier 'LogPruningRole'.
tc           | src/backends/tmux/index.ts(25,3): error TS2300: Duplicate identifier 'EnvironmentIdentityRole'.
tc           | src/backends/tmux/index.ts(26,3): error TS2300: Duplicate identifier 'LogPruningRole'.
tc           | src/backends/tmux/index.ts(107,12): error TS2300: Duplicate identifier 'logPruning'.
tc           | src/backends/tmux/index.ts(119,12): error TS2300: Duplicate identifier 'logPruning'.
tc           | src/backends/tmux/index.ts(119,12): error TS2717: Subsequent property declarations must have the same type.  Property 'logPruning' must be of type 'LogPruningRole | null', but here has type 'null'.
tc           | src/commands/panes.ts(146,29): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/commands/panes.ts(196,49): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/commands/setup.ts(623,28): error TS2339: Property 'handleFor' does not exist on type 'Backend<unknown>'.
tc           | src/commands/spawn.ts(865,15): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/commands/status.ts(611,40): error TS2339: Property 'capabilities' does not exist on type 'Backend<unknown>'.
tc           | src/commands/target.ts(156,18): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/control/dispatch.ts(166,27): error TS2339: Property 'handleFor' does not exist on type 'Backend<unknown>'.
tc           | src/daemon/rpc.ts(760,65): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/doctor/backends.ts(143,26): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | src/doctor/config.ts(29,81): error TS2339: Property 'commandLocks' does not exist on type 'AgentAdapter'.
tc           | src/entities.ts(105,29): error TS2339: Property 'currentIdentity' does not exist on type 'Backend<unknown>'.
tc           | test/adapter-pi.test.ts(69,20): error TS2339: Property 'commandLocks' does not exist on type 'PiAdapter'.
tc           | test/backend-headless.test.ts(97,20): error TS2339: Property 'capabilities' does not exist on type 'HeadlessBackend'.
tc           | test/backend-herdr.test.ts(142,20): error TS2339: Property 'capabilities' does not exist on type 'HerdrBackend'.
tc           | test/backend-tmux.test.ts(190,20): error TS2339: Property 'capabilities' does not exist on type 'TmuxBackend'.
tc           | test/claude-adapter.test.ts(69,26): error TS2339: Property 'commandLocks' does not exist on type 'ClaudeAdapter'.
tc           | test/cli-backends-tmux.test.ts(44,20): error TS2339: Property 'capabilities' does not exist on type 'TmuxBackend'.
tc           | test/codex-adapter.test.ts(31,20): error TS2339: Property 'commandLocks' does not exist on type 'CodexAdapter'.
tc           | Exited with code 1
lint         | 
lint         |   x Identifier `EnvironmentIdentityRole` has already been declared
lint         |    ,-[src/backends/tmux/index.ts:5:3]
lint         |  4 |   Backend,
lint         |  5 |   EnvironmentIdentityRole,
lint         |    :   ^^^^^^^^^^^|^^^^^^^^^^^
lint         |    :              `-- `EnvironmentIdentityRole` has already been declared here
lint         |  6 |   LogPruningRole,
lint         |    `----
lint         |     ,-[src/backends/tmux/index.ts:25:3]
lint         |  24 |   SpaceHomeRole,
lint         |  25 |   EnvironmentIdentityRole,
lint         |     :   ^^^^^^^^^^^|^^^^^^^^^^^
lint         |     :              `-- It can not be redeclared here
lint         |  26 |   LogPruningRole,
lint         |     `----
lint         | 
lint         |   x Identifier `LogPruningRole` has already been declared
lint         |    ,-[src/backends/tmux/index.ts:6:3]
lint         |  5 |   EnvironmentIdentityRole,
lint         |  6 |   LogPruningRole,
lint         |    :   ^^^^^^^|^^^^^^
lint         |    :          `-- `LogPruningRole` has already been declared here
lint         |  7 |   BackendId,
lint         |    `----
lint         |     ,-[src/backends/tmux/index.ts:26:3]
lint         |  25 |   EnvironmentIdentityRole,
lint         |  26 |   LogPruningRole,
lint         |     :   ^^^^^^^|^^^^^^
lint         |     :          `-- It can not be redeclared here
lint         |  27 |   PlexerHome,
lint         |     `----
lint         | 
lint         |   x Identifier `logPruning` has already been declared
lint         |      ,-[src/backends/tmux/index.ts:107:12]
lint         |  106 |   readonly process = new LocalProcessRole();
lint         |  107 |   readonly logPruning: LogPruningRole | null = null;
lint         |      :            ^^^^^|^^^^
lint         |      :                 `-- `logPruning` has already been declared here
lint         |  108 |   private readonly homeExec: (args: string[]) => string;
lint         |  109 | 
lint         |  110 |   constructor(deps: TmuxBackendDeps = {}) {
lint         |  111 |     this.homeExec = deps.homeExec ?? ((args) => execTmux(args));
lint         |  112 |   }
lint         |  113 |   readonly identity: EnvironmentIdentityRole = {
lint         |  114 |     current: (): Identity | null => this.currentIdentity(),
lint         |  115 |   };
lint         |  116 |   // No key -> handle lookup: a pane is addressed by its own handle here.
lint         |  117 |   readonly handleLookup: null = null;
lint         |  118 |   // tmux keeps no logs orch owns.
lint         |  119 |   readonly logPruning: null = null;
lint         |      :            ^^^^^|^^^^
lint         |      :                 `-- It can not be redeclared here
lint         |  120 |   readonly channel = agentChannel;
lint         |      `----
lint         | 
lint         |   x eslint(no-unused-vars): Type 'LogPruningRole' is imported but never used.
lint         |     ,-[src/backends/herdr/index.ts:9:3]
lint         |   8 |   EnvironmentIdentityRole,
lint         |   9 |   LogPruningRole,
lint         |     :   ^^^^^^^|^^^^^^
lint         |     :          `-- 'LogPruningRole' is imported here
lint         |  10 |   BackendId,
lint         |     `----
lint         |   help: Consider removing this import.
lint         | 
lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
lint         |      ,-[src/entities.ts:105:3]
lint         |  104 | export function currentWorkspace(): string | null {
lint         |  105 |   return resolveBackend({}).currentIdentity?.()?.workspace ?? null;
lint         |      :   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/entities.ts:105:50]
lint         |  104 | export function currentWorkspace(): string | null {
lint         |  105 |   return resolveBackend({}).currentIdentity?.()?.workspace ?? null;
lint         |      :                                                  ^^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/entities.ts:105:10]
lint         |  104 | export function currentWorkspace(): string | null {
lint         |  105 |   return resolveBackend({}).currentIdentity?.()?.workspace ?? null;
lint         |      :          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  106 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
lint         |      ,-[src/commands/target.ts:156:3]
lint         |  155 |   const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
lint         |  156 |   return backend.currentIdentity?.()?.workspace ?? null;
lint         |      :   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  157 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/commands/target.ts:156:39]
lint         |  155 |   const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
lint         |  156 |   return backend.currentIdentity?.()?.workspace ?? null;
lint         |      :                                       ^^^^^^^^^
lint         |  157 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/target.ts:156:10]
lint         |  155 |   const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
lint         |  156 |   return backend.currentIdentity?.()?.workspace ?? null;
lint         |      :          ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  157 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/daemon/rpc.ts:760:57]
lint         |  759 |   // the only versioned integration today; unknown environments simply omit it.
lint         |  760 |   const callerBackend = allBackends().find((backend) => backend.currentIdentity?.());
lint         |      :                                                         ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  761 |   return {
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
lint         |      ,-[src/commands/status.ts:611:3]
lint         |  610 |   if (v.entity.backend === null) return null;
lint         |  611 |   return getBackend(v.entity.backend)?.capabilities ?? null;
lint         |      :   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  612 | }
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/doctor/backends.ts:143:7]
lint         |  142 |       insideSession: probe.insideSession,
lint         |  143 |       workspace: backend.currentIdentity?.()?.workspace ?? null,
lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  144 |       roles: Object.entries({
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/doctor/backends.ts:143:47]
lint         |  142 |       insideSession: probe.insideSession,
lint         |  143 |       workspace: backend.currentIdentity?.()?.workspace ?? null,
lint         |      :                                               ^^^^^^^^^
lint         |  144 |       roles: Object.entries({
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/doctor/backends.ts:143:18]
lint         |  142 |       insideSession: probe.insideSession,
lint         |  143 |       workspace: backend.currentIdentity?.()?.workspace ?? null,
lint         |      :                  ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  144 |       roles: Object.entries({
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/panes.ts:146:9]
lint         |  145 |   const { backend, groups } = selectedGroups();
lint         |  146 |   const workspace = backend.currentIdentity?.()?.workspace ?? null;
lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  147 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:146:50]
lint         |  145 |   const { backend, groups } = selectedGroups();
lint         |  146 |   const workspace = backend.currentIdentity?.()?.workspace ?? null;
lint         |      :                                                  ^^^^^^^^^
lint         |  147 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:146:21]
lint         |  145 |   const { backend, groups } = selectedGroups();
lint         |  146 |   const workspace = backend.currentIdentity?.()?.workspace ?? null;
lint         |      :                     ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  147 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/panes.ts:196:9]
lint         |  195 |   const { label, cwd } = parsed;
lint         |  196 |   const workspace = parsed.workspace ?? backend.currentIdentity?.()?.workspace ?? null;
lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  197 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/commands/panes.ts:196:70]
lint         |  195 |   const { label, cwd } = parsed;
lint         |  196 |   const workspace = parsed.workspace ?? backend.currentIdentity?.()?.workspace ?? null;
lint         |      :                                                                      ^^^^^^^^^
lint         |  197 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/panes.ts:196:41]
lint         |  195 |   const { label, cwd } = parsed;
lint         |  196 |   const workspace = parsed.workspace ?? backend.currentIdentity?.()?.workspace ?? null;
lint         |      :                                         ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  197 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/panes.ts:198:47]
lint         |  197 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
lint         |  198 |   const created = backend.groupHome!.create({ workspace, cwd, label });
lint         |      :                                               ^^^^^^^^^
lint         |  199 |   if (json) process.stdout.write(JSON.stringify(created) + "\n");
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
lint         |      ,-[src/commands/spawn.ts:865:36]
lint         |  864 |   if (!backend.groupHome || settings.workspace !== null) return backend;
lint         |  865 |   if (backend.currentIdentity?.()?.workspace) return backend;
lint         |      :                                    ^^^^^^^^^
lint         |  866 |   if (backend.spaceHome) return backend;
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/spawn.ts:865:7]
lint         |  864 |   if (!backend.groupHome || settings.workspace !== null) return backend;
lint         |  865 |   if (backend.currentIdentity?.()?.workspace) return backend;
lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^
lint         |  866 |   if (backend.spaceHome) return backend;
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/commands/setup.ts:623:11]
lint         |  622 |     const backend = resolveBackend({ configured: "headless" });
lint         |  623 |     const handle = backend.handleFor?.(key);
lint         |      :           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  624 |     if (handle !== undefined) backend.paneHost?.close(handle);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/commands/setup.ts:623:20]
lint         |  622 |     const backend = resolveBackend({ configured: "headless" });
lint         |  623 |     const handle = backend.handleFor?.(key);
lint         |      :                    ^^^^^^^^^^^^^^^^^
lint         |  624 |     if (handle !== undefined) backend.paneHost?.close(handle);
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
lint         |      ,-[src/control/dispatch.ts:166:9]
lint         |  165 |   const backend = backendId ? getBackend(backendId) : undefined;
lint         |  166 |   const handle = backend?.handleFor?.(target);
lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
lint         |  167 |   return backend && handle !== undefined ? { backend, handle } : undefined;
lint         |      `----
lint         | 
lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
lint         |      ,-[src/control/dispatch.ts:166:18]
lint         |  165 |   const backend = backendId ? getBackend(backendId) : undefined;
lint         |  166 |   const handle = backend?.handleFor?.(target);
lint         |      :                  ^^^^^^^^^^^^^^^^^^
lint         |  167 |   return backend && handle !== undefined ? { backend, handle } : undefined;
lint         |      `----
lint         | 
lint         | Found 0 warnings and 28 errors.
lint         | Finished in 2.4s on 355 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
