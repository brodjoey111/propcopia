import type { OperationalLogLevel } from "./operational-logger";

const DEFAULT_CLIENT_MESSAGE = "Request could not be completed";
const DEFAULT_SERVER_MESSAGE = "Internal Server Error";

export interface NormalizedHttpError {
  statusCode: number;
  publicMessage: string;
  logLevel: Extract<OperationalLogLevel, "warn" | "error">;
}

function readErrorProperty(error: unknown, key: "status" | "statusCode" | "message"): unknown {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  return (error as Record<string, unknown>)[key];
}

export function normalizeHttpError(error: unknown): NormalizedHttpError {
  const statusCandidate = readErrorProperty(error, "status") ?? readErrorProperty(error, "statusCode");
  const statusCode = typeof statusCandidate === "number"
    && Number.isInteger(statusCandidate)
    && statusCandidate >= 400
    && statusCandidate <= 599
    ? statusCandidate
    : 500;
  const messageCandidate = readErrorProperty(error, "message");
  const clientMessage = typeof messageCandidate === "string" && messageCandidate.trim()
    ? messageCandidate.trim()
    : DEFAULT_CLIENT_MESSAGE;

  if (statusCode >= 500) {
    return {
      statusCode,
      publicMessage: DEFAULT_SERVER_MESSAGE,
      logLevel: "error",
    };
  }

  return {
    statusCode,
    publicMessage: clientMessage,
    logLevel: "warn",
  };
}
