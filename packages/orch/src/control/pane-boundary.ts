// Whether a pane verb applies to an agent: it needs a pane, and an environment that composes
// the role the verb drives. Branches on the role, never on which environment it is.

export type BoundaryPlan<T> =
  | { readonly outcome: "invoke"; readonly role: T }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "no-pane" | "no-environment-role" };

export function paneBoundary<T>(target: string, command: string, role: T | null, hasPane: boolean): BoundaryPlan<T> {
  if (!hasPane) return { outcome: "answer", reason: "no-pane", text: `${target} has no pane; ${command} does not apply.` };
  if (role === null || role === undefined) return { outcome: "answer", reason: "no-environment-role", text: `this pane environment does not provide ${command}` };
  return { outcome: "invoke", role };
}
