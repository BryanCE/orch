## T3

T3: 0 findings

## T8

T8: 0 findings

## T10

`packages/orch/src/commands/status/table.ts:199` and `:204`

Breaks Rule 17 and the task rule forbidding literal caps. Both new FORM column caps are hardcoded as `10`.

Exact edit: import `FORM_IDS` from `../../types/form.ts`, define `const FORM_CAP = Math.max(...FORM_IDS.map((form) => form.length));`, and replace only the new FORM cap in each array with `FORM_CAP`. Leave the existing column caps unchanged.

T10: 1 findings
