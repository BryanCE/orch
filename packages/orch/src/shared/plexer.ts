import { BACKEND_IDS, type BackendHandle, type BackendId } from "../types/backend.ts";

/** Render a native handle without falling back to Object.prototype.toString. */
export function describeHandle(handle: BackendHandle): string {
  return typeof handle === "string" ? handle : handle.toString();
}

export function isBackendId(value: unknown): value is BackendId {
  return typeof value === "string" && (BACKEND_IDS as readonly string[]).includes(value);
}
