import type { Server } from "node:http";

export interface ShutdownStep {
  name: string;
  run: () => void | Promise<void>;
}

export interface ShutdownResult {
  signal: string;
  completedSteps: string[];
  failedSteps: Array<{ name: string; error: unknown }>;
}

export function closeHttpServer(server: Server, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => {
      server.closeAllConnections?.();
      finish(new Error(`HTTP server did not close within ${timeoutMs}ms`));
    }, timeoutMs);
    timeout.unref?.();

    server.close((error) => finish(error));
  });
}

export class GracefulShutdownCoordinator {
  private inFlight: Promise<ShutdownResult> | null = null;

  constructor(private readonly steps: ShutdownStep[]) {}

  shutdown(signal: string): Promise<ShutdownResult> {
    if (!this.inFlight) {
      this.inFlight = this.run(signal);
    }
    return this.inFlight;
  }

  private async run(signal: string): Promise<ShutdownResult> {
    const completedSteps: string[] = [];
    const failedSteps: Array<{ name: string; error: unknown }> = [];

    for (const step of this.steps) {
      try {
        await step.run();
        completedSteps.push(step.name);
      } catch (error) {
        failedSteps.push({ name: step.name, error });
      }
    }

    return { signal, completedSteps, failedSteps };
  }
}
