export const DEVELOPMENT_SESSION_SECRET = "dev-secret-please-change-in-production";

export interface RuntimeConfig {
  environment: "development" | "test" | "production";
  port: number;
  sessionSecret: string;
}

function normalizeEnvironment(value: string | undefined): RuntimeConfig["environment"] {
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

function parsePort(value: string | undefined): number {
  const port = value === undefined ? 5000 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a whole number between 1 and 65535.");
  }
  return port;
}

export function buildRuntimeConfig(
  environment: Record<string, string | undefined>,
): RuntimeConfig {
  const nodeEnvironment = normalizeEnvironment(environment.NODE_ENV);
  const configuredSecret = environment.SESSION_SECRET?.trim();

  if (
    nodeEnvironment === "production" &&
    (!configuredSecret ||
      configuredSecret === DEVELOPMENT_SESSION_SECRET ||
      configuredSecret.length < 32)
  ) {
    throw new Error(
      "SESSION_SECRET must be configured with at least 32 characters in production.",
    );
  }

  return {
    environment: nodeEnvironment,
    port: parsePort(environment.PORT),
    sessionSecret: configuredSecret || DEVELOPMENT_SESSION_SECRET,
  };
}

export function buildLivenessPayload(
  config: Pick<RuntimeConfig, "environment">,
  startedAtMs: number,
  nowMs = Date.now(),
) {
  return {
    status: "ok" as const,
    service: "propcopia",
    environment: config.environment,
    uptimeSeconds: Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)),
    timestamp: new Date(nowMs).toISOString(),
  };
}
