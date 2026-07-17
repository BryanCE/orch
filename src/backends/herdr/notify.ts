import { binaryOnPath } from "../../util.ts";
import { herdrBestEffort } from "./cli.ts";
import type { SinkProvider } from "../../notify-sinks.ts";

/** Herdr-owned native notification sink. */
export const herdrNotificationProvider: SinkProvider = {
  id: "herdr",
  onDefaults: ["blocked", "error"],
  label: "Herdr",
  description: "Herdr native notifications",
  remediation: "fix: install herdr and ensure it is reachable on PATH",
  available: () => process.env.HERDR_ENV === "1" && binaryOnPath("herdr"),
  send: (title, body) => herdrBestEffort(["notification", "show", title, "--body", body]),
};
