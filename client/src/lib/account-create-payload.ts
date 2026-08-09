type BaseAddedAccount = {
  name: string;
  platform: 'Tradovate' | 'Rithmic' | 'Tradeify';
  accountType: 'master' | 'follower';
};

export type AccountCreatePayload = ReturnType<typeof buildAccountCreatePayload>;

type SelectedFetchedAccount = {
  id: number | string;
  name: string;
};

type TradovateAddedAccount = BaseAddedAccount & {
  platform: 'Tradovate';
  tradovateUsername?: string | null;
  tradovateAccountId?: string | null;
  tradovateEnvironment?: 'demo' | 'live' | null;
  username?: string;
  environment?: 'demo' | 'live';
};

type RithmicAddedAccount = BaseAddedAccount & {
  platform: 'Rithmic';
  rithmicUsername?: string | null;
  rithmicAccountId?: string | null;
  rithmicPassword?: string | null;
  rithmicEnvironment?: 'test' | 'live' | null;
  rithmicSystemName?: string | null;
  rithmicExchange?: string | null;
};

type TradeifyAddedAccount = BaseAddedAccount & {
  platform: 'Tradeify';
  tradeifyUsername?: string | null;
  tradeifyAccountId?: string | null;
  tradeifyApiKey?: string | null;
};

export type AddedAccountInput =
  | TradovateAddedAccount
  | RithmicAddedAccount
  | TradeifyAddedAccount;

type BuildFetchedAccountCreatePayloadInput =
  | {
      account: SelectedFetchedAccount;
      platform: 'tradovate';
      accountType: 'master' | 'follower';
      username: string;
      environment: 'demo' | 'live';
    }
  | {
      account: SelectedFetchedAccount;
      platform: 'rithmic';
      accountType: 'master' | 'follower';
      username: string;
      password: string;
      environment: 'test' | 'live';
      systemName?: string;
      exchange?: string;
    }
  | {
      account: SelectedFetchedAccount;
      platform: 'tradeify';
      accountType: 'master' | 'follower';
      username: string;
      apiKey: string;
    };

export function buildAccountCreatePayload(newAccount: AddedAccountInput) {
  const payload: Record<string, unknown> = {
    name: newAccount.name,
    platform: newAccount.platform,
    accountType: newAccount.accountType,
    isConnected: false,
    ...(newAccount.accountType === 'follower' ? { positionScaling: 100 } : {}),
  };

  if (newAccount.platform === 'Tradovate') {
    payload.tradovateUsername = newAccount.tradovateUsername ?? newAccount.username ?? null;
    payload.tradovateAccountId = newAccount.tradovateAccountId ?? null;
    payload.tradovateEnvironment =
      newAccount.tradovateEnvironment ?? newAccount.environment ?? null;
    return payload;
  }

  if (newAccount.platform === 'Rithmic') {
    payload.rithmicUsername = newAccount.rithmicUsername ?? null;
    payload.rithmicAccountId = newAccount.rithmicAccountId ?? null;
    payload.rithmicPassword = newAccount.rithmicPassword ?? null;
    payload.rithmicEnvironment = newAccount.rithmicEnvironment ?? null;
    payload.rithmicSystemName = newAccount.rithmicSystemName ?? null;
    payload.rithmicExchange = newAccount.rithmicExchange ?? null;
    return payload;
  }

  payload.tradeifyUsername = newAccount.tradeifyUsername ?? null;
  payload.tradeifyAccountId = newAccount.tradeifyAccountId ?? null;
  payload.tradeifyApiKey = newAccount.tradeifyApiKey ?? null;
  return payload;
}

export function buildFetchedAccountCreatePayload(
  input: BuildFetchedAccountCreatePayloadInput,
): AccountCreatePayload {
  if (input.platform === 'tradovate') {
    return buildAccountCreatePayload({
      name: input.account.name,
      platform: 'Tradovate',
      accountType: input.accountType,
      tradovateUsername: input.username,
      tradovateAccountId: String(input.account.id),
      tradovateEnvironment: input.environment,
    });
  }

  if (input.platform === 'rithmic') {
    return buildAccountCreatePayload({
      name: input.account.name,
      platform: 'Rithmic',
      accountType: input.accountType,
      rithmicUsername: input.username,
      rithmicAccountId: String(input.account.id),
      rithmicPassword: input.password,
      rithmicEnvironment: input.environment,
      rithmicSystemName: input.systemName ?? null,
      rithmicExchange: input.exchange ?? null,
    });
  }

  return buildAccountCreatePayload({
    name: input.account.name,
    platform: 'Tradeify',
    accountType: input.accountType,
    tradeifyUsername: input.username,
    tradeifyAccountId: String(input.account.id),
    tradeifyApiKey: input.apiKey,
  });
}
