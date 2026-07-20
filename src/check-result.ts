/** Shared result shape returned by doctor checks and adapter diagnostics. */
export interface FixDescriptor {
  description: string;
  apply(): void;
  /** True for fixes that delete data. UIs must render these clearly and never pre-select them. */
  destructive?: boolean;
}

export interface DoctorBackendReport {
  id: string;
  available: boolean;
  insideSession: boolean;
  panes: boolean;
  focusable: boolean;
  canSendKeys: boolean;
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
