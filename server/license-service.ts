import {
  BILLING_PLAN_IDS,
  BILLING_PLANS,
  LICENSE_STATUSES,
  type BillingPlanId,
  type LicenseSnapshot,
  type LicenseStatus,
} from "@shared/billing";

interface StoredLicenseState {
  licensePlan?: string | null;
  licenseStatus?: string | null;
  licenseCurrentPeriodEnd?: Date | string | null;
  stripeCustomerId?: string | null;
}

function isPlanId(value: string | null | undefined): value is BillingPlanId {
  return BILLING_PLAN_IDS.includes(value as BillingPlanId);
}

function isLicenseStatus(value: string | null | undefined): value is LicenseStatus {
  return LICENSE_STATUSES.includes(value as LicenseStatus);
}

function serializePeriodEnd(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildLicenseSnapshot(state: StoredLicenseState): LicenseSnapshot {
  const planId = isPlanId(state.licensePlan) ? state.licensePlan : "development";
  const status = isLicenseStatus(state.licenseStatus) ? state.licenseStatus : "active";
  const source = state.stripeCustomerId ? "stripe" : "development";

  return {
    plan: BILLING_PLANS[planId],
    status,
    accessAllowed: source === "development" || status === "active" || status === "trialing",
    enforcementEnabled: source === "stripe",
    source,
    currentPeriodEnd: serializePeriodEnd(state.licenseCurrentPeriodEnd),
  };
}
