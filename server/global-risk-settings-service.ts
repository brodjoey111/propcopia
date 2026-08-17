import type { AccountRiskSettingsPatch } from './account-risk-settings';
import { parseAccountRiskSettingsPatch } from './account-risk-settings';

export const DEFAULT_GLOBAL_RISK_SETTINGS = {
  positionScaling: 100,
  maxContracts: null,
  maxOpenPositions: null,
  allowedDirections: 'both',
  maxDailyLoss: null,
  maxDailyLossPct: null,
  maxWeeklyLoss: null,
  maxWeeklyLossPct: null,
  maxDrawdownPct: null,
  maxConsecutiveLosses: null,
  blockedTickers: [],
  allowedTickers: [],
  maxTradesPerDay: null,
  minAccountBalance: null,
  tradingStartTime: null,
  tradingEndTime: null,
  tradingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  cooldownAfterLoss: null,
  onBreachAction: 'pause',
} satisfies AccountRiskSettingsPatch;

export type GlobalRiskSettings = typeof DEFAULT_GLOBAL_RISK_SETTINGS;

export function parseGlobalRiskSettings(input: unknown):
  | { success: true; data: GlobalRiskSettings }
  | { success: false; message: string; errors: Record<string, string[]> } {
  const parsed = parseAccountRiskSettingsPatch(input);
  if (!parsed.success) {
    return parsed;
  }

  const merged = {
    ...DEFAULT_GLOBAL_RISK_SETTINGS,
    ...parsed.data,
  };
  delete (merged as Partial<AccountRiskSettingsPatch>).riskMode;

  return {
    success: true,
    data: merged as GlobalRiskSettings,
  };
}

export function readStoredGlobalRiskSettings(
  value: string | null | undefined,
  legacy: {
    positionScaling?: number | null;
    maxContracts?: number | null;
    blockedTickers?: string[] | null;
  } = {},
): GlobalRiskSettings {
  if (!value) {
    const parsedLegacy = parseGlobalRiskSettings({
      positionScaling: legacy.positionScaling ?? DEFAULT_GLOBAL_RISK_SETTINGS.positionScaling,
      maxContracts: legacy.maxContracts ?? null,
      blockedTickers: legacy.blockedTickers ?? [],
    });
    return parsedLegacy.success ? parsedLegacy.data : { ...DEFAULT_GLOBAL_RISK_SETTINGS };
  }

  try {
    const parsed = parseGlobalRiskSettings(JSON.parse(value));
    return parsed.success ? parsed.data : { ...DEFAULT_GLOBAL_RISK_SETTINGS };
  } catch {
    return { ...DEFAULT_GLOBAL_RISK_SETTINGS };
  }
}

export function buildGlobalRiskAccountUpdate(settings: GlobalRiskSettings) {
  return {
    positionScaling: settings.positionScaling,
    maxContracts: settings.maxContracts,
    maxOpenPositions: settings.maxOpenPositions,
    allowedDirections: settings.allowedDirections,
    maxDailyLoss: settings.maxDailyLoss === null ? null : String(settings.maxDailyLoss),
    maxDailyLossPct: settings.maxDailyLossPct === null ? null : String(settings.maxDailyLossPct),
    maxWeeklyLoss: settings.maxWeeklyLoss === null ? null : String(settings.maxWeeklyLoss),
    maxWeeklyLossPct:
      settings.maxWeeklyLossPct === null ? null : String(settings.maxWeeklyLossPct),
    maxDrawdownPct: settings.maxDrawdownPct === null ? null : String(settings.maxDrawdownPct),
    maxConsecutiveLosses: settings.maxConsecutiveLosses,
    blockedTickers: settings.blockedTickers,
    allowedTickers: settings.allowedTickers,
    maxTradesPerDay: settings.maxTradesPerDay,
    minAccountBalance:
      settings.minAccountBalance === null ? null : String(settings.minAccountBalance),
    tradingStartTime: settings.tradingStartTime,
    tradingEndTime: settings.tradingEndTime,
    tradingDays: settings.tradingDays,
    cooldownAfterLoss: settings.cooldownAfterLoss,
    onBreachAction: settings.onBreachAction,
  };
}
