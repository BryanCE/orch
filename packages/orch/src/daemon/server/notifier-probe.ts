// Which notifiers this machine can deliver through. Probing runs each notifier's availability
// check, which starts processes, so orchd answers it; setup and `orch settings notify` ask.
// Load backend-owned providers before building the choices. The registry import is
// intentionally side-effect-only: notify stays harness-neutral.
import "../../backends/registry.ts";
import { createBuiltinNotifiers } from "../../notify/sinks.ts";
import { notifierRemediation } from "../../notify/remediation.ts";
import type { NotifierChoice } from "../../types/notify.ts";
import type { OrchSettings } from "../../types/settings.ts";

/** Probe each built-in integration; rejected probes are reported as unavailable. */
export async function probeNotifiers(settings: OrchSettings | null): Promise<NotifierChoice[]> {
  return Promise.all(createBuiltinNotifiers().map(async (notifier) => {
    let available = false;
    try {
      available = await notifier.available(settings);
    } catch {
      available = false;
    }
    return {
      id: notifier.id,
      label: notifier.label,
      available,
      remediation: notifierRemediation(notifier.id, {}, notifier.remediation),
      requiredFields: notifier.metadata.requiredConfig,
    };
  }));
}
