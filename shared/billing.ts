export const BILLING_PLAN_IDS = ["development", "starter", "professional", "enterprise"] as const;
export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export const LICENSE_STATUSES = ["active", "trialing", "past_due", "canceled", "inactive"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export interface PlanEntitlements {
  maxMasterAccounts: number | null;
  maxFollowerAccounts: number | null;
  tradeHistory: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
}

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  monthlyPriceUsd: number | null;
  entitlements: PlanEntitlements;
}

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  development: {
    id: "development",
    name: "Development Access",
    monthlyPriceUsd: null,
    entitlements: {
      maxMasterAccounts: null,
      maxFollowerAccounts: null,
      tradeHistory: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPriceUsd: 49,
    entitlements: {
      maxMasterAccounts: 1,
      maxFollowerAccounts: 3,
      tradeHistory: true,
      advancedAnalytics: false,
      apiAccess: false,
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    monthlyPriceUsd: 149,
    entitlements: {
      maxMasterAccounts: 1,
      maxFollowerAccounts: 10,
      tradeHistory: true,
      advancedAnalytics: true,
      apiAccess: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPriceUsd: 399,
    entitlements: {
      maxMasterAccounts: null,
      maxFollowerAccounts: null,
      tradeHistory: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
};

export interface LicenseSnapshot {
  plan: BillingPlan;
  status: LicenseStatus;
  accessAllowed: boolean;
  enforcementEnabled: boolean;
  source: "development" | "stripe";
  currentPeriodEnd: string | null;
}
