// Leaf module: the backend-owned sink-provider registry. Backends register here at
// import time, so this file must import nothing from the project — notify.ts imports
// config.ts, which imports the backend registry, and any local import here would
// re-open that cycle (a provider registering into a half-initialized notify.ts).

/** Provider port used by backend-owned notification sinks. */
export interface SinkProvider {
  id: string;
  onDefaults: readonly string[];
  available(): boolean | Promise<boolean>;
  send(title: string, body: string): boolean | Promise<boolean>;
  remediation?: string;
  label?: string;
  description?: string;
}

const sinkProviders = new Map<string, SinkProvider>();

let onRegister: ((provider: SinkProvider) => void) | undefined;

/** Register a backend-owned notification provider. */
export function registerSinkProvider(provider: SinkProvider): void {
  sinkProviders.set(provider.id, provider);
  onRegister?.(provider);
}

/** Every registered provider, in registration order. */
export function allSinkProviders(): SinkProvider[] {
  return [...sinkProviders.values()];
}

export function getSinkProvider(id: string): SinkProvider | undefined {
  return sinkProviders.get(id);
}

export function hasSinkProvider(id: string): boolean {
  return sinkProviders.has(id);
}

/** Subscribe the notifier registry to providers that register after it was created. */
export function onSinkProviderRegistered(listener: (provider: SinkProvider) => void): void {
  onRegister = listener;
}
