/** omp exports its session id into subprocesses; it is both marker and identity. */
export const OMP_SESSION_ENV = { marker: "OMP_SESSION_ID", sessionId: "OMP_SESSION_ID" } as const;
