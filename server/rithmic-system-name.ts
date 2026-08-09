type RithmicAccountIdentity = {
  rithmicSystemName?: string | null;
  name: string;
};

const DEFAULT_RITHMIC_SYSTEM_NAME = "Rithmic Test";

export function resolveRithmicSystemName(account: RithmicAccountIdentity): string {
  const explicitSystemName = account.rithmicSystemName?.trim();
  if (explicitSystemName) {
    return explicitSystemName;
  }

  const suffixMatch = account.name.match(/\s[—–-]\s(.+)$/);
  const derivedSystemName = suffixMatch?.[1]?.trim();

  if (derivedSystemName) {
    return derivedSystemName;
  }

  return DEFAULT_RITHMIC_SYSTEM_NAME;
}
