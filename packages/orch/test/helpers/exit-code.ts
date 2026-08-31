/** Run a test action without leaking its process exit code into other tests. */
export function withExitCode<T>(action: () => T): T {
  const previous = process.exitCode;
  try {
    return action();
  } finally {
    process.exitCode = previous;
  }
}
