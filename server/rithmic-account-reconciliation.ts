type RithmicDiscoveredAccount = {
  id: string;
  name?: string | null;
};

type FindBestMatchingRithmicAccountInput = {
  savedAccountId?: string | null;
  savedAccountName?: string | null;
  discoveredAccounts: RithmicDiscoveredAccount[];
};

function normalizeValue(value?: string | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function isLikelyPlaceholderAccountId(value?: string | null): boolean {
  if (!value) {
    return true;
  }

  return (
    value.endsWith('-primary') ||
    value.endsWith('-secondary') ||
    value.endsWith('-shared')
  );
}

export function findBestMatchingRithmicAccount(
  input: FindBestMatchingRithmicAccountInput,
): RithmicDiscoveredAccount | null {
  const discoveredAccounts = input.discoveredAccounts.filter(
    (account) => typeof account.id === 'string' && account.id.trim().length > 0,
  );

  if (discoveredAccounts.length === 0) {
    return null;
  }

  const savedAccountId = input.savedAccountId?.trim();
  if (savedAccountId) {
    const exactIdMatch = discoveredAccounts.find((account) => account.id === savedAccountId);
    if (exactIdMatch) {
      return exactIdMatch;
    }
  }

  const normalizedSavedAccountId = normalizeValue(savedAccountId);
  if (normalizedSavedAccountId) {
    const normalizedIdMatch = discoveredAccounts.find(
      (account) => normalizeValue(account.id) === normalizedSavedAccountId,
    );
    if (normalizedIdMatch) {
      return normalizedIdMatch;
    }
  }

  const savedAccountName = input.savedAccountName?.trim();
  if (savedAccountName) {
    const exactNameMatch = discoveredAccounts.find(
      (account) => (account.name ?? '').trim() === savedAccountName,
    );
    if (exactNameMatch) {
      return exactNameMatch;
    }
  }

  const normalizedSavedAccountName = normalizeValue(savedAccountName);
  if (normalizedSavedAccountName) {
    const normalizedNameMatch = discoveredAccounts.find(
      (account) => normalizeValue(account.name) === normalizedSavedAccountName,
    );
    if (normalizedNameMatch) {
      return normalizedNameMatch;
    }

    const idInsideNameMatch = discoveredAccounts.find((account) => {
      const normalizedAccountId = normalizeValue(account.id);
      return (
        normalizedAccountId.length > 0 &&
        (normalizedSavedAccountName.includes(normalizedAccountId) ||
          normalizeValue(account.name).includes(normalizedSavedAccountName))
      );
    });
    if (idInsideNameMatch) {
      return idInsideNameMatch;
    }
  }

  if (discoveredAccounts.length === 1 && isLikelyPlaceholderAccountId(savedAccountId)) {
    return discoveredAccounts[0];
  }

  return null;
}
