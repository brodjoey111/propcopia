import type { OperationalLogLevel } from "./operational-logger";

const SLOW_REQUEST_THRESHOLD_MS = 500;
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface RequestObservationInput {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
}

export interface RequestLogDecision {
  level: OperationalLogLevel;
  event: "http.request_completed" | "http.request_failed" | "http.request_rejected" | "http.request_slow";
  context: Record<string, unknown>;
}

export function buildRequestLogDecision(input: RequestObservationInput): RequestLogDecision | null {
  if (!input.path.startsWith("/api") || input.path === "/api/health") {
    return null;
  }

  const context: Record<string, unknown> = {
    method: input.method.toUpperCase(),
    path: input.path,
    statusCode: input.statusCode,
    durationMs: Math.max(0, Math.round(input.durationMs)),
  };
  if (input.userId) {
    context.userId = input.userId;
  }

  if (input.statusCode >= 500) {
    return { level: "error", event: "http.request_failed", context };
  }
  if (input.statusCode >= 400) {
    return { level: "warn", event: "http.request_rejected", context };
  }
  if (input.durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
    return { level: "warn", event: "http.request_slow", context };
  }
  if (STATE_CHANGING_METHODS.has(input.method.toUpperCase())) {
    return { level: "info", event: "http.request_completed", context };
  }

  return null;
}
