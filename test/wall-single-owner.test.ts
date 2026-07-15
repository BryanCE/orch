import { describe, expect, test } from "bun:test";

const canonicalWallModule = "src/policy/workspace.ts";
const wallMarkers = [
  /opts:\s*\{\s*crossWorkspace/,
  /opts\.crossWorkspace\s*===\s*true/,
  /allowed:\s*false/,
  /workspace wall:/,
] as const;

async function sourceFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const path of new Bun.Glob("src/**/*.ts").scan(".")) files.push(path);
  return files.sort();
}

describe("workspace wall ownership", () => {
  test("keeps the wall decision primitive in one source module", async () => {
    const files = await sourceFiles();
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
