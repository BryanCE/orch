# W2: the store

One agent types T1, then T2, then T3, in that order, since all three edit
`packages/orch/src/db/schema.ts`. A second agent types T4 after T3 lands. Paths are relative
to the repo root `/home/bryan/orch`.

Rules for every section:
- Never run `orch`, `bun run build`, `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`,
  `git`, or anything under `packages/orch/scripts/`. Never edit anything under
  `packages/orch/drizzle/`. Bryan generates the migration after this wave.
- Never run `bun test` in this wave. The store tests cannot pass until the migration exists.
- Verify means: run `bun check` once from the repo root.
- No `as` casts, no `any`. Never bump a schema version constant.

## T1 `agent_plexers` becomes an interval
Edit `packages/orch/src/db/schema.ts`:
- Delete the `agentPlexers` table at L262-265.
- Directly under the comment line `// ── satellites: one independently-varying fact over one timeline`, add:
  ```ts
  export const agentPlexers = sqliteTable("agent_plexers", {
    agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    since: integer("since").notNull(),
    until: integer("until"),
    plexerId: text("plexer_id").notNull().references(() => plexers.id),
  }, (table) => [
    primaryKey({ columns: [table.agentId, table.since] }),
    uniqueIndex("one_plexer").on(table.agentId).where(sql`until IS NULL`),
    check("agent_plexers_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
  ]);
  ```

Edit `packages/orch/src/store/interval-rows.ts`:
- L26: add `| typeof agentPlexers` to the `IntervalTable` union.
- In `relocateIn`, replace the line `db.delete(agentPlexers).where(eq(agentPlexers.agentId, agentId)).run();`
  with `closeOpen(db, agentPlexers, agentId, now);`. In the doc comment above `relocateIn`,
  replace `the handle interval closes, and the plexer and worktree rows go.` with
  `the handle and plexer intervals close, and the worktree row goes.`
- Replace the whole `setAgentPlexer` function and its doc comment at L145-154 with:
  ```ts
  /** The plexer holding an agent this orchd runs. An interval like every other environment
   *  fact: a move to another plexer closes one row and opens the next, and the agent stays the
   *  same agent. Stating the plexer it is already in changes nothing. A plexer runs on this
   *  machine, so only an agent here is in one. */
  export function setAgentPlexer(orchDir: OrchDir, agent: HereAgent, now: number, plexerId: string): void {
    withTransaction(orchDir, () => {
      const db = orm(orchDir);
      const open = db.select({ plexerId: agentPlexers.plexerId }).from(agentPlexers)
        .where(and(eq(agentPlexers.agentId, agent.id), isNull(agentPlexers.until))).get();
      if (open?.plexerId === plexerId) return;
      const since = closeOpen(db, agentPlexers, agent.id, now);
      db.insert(agentPlexers).values({ agentId: agent.id, since, until: null, plexerId }).run();
    });
    refreshAgent(orchDir, agent.id);
  }
  ```

Fix the two callers:
- `packages/orch/src/store/agent-rows.ts` L304: `setAgentPlexer(orchDir, here, input.now, input.plexerId)`.
- `packages/orch/src/store/spawn-registration.ts` L102: `setAgentPlexer(directory, agent, now, input.backendId)`.

Fix the three readers so each takes only the open row:
- `packages/orch/src/store/agent-view.ts` `currentPlexers` at L83-85: add
  `.where(isNull(agentPlexers.until))` before `.all()`.
- `packages/orch/src/store/agent-view.ts` `currentPlexer` at L87-90: the `where` becomes
  `and(eq(agentPlexers.agentId, agentId), isNull(agentPlexers.until))`.
- `packages/orch/src/daemon/server/doctor/declared-vs-reality.ts` `environmentFindings` at L61-65:
  the `where` becomes `and(isNull(agentEndings.agentId), isNull(agentPlexers.until))`.

Verify: `bun check`. Type errors in files under `packages/orch/test/` are T4's: list them in
your report and leave them.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 `agent_forms`, `setForm`, and the form on the agent view
Edit `packages/orch/src/types/form.ts`: add at the end:
```ts
export function isFormId(value: string): value is FormId {
  return FORM_IDS.some((id) => id === value);
}
```

Edit `packages/orch/src/db/schema.ts`: directly under the `agentTunings` table, add:
```ts
/** The form an agent's harness runs in over time: `tui`, `oneshot` or `acp`. An agent orch
 *  did not launch has no row. */
export const agentForms = sqliteTable("agent_forms", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  form: text("form").notNull(),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_form").on(table.agentId).where(sql`until IS NULL`),
  check("agent_forms_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);
```

Edit `packages/orch/src/store/interval-rows.ts`:
- Add `| typeof agentForms` to the `IntervalTable` union.
- Directly under `setTuning`, add:
  ```ts
  /** The form the agent's harness runs in. A restart in another form closes one row and opens
   *  the next, and the agent stays the same agent. */
  export function setForm(orchDir: OrchDir, agentId: string, now: number, form: FormId): void {
    withTransaction(orchDir, () => {
      const db = orm(orchDir);
      const since = closeOpen(db, agentForms, agentId, now);
      db.insert(agentForms).values({ agentId, since, until: null, form }).run();
    });
    refreshAgent(orchDir, agentId);
  }
  ```

Edit `packages/orch/src/types/store.ts`: in `interface AgentView`, directly under
`readonly tuning: AgentTuning;` at L135, add:
```ts
  /** Program: the form its harness runs in. Null for an agent orch did not launch. */
  readonly form: FormId | null;
```

Edit `packages/orch/src/store/agent-view.ts`, following what `tunings` does in each place:
- `FleetFacts` at L180: add `forms: Map<string, FormId>;` under `tunings`.
- Under `currentTunings` at L149-153, add `currentForms(orchDir): ByAgent<FormId>`: select
  `agentId` and `form` from `agentForms` where `until` is null, keep rows whose `form` passes
  `isFormId`, return them as a `Map`.
- `heldFleet` at L205: add `forms: new Map(currentForms(orchDir)),` under `tunings`.
- `composeView` at L227: add `form: facts.forms.get(hub.id) ?? null,` under `tuning`.
- `refreshSatellites`, under the tuning block at L285-288: read the agent's open `agentForms`
  row. When it exists and its `form` passes `isFormId`, `facts.forms.set(agentId, form)`.
  Otherwise `facts.forms.delete(agentId)`.
- `dropAgent` at L305: add `facts.forms.delete(agentId);` under the tunings line.

Any zod schema that mirrors `AgentView` field for field gets
`form: z.enum(FORM_IDS).nullable()`. Any other source object that fails `bun check` for a
missing `form` is an `AgentView` literal: give it `form: null` and name the file in your report.
Verify: `bun check`. Type errors in files under `packages/orch/test/` are T4's: list them.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Questions carry options, and an agent may have several open
Create `packages/orch/src/types/question.ts` with exactly this content:
```ts
/** What choosing an option does, in orch's own words. */
export const QUESTION_OPTION_KINDS = ["allow-once", "allow-always", "reject-once", "reject-always"] as const;
export type QuestionOptionKind = (typeof QUESTION_OPTION_KINDS)[number];

/** One choice an agent offered with a question. */
export interface QuestionOption {
  readonly id: string;
  readonly label: string;
  readonly kind: QuestionOptionKind;
}

export function isQuestionOptionKind(value: string): value is QuestionOptionKind {
  return QUESTION_OPTION_KINDS.some((kind) => kind === value);
}
```

Edit `packages/orch/src/db/schema.ts`: directly under the `questions` table at L49-57, add:
```ts
/** The choices an agent offered with a question, in the order it offered them. A question
 *  with no rows takes free text. */
export const questionOptions = sqliteTable("question_options", {
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  optionId: text("option_id").notNull(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
}, (table) => [primaryKey({ columns: [table.questionId, table.position] })]);
```
In the doc comment above `questions`, replace
`` `answer` NULL on a settled row means it was superseded, never answered. `` with
`` `answer` NULL on a settled row means it was superseded or cancelled, never answered. An agent may have several pending. ``

Edit `packages/orch/src/store/question-rows.ts`:
- `recordQuestion` takes
  `input: { id: string; agentId: string; question: string; askedAt: number; options: readonly QuestionOption[]; supersede: boolean }`.
  Inside the transaction: run the existing `update` only when `input.supersede` is true, insert
  the question as today, then insert one `questionOptions` row per option with `position` its
  index in `input.options`, `optionId: option.id`, `label` and `kind`.
  Its doc comment becomes:
  `/** Record a new pending question with the options the agent offered. With `supersede`, every question this agent left open is settled unanswered first: the asker can wait on only one. */`
- `pendingQuestion`: order by `asc(questions.askedAt), asc(questions.id)`. Add the doc comment
  `/** The oldest question this agent has open. */`.
- `pendingQuestions`: order by `asc(questions.askedAt), asc(questions.id)`.
- Add:
  ```ts
  /** The options a question was asked with, in the order the agent offered them. */
  export function questionOptionsOf(directory: OrchDir, questionId: string): QuestionOption[] {
    return orm(directory).select().from(questionOptions)
      .where(eq(questionOptions.questionId, questionId))
      .orderBy(asc(questionOptions.position))
      .all()
      .flatMap((row) => isQuestionOptionKind(row.kind) ? [{ id: row.optionId, label: row.label, kind: row.kind }] : []);
  }
  ```
- Remove the `desc` import if nothing uses it.

Edit `packages/orch/src/daemon/server/handlers/lifecycle.ts` L276: add `options: [], supersede: true`
to the object passed to `recordQuestion`.

Verify: `bun check`. Type errors in files under `packages/orch/test/` are T4's: list them.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Tests for T1, T2 and T3
Runs after T3 has landed. Edit only files under `packages/orch/test/`.

1. Run `bun check`. Fix every type error under `packages/orch/test/` with these mappings:
   - `setAgentPlexer(dir, agent, id)` becomes `setAgentPlexer(dir, agent, now, id)`, where `now`
     is the instant that test already uses for its other interval writes, else `Date.now()`.
   - An insert into `agentPlexers` gains `since: <the test's instant>, until: null`.
   - `recordQuestion(dir, {...})` gains `options: [], supersede: true`.
   - An `AgentView` literal gains `form: null`. In `packages/orch/test/helpers/views.ts`, add
     `form: null,` under `endedAt: null,`.
2. Add to `packages/orch/test/store-interval-rows.test.ts`, using the helpers that file
   already uses to make a store and a `HereAgent`:
   - `setAgentPlexer` with `"herdr"` at 1000 then `"held"` at 2000: `agent_plexers` has two rows
     for the agent, the first with `until` 2000, the second with `until` null and `plexer_id`
     `"held"`, and `agentView(dir, agent.id)?.environment.plexer` is `"held"`.
   - `setAgentPlexer` with `"herdr"` at 1000 then `"herdr"` at 2000: one row, `until` null.
   - `setForm` with `"acp"` at 1000 then `"tui"` at 2000: `agent_forms` has two rows, the first
     closed at 2000, and `agentView(dir, agent.id)?.form` is `"tui"`.
   - An agent with no `setForm` call: `agentView(dir, agent.id)?.form` is `null`.
   A plexer id must exist in the `plexers` table before a row references it. Seed `"herdr"`
   and `"held"` the way the file's existing plexer tests seed theirs.
3. Add to `packages/orch/test/daemon-renags-questions.test.ts`, using its existing setup:
   - Two `recordQuestion` calls for one agent with `supersede: false`, asked at 1000 and 2000:
     `pendingQuestions(dir)` has both, and `pendingQuestion(dir, agentId)?.id` is the first.
   - A third call with `supersede: true`: `pendingQuestions(dir)` has only the third.
   - `recordQuestion` with options
     `[{ id: "a", label: "Allow", kind: "allow-once" }, { id: "r", label: "Reject", kind: "reject-once" }]`:
     `questionOptionsOf(dir, id)` returns those two in that order.

Verify: `bun check`. Do not run `bun test`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
