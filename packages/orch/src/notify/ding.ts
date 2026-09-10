// The one implementation of "make a sound on this host": the `sound` sink and the orch-ding
// bin both play through it. Every OS difference is a row in HOSTS, never a branch. Tiers are
// tried in order and the first that runs wins, so one row covers a Linux desktop and WSL.
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, writeSync } from "node:fs";
import { binaryOnPath, osSide } from "../util.ts";
import type { OsSide } from "../types/core.ts";

/** One way to make a sound: a binary plus the arguments that play `sound` through it. */
interface SoundTier {
  readonly bin: string;
  readonly args: (sound: string) => string[];
  /** A tier that plays a file is skipped when there is no sound file to hand it. */
  readonly needsSoundFile: boolean;
}

const PULSE: SoundTier = { bin: "paplay", args: (sound) => [sound], needsSoundFile: true };
const CANBERRA: SoundTier = { bin: "canberra-gtk-play", args: () => ["-i", "complete"], needsSoundFile: false };
const AFPLAY: SoundTier = { bin: "afplay", args: (sound) => [sound], needsSoundFile: true };

/** Windows' own notification sound, reachable from WSL through the same interop binary.
 *  Play() returns before the sound does, so powershell has to outlive it. */
const POWERSHELL: SoundTier = {
  bin: "powershell.exe",
  args: (sound) => [
    "-NoProfile",
    "-Command",
    sound
      ? `(New-Object Media.SoundPlayer '${sound.replace(/'/g, "''")}').PlaySync()`
      : "[System.Media.SystemSounds]::Asterisk.Play(); Start-Sleep -Milliseconds 500",
  ],
  needsSoundFile: false,
};

interface Host {
  readonly tiers: readonly SoundTier[];
  /** Played by the file tiers when ORCH_DING_SOUND names nothing. */
  readonly sound: string;
  /** The terminal device the bell fallback rings, because a sink's stdout is discarded. */
  readonly ttyDevice: string;
}

const HOSTS: Record<OsSide, Host> = {
  linux: {
    tiers: [PULSE, CANBERRA, POWERSHELL],
    sound: "/usr/share/sounds/freedesktop/stereo/complete.oga",
    ttyDevice: "/dev/tty",
  },
  darwin: {
    tiers: [AFPLAY],
    sound: "/System/Library/Sounds/Glass.aiff",
    ttyDevice: "/dev/tty",
  },
  windows: {
    tiers: [POWERSHELL],
    sound: "",
    ttyDevice: "CONOUT$",
  },
};

const BELL = "";

/** The packaged bin that plays this from a command sink - the value `orch settings` suggests
 *  when someone turns the command sink on, so nobody has to remember what to type there. */
export const ORCH_DING_BIN = "orch-ding";

function host(): Host {
  return HOSTS[osSide()];
}

/** The sound file to play: the operator's override, else the host's own, and only if it exists. */
function soundFile(): string {
  const configured = process.env.ORCH_DING_SOUND ?? host().sound;
  return configured && existsSync(configured) ? configured : "";
}

function run(bin: string, args: readonly string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(bin, [...args], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/** Ring the terminal a human is actually looking at: a sink's stdout goes nowhere. */
function bell(device: string): void {
  try {
    const handle = openSync(device, "w");
    try {
      writeSync(handle, BELL);
    } finally {
      closeSync(handle);
    }
  } catch {
    process.stdout.write(BELL);
  }
}

/** The sound players this host would use, in the order they are tried. Named so an
 *  unavailable `sound` sink can tell the operator what to install. */
export function soundTierBinaries(): readonly string[] {
  return host().tiers.map((tier) => tier.bin);
}

/** True when this host has a real sound player. The terminal bell still backs every
 *  delivery up, but a bell into a detached daemon's discarded stdout is not a promise
 *  orch should make on a doctor line. */
export function soundAvailable(): boolean {
  return host().tiers.some((tier) => binaryOnPath(tier.bin));
}

/** Make one notification sound. Resolves true when a tier played it, false when the
 *  delivery fell through to the bell. */
export async function playDing(): Promise<boolean> {
  const current = host();
  const sound = soundFile();
  for (const tier of current.tiers) {
    if (tier.needsSoundFile && !sound) continue;
    if (!binaryOnPath(tier.bin)) continue;
    if (await run(tier.bin, tier.args(sound))) return true;
  }
  bell(current.ttyDevice);
  return false;
}
