/** A program to run with piped standard streams. */
export interface PipesSpawn {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

/** How a piped program ended. */
export interface PipesExit {
  readonly code: number | null;
  readonly signal: string | null;
}

/** A running program and its standard streams. */
export interface PipesProcess {
  readonly pid: number;
  readonly input: WritableStream<Uint8Array>;
  readonly output: ReadableStream<Uint8Array>;
  /** Receives future stderr text only; earlier chunks are not replayed. */
  onStderr(listener: (text: string) => void): void;
  readonly exited: Promise<PipesExit>;
  kill(): void;
}

/** Starts programs with pipes; throws when a process cannot be started. */
export interface PipesProvider {
  spawn(request: PipesSpawn): PipesProcess;
}
