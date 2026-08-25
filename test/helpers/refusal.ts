import { errorMessage } from "../../src/util.ts";

/** The refusal message from a call that must reject, or undefined when it wrongly resolved.
 *  Awaiting the settled value keeps the assertion inside the test, which `expect(p).rejects`
 *  does not: its matcher is typed non-thenable, so awaiting it is a lint error and NOT
 *  awaiting it lets the test finish before the assertion runs. */
export function refusalOf(action: Promise<unknown>): Promise<string | undefined> {
  return action.then(() => undefined, (error: unknown) => errorMessage(error));
}
