import { describe, expect, test } from "bun:test";
import { detectHost, hostOsOf, isHostOs, isWsl } from "../src/host.ts";

describe("host", () => {
  test("maps supported platforms", () => {
    expect(hostOsOf("win32")).toBe("windows");
    expect(hostOsOf("darwin")).toBe("darwin");
    expect(hostOsOf("linux")).toBe("linux");
  });

  test("rejects unsupported platforms", () => {
    expect(() => hostOsOf("freebsd")).toThrow("unsupported host OS freebsd");
  });

  test("guards host operating systems", () => {
    expect(isHostOs("linux")).toBe(true);
    expect(isHostOs("windows")).toBe(true);
    expect(isHostOs("darwin")).toBe(true);
    expect(isHostOs("wsl")).toBe(false);
    expect(isHostOs(3)).toBe(false);
  });

  test("detects WSL from distro name or kernel release", () => {
    expect(isWsl({ release: "6.1.0-generic", wslDistro: "Ubuntu" })).toBe(true);
    expect(isWsl({ release: "5.15.167.4-microsoft-standard-WSL2", wslDistro: undefined })).toBe(true);
    expect(isWsl({ release: "6.1.0-generic", wslDistro: undefined })).toBe(false);
  });

  test("detects the current host", () => {
    const host = detectHost();
    expect(isHostOs(host.os)).toBe(true);
    expect(typeof host.wsl).toBe("boolean");
  });
});
