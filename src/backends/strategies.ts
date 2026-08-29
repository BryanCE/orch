import type {
  AdapterCommand,
  AnswerRequest,
  LifecycleVerb,
  ModelRequest,
  SteerRequest,
} from "../adapters/adapter.ts";

/** Harness strategy roles. Each role is complete when composed and has no capability flag. */
export interface AskStrategy {
  answer(request?: AnswerRequest): AdapterCommand | undefined;
}

export interface SteerStrategy {
  steer(request?: SteerRequest): AdapterCommand | undefined;
}

export interface ModelStrategy {
  setModel(request?: ModelRequest): AdapterCommand | undefined;
}

export interface LifecycleStrategy {
  lifecycle(verb?: LifecycleVerb): { readonly text: string } | undefined;
}

/** Strategies composed for one recorded harness/environment pair. */
export interface HarnessStrategies {
  readonly ask: AskStrategy | null;
  readonly steer: SteerStrategy | null;
  readonly model: ModelStrategy | null;
  readonly lifecycle: LifecycleStrategy | null;
}

export type StrategyAction =
  | { readonly kind: "ask"; readonly request?: AnswerRequest }
  | { readonly kind: "steer"; readonly request?: SteerRequest }
  | { readonly kind: "model"; readonly request?: ModelRequest }
  | { readonly kind: "lifecycle"; readonly verb?: LifecycleVerb };

export type StrategyDispatchResult =
  | { readonly outcome: "invoke" }
  | { readonly outcome: "answer"; readonly reason: "no-environment-role"; readonly exitCode: 0 };

/**
 * The only strategy dispatcher. Callers provide a composed bundle; dispatch
 * never identifies a harness or plexer and treats a missing role as a boundary
 * answer rather than an internal unsupported-operation failure.
 */
export function dispatchStrategies(strategies: HarnessStrategies, action: StrategyAction): StrategyDispatchResult {
  switch (action.kind) {
    case "ask":
      if (strategies.ask === null) return { outcome: "answer", reason: "no-environment-role", exitCode: 0 };
      strategies.ask.answer(action.request);
      return { outcome: "invoke" };
    case "steer":
      if (strategies.steer === null) return { outcome: "answer", reason: "no-environment-role", exitCode: 0 };
      strategies.steer.steer(action.request);
      return { outcome: "invoke" };
    case "model":
      if (strategies.model === null) return { outcome: "answer", reason: "no-environment-role", exitCode: 0 };
      strategies.model.setModel(action.request);
      return { outcome: "invoke" };
    case "lifecycle":
      if (strategies.lifecycle === null) return { outcome: "answer", reason: "no-environment-role", exitCode: 0 };
      strategies.lifecycle.lifecycle(action.verb);
      return { outcome: "invoke" };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/** Alias used by control consumers; both names point at the same dispatcher. */
export const dispatchControl = dispatchStrategies;
