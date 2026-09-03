import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { posixPath, sourceFiles } from "./helpers/sources.ts";

const packageRoot = join(import.meta.dir, "..");
const canonicalWallModule = posixPath(join(packageRoot, "src", "policy", "space.ts"));
const wallMarkers = [
  /opts:\s*\{\s*crossSpace/,
  /opts\.crossSpace\b/,
  /allowed:\s*false/,
  /space wall:/,
] as const;

function wallSourceFiles(): string[] {
  return sourceFiles(join(packageRoot, "src")).sort();
}

describe("space wall ownership", () => {
  test("keeps the wall decision primitive in one source module", async () => {
    const files = wallSourceFiles();
    const sources = await Promise.all(files.map(async (path) => [path, await Bun.file(path).text()] as const));
    const canonical = sources.find(([path]) => path === canonicalWallModule);

    expect(canonical).toBeDefined();
    const canonicalSource = canonical?.[1] ?? "";

    expect((sources.map(([, source]) => source.match(/export function checkWall\s*\(/g)?.length ?? 0)).reduce((sum, count) => sum + count, 0)).toBe(1);

    for (const marker of wallMarkers) {
      const owners = sources
        .filter(([, source]) => marker.test(source))
        .map(([path]) => path);
      expect(owners).toEqual([canonicalWallModule]);
      expect(marker.test(canonicalSource)).toBe(true);
    }
  });
});
