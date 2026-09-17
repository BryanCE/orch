import type { LogContext, LogLevel, LogRecord, LogValue, Logger } from "../../src/types/core.ts";

export function recordingLogger(): { logger: Logger; records: LogRecord[] } {
  const records: LogRecord[] = [];
  const make = (bound: LogContext): Logger => {
    const write = (level: LogLevel, event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void => {
      records.push({ proc: "orchd", pid: 0, at: Date.now(), level, event, ...(bound.correlationId === undefined && context?.correlationId === undefined ? {} : { correlationId: context?.correlationId ?? bound.correlationId }), ...(bound.agentId === undefined && context?.agentId === undefined ? {} : { agentId: context?.agentId ?? bound.agentId }), ...(fields === undefined ? {} : { fields }) });
    };
    return { setLevel: () => undefined, error: (e,f,c) => write("error",e,f,c), warn: (e,f,c) => write("warn",e,f,c), info: (e,f,c) => write("info",e,f,c), debug: (e,f,c) => write("debug",e,f,c), trace: (e,f,c) => write("trace",e,f,c), forCorrelation: (id) => make({ ...bound, correlationId: id }), forAgent: (id) => make({ ...bound, agentId: id }) };
  };
  return { logger: make({}), records };
}
