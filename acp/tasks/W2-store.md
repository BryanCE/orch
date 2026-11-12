# W2: the store

One agent types T1, then T2, in that order, since both edit
`packages/orch/src/db/schema.ts`. A second agent types T3 after T2 lands. Paths are relative
to the repo root `/home/bryan/orch`.

Rules for every section:
- Never run `orch`, `bun run build`, `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`,
  `git`, or anything under `packages/orch/scripts/`. Never edit anything under
  `packages/orch/drizzle/`. Bryan generates the migration after this wave.
- Never run `bun test` in this wave. The store tests cannot pass until the migration exists.
- Verify means: run `bun check` once from the repo root.
- No `as` casts, no `any`. Never bump a schema version constant.

## T1 `agent_forms`, `setForm`, and the form on the agent view
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
Verify: `bun check`. Type errors in files under `packages/orch/test/` are T3's: list them.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Questions carry options, and an agent may have several open
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

Verify: `bun check`. Type errors in files under `packages/orch/test/` are T3's: list them.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Tests for T1 and T2
Runs after T2 has landed. Edit only files under `packages/orch/test/`.

1. Run `bun check`. Fix every type error under `packages/orch/test/` with these mappings:
   - `recordQuestion(dir, {...})` gains `options: [], supersede: true`.
   - An `AgentView` literal gains `form: null`. In `packages/orch/test/helpers/views.ts`, add
     `form: null,` under `endedAt: null,`.
2. Add to `packages/orch/test/store-interval-rows.test.ts`, using the helpers that file
   already uses to make a store and a `HereAgent`:
   - `setForm` with `"acp"` at 1000 then `"tui"` at 2000: `agent_forms` has two rows, the first
     closed at 2000, and `agentView(dir, agent.id)?.form` is `"tui"`.
   - An agent with no `setForm` call: `agentView(dir, agent.id)?.form` is `null`.
3. Add to `packages/orch/test/daemon-renags-questions.test.ts`, using its existing setup:
   - Two `recordQuestion` calls for one agent with `supersede: false`, asked at 1000 and 2000:
     `pendingQuestions(dir)` has both, and `pendingQuestion(dir, agentId)?.id` is the first.
   - A third call with `supersede: true`: `pendingQuestions(dir)` has only the third.
   - `recordQuestion` with options
     `[{ id: "a", label: "Allow", kind: "allow-once" }, { id: "r", label: "Reject", kind: "reject-once" }]`:
     `questionOptionsOf(dir, id)` returns those two in that order.
4. In `packages/orch/test/store-rebuild-schema.test.ts`, add `"agent_forms"`,
   `"question_options"` and `"one_form"` to `expectedInventory`, and add an `agent_forms`
   case to the test that checks each partial unique index allows only one open row.

Verify: `bun check`. Do not run `bun test`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
