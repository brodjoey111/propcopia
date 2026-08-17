const RULE_REASON_LABELS: Record<string, string> = {
  SYMBOL_BLOCKED: "Symbol blocked",
  FOLLOWER_DISABLED: "Follower disabled",
  ZERO_QUANTITY: "Quantity scaled to zero",
  MAX_TRADES_PER_DAY_REACHED: "Max trades per day reached",
  RISK_LIMIT_BREACHED: "Risk limit breached",
  RISK_DATA_UNAVAILABLE: "Risk data unavailable",
  INVALID_SYMBOL: "Invalid symbol",
  INVALID_TRADE_QUANTITY: "Invalid trade quantity",
  INVALID_TIMESTAMP: "Invalid trade timestamp",
};

export function formatRuleReasonLabel(reasonCode?: string | null): string | null {
  if (!reasonCode) {
    return null;
  }

  const knownLabel = RULE_REASON_LABELS[reasonCode];
  if (knownLabel) {
    return knownLabel;
  }

  return reasonCode
    .toLowerCase()
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
