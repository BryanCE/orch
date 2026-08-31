import { describe, expect, test } from "bun:test";
import {
  callerPaneHandle,
  HerdrBackend,
  herdrEnvironmentPresent,
} from "../src/backends/herdr/index.ts";

interface PredicateCase {
  name: string;
  herdrEnv?: string;
  paneId?: string;
  environmentPresent: boolean;
  paneHandle: string | undefined;
  insideSession: boolean;
}

const cases: readonly PredicateCase[] = [
  {
    name: "neither variable set",
    environmentPresent: false,
    paneHandle: undefined,
    insideSession: false,
  },
  {
    name: "HERDR_ENV=1 only",
    herdrEnv: "1",
    environmentPresent: true,
    paneHandle: undefined,
    insideSession: true,
  },
  {
    name: "HERDR_PANE_ID only",
    paneId: "pane-1",
    environmentPresent: false,
    paneHandle: "pane-1",
    insideSession: true,
  },
  {
    name: "both variables set",
    herdrEnv: "1",
    paneId: "pane-1",
    environmentPresent: true,
    paneHandle: "pane-1",
    insideSession: true,
  },
];

function withEnvironment(testCase: PredicateCase, assertion: () => void): void {
  const previousHerdrEnv = process.env.HERDR_ENV;
  const previousPaneId = process.env.HERDR_PANE_ID;
  try {
    if (testCase.herdrEnv === undefined) delete process.env.HERDR_ENV;
    else process.env.HERDR_ENV = testCase.herdrEnv;
    if (testCase.paneId === undefined) delete process.env.HERDR_PANE_ID;
    else process.env.HERDR_PANE_ID = testCase.paneId;
    assertion();
  } finally {
    if (previousHerdrEnv === undefined) delete process.env.HERDR_ENV;
    else process.env.HERDR_ENV = previousHerdrEnv;
    if (previousPaneId === undefined) delete process.env.HERDR_PANE_ID;
    else process.env.HERDR_PANE_ID = previousPaneId;
  }
}

describe("herdr environment predicates", () => {
  for (const testCase of cases) {
    test(testCase.name, () => {
      withEnvironment(testCase, () => {
        expect(herdrEnvironmentPresent()).toBe(testCase.environmentPresent);
        expect(callerPaneHandle()).toBe(testCase.paneHandle);
        expect(new HerdrBackend().isInsideSession()).toBe(testCase.insideSession);
      });
    });
  }
});
