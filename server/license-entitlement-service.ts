import type { LicenseSnapshot } from "@shared/billing";

export type LicensedAccountType = "master" | "follower";

export type LicenseEntitlementDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "LICENSE_INACTIVE" | "ACCOUNT_LIMIT_REACHED";
      message: string;
      current?: number;
      limit?: number;
    };

export type TradingLicenseDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "LICENSE_INACTIVE";
      message: string;
    };

type AccountSummary = {
  id: string;
  accountType: string;
};

export function evaluateTradingLicense(
  license: LicenseSnapshot,
): TradingLicenseDecision {
  if (license.accessAllowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "LICENSE_INACTIVE",
    message: "Your subscription is not active. Restore billing access before starting or resuming trade copying.",
  };
}

export function evaluateAccountEntitlement(input: {
  license: LicenseSnapshot;
  accounts: AccountSummary[];
  requestedType: LicensedAccountType;
  excludeAccountId?: string;
}): LicenseEntitlementDecision {
  if (!input.license.accessAllowed) {
    return {
      allowed: false,
      code: "LICENSE_INACTIVE",
      message: "Your subscription is not active. Restore billing access before adding or changing accounts.",
    };
  }

  if (!input.license.enforcementEnabled) {
    return { allowed: true };
  }

  const limit = input.requestedType === "master"
    ? input.license.plan.entitlements.maxMasterAccounts
    : input.license.plan.entitlements.maxFollowerAccounts;
  if (limit === null) {
    return { allowed: true };
  }

  const current = input.accounts.filter((account) =>
    account.id !== input.excludeAccountId && account.accountType === input.requestedType
  ).length;
  if (current < limit) {
    return { allowed: true };
  }

  const label = input.requestedType === "master" ? "master" : "follower";
  return {
    allowed: false,
    code: "ACCOUNT_LIMIT_REACHED",
    message: `${input.license.plan.name} allows ${limit} ${label} account${limit === 1 ? "" : "s"}. Upgrade the plan or remove an existing ${label} account first.`,
    current,
    limit,
  };
}
