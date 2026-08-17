export interface CoordinatedReconnect<TResult> {
  promise: Promise<TResult>;
  started: boolean;
}

export class ReconnectCoordinator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  run<TResult>(accountId: string, task: () => Promise<TResult>): CoordinatedReconnect<TResult> {
    const existing = this.inFlight.get(accountId) as Promise<TResult> | undefined;
    if (existing) {
      return { promise: existing, started: false };
    }

    const promise = Promise.resolve().then(task);
    this.inFlight.set(accountId, promise);
    void promise.finally(() => {
      if (this.inFlight.get(accountId) === promise) {
        this.inFlight.delete(accountId);
      }
    }).catch(() => {
      // The caller receives the original rejection; this only handles finally's derived promise.
    });

    return { promise, started: true };
  }

  isReconnecting(accountId: string): boolean {
    return this.inFlight.has(accountId);
  }

  async waitFor(accountId: string): Promise<void> {
    try {
      await this.inFlight.get(accountId);
    } catch {
      // Intentional disconnect continues even when the pending reconnect failed.
    }
  }
}

export const rithmicReconnectCoordinator = new ReconnectCoordinator();
