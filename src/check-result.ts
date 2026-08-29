/** Shared result shape returned by doctor checks and adapter diagnostics. */
export interface FixDescriptor {
  description: string;
  apply(): void;
  /** True for fixes that delete data. UIs must render these clearly and never pre-select them. */
  destructive?: boolean;
}

export interface DoctorBackendReport {
  id: string;
  /** Whether the backend runtime is present on this machine. */
  detected?: boolean;
  /** Whether the backend is enabled in settings. */
  enabled?: boolean;
  /** Whether this backend is the selected runtime for this invocation. */
  active?: boolean;
  /** Legacy spelling retained for consumers of the detailed capability report. */
  available?: boolean;
  insideSession: boolean;
  roles: readonly string[];
  workspace: string | null;
}

export interface IgnoredPresenceRecord {
  path: string;
  reason: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix?: FixDescriptor;
  backends?: DoctorBackendReport[];
  ignoredRecords?: IgnoredPresenceRecord[];
}
