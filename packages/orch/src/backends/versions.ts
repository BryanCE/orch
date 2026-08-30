/** Supported plexer versions are ranges, not floors: pre-1.0 integrations can
 * change compatibly-shaped behavior between minor releases. Keep these declarations
 * beside the backend boundary so doctor and registration use the same contract. */
export const SUPPORTED_RANGES = {
  herdr: ">=0.8.0 <0.9.0",
} as const;

type SupportedPlexer = keyof typeof SUPPORTED_RANGES;

/** Whether orch declares a supported range for this plexer at all. A narrowing
 *  guard, not a cast: an id orch has never heard of has no range, and saying so
 *  is the answer doctor and registration print. */
function isSupportedPlexer(plexerId: string): plexerId is SupportedPlexer {
  return Object.hasOwn(SUPPORTED_RANGES, plexerId);
}

interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

function parseSemver(value: string): Semver | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? "" };
}

/** Parse the first semver token from a plexer --version response. */
export function extractVersion(output: string): string | null {
  const match = /(?:^|\s|\bv)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(output.trim());
  return match?.[1] ?? null;
}

/** Numeric semver comparison. Build metadata is intentionally ignored. */
export function compareVersions(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) throw new Error(`invalid semantic version: ${!a ? left : right}`);
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease === b.prerelease) return 0;
  const aa = a.prerelease.split(".");
  const bb = b.prerelease.split(".");
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i];
    const y = bb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return Number(x) - Number(y);
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** Evaluate the small, explicit range grammar used by SUPPORTED_RANGES. */
export function versionInRange(version: string, range: string): boolean {
  if (!parseSemver(version)) return false;
  return range.trim().split(/\s+/).filter(Boolean).every((term) => {
    const match = /^(<=|>=|<|>|=)?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(term);
    if (!match) return false;
    const comparison = compareVersions(version, match[2]!);
    switch (match[1] ?? "=") {
      case ">=": return comparison >= 0;
      case "<=": return comparison <= 0;
      case ">": return comparison > 0;
      case "<": return comparison < 0;
      default: return comparison === 0;
    }
  });
}

export function supportedPlexerVersion(plexerId: string, installed: string): boolean {
  const range = supportedRange(plexerId);
  return range !== undefined && versionInRange(installed, range);
}

export function supportedRange(plexerId: string): string | undefined {
  return isSupportedPlexer(plexerId) ? SUPPORTED_RANGES[plexerId] : undefined;
}
