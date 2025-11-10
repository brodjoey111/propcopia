import type { Account } from "@shared/schema";

export interface TitleCriteria {
  title: string;
  minPnL?: number;
  maxPnL?: number;
  minWinRate?: number;
}

export const titleTiers: TitleCriteria[] = [
  {
    title: "Elite Trader",
    minPnL: 10000,
    minWinRate: 60,
  },
  {
    title: "Senior Trader",
    minPnL: 5000,
    minWinRate: 55,
  },
  {
    title: "Trader",
    minPnL: 0,
  },
  {
    title: "Degenerate",
    maxPnL: -1,
  },
  {
    title: "Novice Trader",
  },
];

export function calculateCompetitiveTitle(accounts: Account[]): string {
  if (!accounts || accounts.length === 0) {
    return "Novice Trader";
  }

  const totalPnL = accounts.reduce((sum, account) => {
    const pnl = typeof account.pnl === 'string' ? parseFloat(account.pnl) : (account.pnl || 0);
    return sum + pnl;
  }, 0);

  const totalBalance = accounts.reduce((sum, account) => {
    const balance = typeof account.balance === 'string' ? parseFloat(account.balance) : (account.balance || 0);
    return sum + balance;
  }, 0);

  for (const tier of titleTiers) {
    if (tier.minPnL !== undefined && totalPnL >= tier.minPnL) {
      return tier.title;
    }
    
    if (tier.maxPnL !== undefined && totalPnL <= tier.maxPnL) {
      return tier.title;
    }
  }

  return "Novice Trader";
}
