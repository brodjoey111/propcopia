import type { LicenseSnapshot } from "@shared/billing";

export interface LicenseAccountUsage {
  masterAccounts: number;
  followerAccounts: number;
}

export interface LicenseSummary {
  title: string;
  detail: string;
  tone: "neutral" | "warn" | "danger";
}

function formatCapacity(current: number, limit: number | null): string {
  return limit === null ? `${current} / unlimited` : `${current} / ${limit}`;
}

export function buildLicenseSummary(
  license: LicenseSnapshot,
  usage: LicenseAccountUsage,
): LicenseSummary {
  if (!license.accessAllowed) {
    return {
      title: `${license.plan.name} - action required`,
      detail: "Account changes and trade-copy starts are locked until billing access is restored. Safety controls remain available.",
      tone: "danger",
    };
  }

  if (!license.enforcementEnabled) {
    return {
      title: `${license.plan.name} - active`,
      detail: "Development access is unrestricted while production billing is unavailable.",
      tone: "neutral",
    };
  }

  const masterLimit = license.plan.entitlements.maxMasterAccounts;
  const followerLimit = license.plan.entitlements.maxFollowerAccounts;
  const atCapacity =
    (masterLimit !== null && usage.masterAccounts >= masterLimit) ||
    (followerLimit !== null && usage.followerAccounts >= followerLimit);

  return {
    title: `${license.plan.name} - ${license.status}`,
    detail: `Master accounts: ${formatCapacity(usage.masterAccounts, masterLimit)}. Follower accounts: ${formatCapacity(usage.followerAccounts, followerLimit)}.`,
    tone: atCapacity ? "warn" : "neutral",
  };
}
