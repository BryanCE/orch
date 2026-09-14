$ bun run --parallel --no-exit-on-error check:orch check:web
check:web  | orch-web check: lint | Found 0 warnings and 0 errors.
check:web  | orch-web check: lint | Finished in 19ms on 102 files with 96 rules using 24 threads.
check:web  | orch-web check: lint | Done in 147ms
check:orch | @bryance/orch check: check:bridge | check:bridge OK (1462 files scanned)
check:orch | @bryance/orch check: check:bridge | Done in 750ms
check:orch | @bryance/orch check: tc           | Done in 2.06s
check:web  | orch-web check: tc   | src/components/AppSidebar.tsx(85,25): error TS2322: Type '"/spaces/$slug"' is not assignable to type '"." | ".." | "/" | "/api/events" | "/events" | "/queue" | "/ws/$slug"'.
check:web  | orch-web check: tc   | src/components/AppSidebar.tsx(85,54): error TS2353: Object literal may only specify known properties, and 'slug' does not exist in type 'ParamsReducerFn<RouterCore<Route<Register, any, "/", "/", string, "__root__", undefined, {}, {}, AnyContext, AnyContext, {}, () => Promise<{ colorScheme: string; themeMode: ThemeMode; }>, ... 4 more ..., undefined>, "never", false, RouterHistory, Record<...>>, "PATH", string, "/spaces/$slug">'.
check:web  | orch-web check: tc   | src/routes/index.tsx(85,28): error TS2322: Type '"/spaces/$slug"' is not assignable to type '"." | ".." | "/" | "/api/events" | "/events" | "/queue" | "/ws/$slug"'.
check:web  | orch-web check: tc   | src/routes/index.tsx(85,57): error TS2353: Object literal may only specify known properties, and 'slug' does not exist in type 'ParamsReducerFn<RouterCore<Route<Register, any, "/", "/", string, "__root__", undefined, {}, {}, AnyContext, AnyContext, {}, () => Promise<{ colorScheme: string; themeMode: ThemeMode; }>, ... 4 more ..., undefined>, "never", false, RouterHistory, Record<...>>, "PATH", string, "/spaces/$slug">'.
check:web  | orch-web check: tc   | src/routes/spaces/$slug.tsx(28,38): error TS2345: Argument of type '"/spaces/$slug"' is not assignable to parameter of type 'keyof FileRoutesByPath | undefined'.
check:orch | @bryance/orch check: lint         | Found 0 warnings and 0 errors.
check:orch | @bryance/orch check: lint         | Finished in 2.1s on 552 files with 65 rules using 24 threads.
check:orch | @bryance/orch check: lint         | Done in 2.22s
check:orch | @bryance/orch check: Exited with code 0
check:orch | Done in 2.30s
check:web  | orch-web check: tc   | Exited with code 1
check:web  | orch-web check: Exited with code 1
check:web  | Exited with code 1
error: script "check" exited with code 1
