import type { CopySizingMode } from './copy-group-types';
import { calculateFollowerOrder } from './trade-copy-engine';
import type { TradeSide } from './trading-domain';

export type RuleDecision = 'ALLOWED' | 'SKIPPED' | 'REJECTED';

export type RuleReasonCode =
  | 'FOLLOWER_DISABLED'
  | 'SYMBOL_NOT_ALLOWED'
  | 'SYMBOL_BLOCKED'
  | 'DIRECTION_NOT_ALLOWED'
  | 'TRADING_DAY_NOT_ALLOWED'
  | 'BEFORE_TRADING_START'
  | 'AFTER_TRADING_END'
  | 'MAX_TRADES_PER_DAY_REACHED'
  | 'MIN_ACCOUNT_BALANCE_NOT_MET'
  | 'MAX_OPEN_POSITIONS_REACHED'
  | 'COOLDOWN_AFTER_LOSS_ACTIVE'
  | 'ZERO_QUANTITY'
  | 'INVALID_FIXED_QUANTITY'
  | 'INVALID_MULTIPLIER';

export interface MasterTradeForRuleEvaluation {
  symbol: string;
  side: TradeSide;
  quantity: number;
  timestamp: string;
}

export interface FollowerRuleConfig {
  enabled: boolean;
  allowedSymbols?: string[] | null;
  blockedSymbols?: string[] | null;
  allowedDirections?: 'both' | 'long_only' | 'short_only' | null;
  tradingDays?: string[] | null;
  tradingStartTime?: string | null;
  tradingEndTime?: string | null;
  maxTradesPerDay?: number | null;
  maxContracts?: number | null;
  minAccountBalance?: number | null;
  maxOpenPositions?: number | null;
  cooldownAfterLoss?: number | null;
  sizingMode?: CopySizingMode | null;
  fixedQuantity?: number | null;
  multiplier?: number | null;
  reverseCopy?: boolean | null;
}

export interface FollowerRuntimeSnapshot {
  tradesToday: number;
  currentBalance?: number | null;
  currentOpenPositions: number;
  lastLossAt?: string | null;
  now: string;
}

export interface FollowerTradeRuleInput {
  trade: MasterTradeForRuleEvaluation;
  follower: FollowerRuleConfig;
  runtime: FollowerRuntimeSnapshot;
}

export interface AllowedTradeResult {
  decision: 'ALLOWED';
  reasonCode: null;
  side: TradeSide;
  quantity: number;
}

export interface SkippedTradeResult {
  decision: 'SKIPPED';
  reasonCode: RuleReasonCode;
  side?: TradeSide;
  quantity?: number;
}

export interface RejectedTradeResult {
  decision: 'REJECTED';
  reasonCode: RuleReasonCode;
  side?: TradeSide;
  quantity?: number;
}

export type FollowerTradeRuleResult =
  | AllowedTradeResult
  | SkippedTradeResult
  | RejectedTradeResult;

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function getUtcDayKey(timestamp: string): string {
  const day = new Date(timestamp).getUTCDay();
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day];
}

function getUtcMinutes(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesSince(lastTimestamp: string, nowTimestamp: string): number {
  return (new Date(nowTimestamp).getTime() - new Date(lastTimestamp).getTime()) / 60000;
}

export function evaluateFollowerTradeRule(
  input: FollowerTradeRuleInput
): FollowerTradeRuleResult {
  const { trade, follower, runtime } = input;
  const normalizedSymbol = normalizeSymbol(trade.symbol);

  if (!follower.enabled) {
    return {
      decision: 'SKIPPED',
      reasonCode: 'FOLLOWER_DISABLED',
    };
  }

  const allowedSymbols = follower.allowedSymbols?.map(normalizeSymbol) ?? [];
  if (allowedSymbols.length > 0 && !allowedSymbols.includes(normalizedSymbol)) {
    return {
      decision: 'SKIPPED',
      reasonCode: 'SYMBOL_NOT_ALLOWED',
    };
  }

  const blockedSymbols = follower.blockedSymbols?.map(normalizeSymbol) ?? [];
  if (blockedSymbols.includes(normalizedSymbol)) {
    return {
      decision: 'SKIPPED',
      reasonCode: 'SYMBOL_BLOCKED',
    };
  }

  if (
    (follower.allowedDirections === 'long_only' && trade.side !== 'BUY') ||
    (follower.allowedDirections === 'short_only' && trade.side !== 'SELL')
  ) {
    return {
      decision: 'SKIPPED',
      reasonCode: 'DIRECTION_NOT_ALLOWED',
    };
  }

  const tradingDays = follower.tradingDays ?? [];
  if (tradingDays.length > 0) {
    const nowDay = getUtcDayKey(runtime.now);
    const normalizedDays = tradingDays.map((day) => day.trim().toLowerCase());
    if (!normalizedDays.includes(nowDay)) {
      return {
        decision: 'SKIPPED',
        reasonCode: 'TRADING_DAY_NOT_ALLOWED',
      };
    }
  }

  const nowMinutes = getUtcMinutes(runtime.now);

  if (follower.tradingStartTime) {
    const startMinutes = parseTimeToMinutes(follower.tradingStartTime);
    if (startMinutes !== null && nowMinutes < startMinutes) {
      return {
        decision: 'SKIPPED',
        reasonCode: 'BEFORE_TRADING_START',
      };
    }
  }

  if (follower.tradingEndTime) {
    const endMinutes = parseTimeToMinutes(follower.tradingEndTime);
    if (endMinutes !== null && nowMinutes > endMinutes) {
      return {
        decision: 'SKIPPED',
        reasonCode: 'AFTER_TRADING_END',
      };
    }
  }

  if (
    follower.cooldownAfterLoss != null &&
    follower.cooldownAfterLoss > 0 &&
    runtime.lastLossAt
  ) {
    const elapsedMinutes = minutesSince(runtime.lastLossAt, runtime.now);
    if (elapsedMinutes < follower.cooldownAfterLoss) {
      return {
        decision: 'SKIPPED',
        reasonCode: 'COOLDOWN_AFTER_LOSS_ACTIVE',
      };
    }
  }

  if (
    follower.maxTradesPerDay != null &&
    runtime.tradesToday >= follower.maxTradesPerDay
  ) {
    return {
      decision: 'REJECTED',
      reasonCode: 'MAX_TRADES_PER_DAY_REACHED',
    };
  }

  if (
    follower.minAccountBalance != null &&
    runtime.currentBalance != null &&
    runtime.currentBalance < follower.minAccountBalance
  ) {
    return {
      decision: 'REJECTED',
      reasonCode: 'MIN_ACCOUNT_BALANCE_NOT_MET',
    };
  }

  if (
    follower.maxOpenPositions != null &&
    runtime.currentOpenPositions >= follower.maxOpenPositions
  ) {
    return {
      decision: 'REJECTED',
      reasonCode: 'MAX_OPEN_POSITIONS_REACHED',
    };
  }

  const sizingMode = follower.sizingMode ?? 'MULTIPLIER';
  const multiplier = follower.multiplier ?? 1.0;
  const reverseCopy = follower.reverseCopy ?? false;

  if (sizingMode === 'FIXED') {
    if (
      follower.fixedQuantity == null ||
      !Number.isFinite(follower.fixedQuantity) ||
      follower.fixedQuantity <= 0
    ) {
      return {
        decision: 'REJECTED',
        reasonCode: 'INVALID_FIXED_QUANTITY',
      };
    }
  } else if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return {
      decision: 'REJECTED',
      reasonCode: 'INVALID_MULTIPLIER',
    };
  }

  const sizingResult = calculateFollowerOrder({
    masterAction: trade.side,
    masterQuantity: trade.quantity,
    positionScaling: multiplier * 100,
    maxContracts: follower.maxContracts,
    copySizingMode: sizingMode,
    fixedQuantity: follower.fixedQuantity,
    reverseCopying: reverseCopy,
  });

  if (sizingResult.skipped) {
    return {
      decision: 'SKIPPED',
      reasonCode: 'ZERO_QUANTITY',
      side: sizingResult.action,
      quantity: sizingResult.quantity,
    };
  }

  return {
    decision: 'ALLOWED',
    reasonCode: null,
    side: sizingResult.action,
    quantity: sizingResult.quantity,
  };
}
