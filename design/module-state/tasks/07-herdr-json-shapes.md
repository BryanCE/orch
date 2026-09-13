# 07-herdr-json-shapes

Owns: `src/backends/herdr/cli.ts`, `src/backends/herdr/index.ts`, `src/backends/herdr/wire.ts` (new), `test/backend-herdr.test.ts` (fixtures only, if a schema rejects one)

`HerdrCli.json<T>(args): T` returns `parseHerdrOutput(output) as T`: a generic nothing verifies, asserted at eight call sites in index.ts. Rule 13. Herdr's wire shapes are this adapter's to know (Rule 9), so they get schemas parsed once at the boundary, the way `src/daemon/rpc/protocol.ts` does for the daemon.

Do:
1. New `src/backends/herdr/wire.ts` with zod schemas for the six response shapes index.ts asserts today, each named for the herdr command that answers it and each `satisfies z.ZodType<...>` of the plexer types where one exists (`HerdrPane`, `HerdrTab`, `HerdrWorkspace` in `src/types/plexer.ts`): the tab-open reply `{ tab, root_pane }`, the move reply `{ move_result?: { changed?, reason?, pane?: { pane_id? } } }` (one schema covers the three move sites), the pane-open reply `{ pane?, root_pane? }`, the layout reply `{ layout: { tab_id, panes: { pane_id, rect }[] } }`, the workspace-open reply `{ workspace?, root_pane? }`, and the workspace-list reply `{ workspaces }`. Use `z.object(...)` with exactly the fields index.ts reads; optional where the site treats the field as optional. Export the schemas; export no types that zod can infer.
2. cli.ts: `json` becomes `json<S extends z.ZodType>(args: string[], schema: S): z.output<S>`: run the command as today, `schema.safeParse(parseHerdrOutput(output))`, and on failure throw `new HerdrCommandError(null, \`herdr ${args.join(" ")} answered an unexpected shape: ${issues}\`)`. No cast anywhere in the function.
3. index.ts: each of the eight `this.cli.json<{...}>(args)` calls becomes `this.cli.json(args, <schema from wire.ts>)`; delete the inline object types. Where a site's downstream code narrowed by hand what the schema now guarantees, delete that narrowing.
4. test/backend-herdr.test.ts: the fake executor returns JSON strings for these commands; if a schema rejects a fixture, fix the fixture to the shape herdr really answers (the schema is the truth, the fixture is not).

Check: `bun check`. Tests: `test/backend-herdr.test.ts`, `test/herdr-notify-hardening.test.ts`, `test/port-seam-errors.test.ts`.
