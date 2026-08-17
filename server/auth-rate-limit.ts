import type { RequestHandler } from "express";

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface AttemptWindow {
  count: number;
  expiresAtMs: number;
}

export class AttemptRateLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();

  constructor(
    private readonly maxAttempts = 10,
    private readonly windowMs = 15 * 60 * 1000,
    private readonly maxKeys = 10_000,
  ) {}

  consume(key: string, nowMs = Date.now()): RateLimitDecision {
    let window = this.attempts.get(key);
    if (!window || window.expiresAtMs <= nowMs) {
      this.makeRoom(nowMs, key);
      window = { count: 0, expiresAtMs: nowMs + this.windowMs };
      this.attempts.set(key, window);
    }
    if (window.count >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((window.expiresAtMs - nowMs) / 1000)),
      };
    }
    window.count += 1;
    return { allowed: true, remaining: this.maxAttempts - window.count, retryAfterSeconds: 0 };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  get trackedKeyCount(): number {
    return this.attempts.size;
  }

  private makeRoom(nowMs: number, incomingKey: string): void {
    if (this.attempts.has(incomingKey) || this.attempts.size < this.maxKeys) return;
    for (const [key, window] of Array.from(this.attempts.entries())) {
      if (window.expiresAtMs <= nowMs) this.attempts.delete(key);
    }
    while (this.attempts.size >= this.maxKeys) {
      const oldestKey = this.attempts.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.attempts.delete(oldestKey);
    }
  }
}

export function buildAuthRateLimitKey(input: { path: string; ip?: string; userId?: string }): string {
  const actor = input.path === "/api/auth/change-password" && input.userId
    ? `user:${input.userId}`
    : `ip:${input.ip || "unknown"}`;
  return `${input.path}:${actor}`;
}

export function createAuthRateLimitMiddleware(limiter: AttemptRateLimiter): RequestHandler {
  return (req, res, next) => {
    const decision = limiter.consume(buildAuthRateLimitKey({
      path: req.path,
      ip: req.ip,
      userId: req.session?.userId,
    }));
    res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    if (decision.allowed) return next();

    res.setHeader("Retry-After", String(decision.retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please wait and try again.",
    });
  };
}
