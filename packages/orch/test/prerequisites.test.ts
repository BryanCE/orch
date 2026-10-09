import { describe, expect, test } from "bun:test";
import { PREREQUISITES } from "../src/adapters/prerequisites.ts";
import { HOST_OS_VALUES } from "../src/types/host.ts";

/** Setup preselects a recommended tool, so it must install it on every OS, and NixOS
 *  users, who get no install command, must get a page that tells them how. */
describe("a recommended tool installs everywhere", () => {
  const recommended = Object.entries(PREREQUISITES).filter(([, entry]) => entry.recommended === true);

  test("at least one tool is recommended", () => {
    expect(recommended.map(([id]) => id)).toContain("herdr");
  });

  for (const [id, entry] of recommended) {
    test(`${id} has an install command for each host OS and a docs page for NixOS`, () => {
      for (const os of HOST_OS_VALUES) expect(entry.install?.[os]).toBeString();
      expect(entry.docsUrl).toBeString();
    });
  }
});
