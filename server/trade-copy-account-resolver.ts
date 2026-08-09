import type { Account } from '@shared/schema';
import type { FollowerBrokerConfig } from './trade-copy-engine';
import { resolveRithmicSystemName } from './rithmic-system-name';

export interface TradovateSessionLike {
  isTokenValid(): boolean;
  getAccessToken(): string | null;
}

export interface MasterConnectionResolution {
  platform: 'Tradovate' | 'Rithmic';
  masterUsername?: string;
  accessToken?: string;
  rithmicCredentials?: {
    username: string;
    password: string;
    environment: 'test' | 'live';
    systemName: string;
  };
}

export interface FollowerConnectionResolution {
  account: Account;
  brokerConfig: FollowerBrokerConfig;
}

export interface FollowerConnectionOverrides {
  positionScaling?: number;
  maxContracts?: number | null;
  blockedTickers?: string[];
  exchange?: string;
}

type ResolveMasterConnectionInput = {
  account: Account;
  providedUsername?: string;
  tradovateInstances: Map<string, TradovateSessionLike>;
};

type ResolveFollowerConnectionInput = {
  account: Account;
  overrides?: FollowerConnectionOverrides;
  providedFollowerUsername?: string;
  tradovateInstances: Map<string, TradovateSessionLike>;
};

type ResolveFollowerConnectionsInput = {
  accounts: Account[];
  followerAccountIds: string[];
  defaultOverrides?: FollowerConnectionOverrides;
  overridesByAccountId?: Record<string, FollowerConnectionOverrides | undefined>;
  providedFollowerUsernames?: Record<string, string | undefined>;
  tradovateInstances: Map<string, TradovateSessionLike>;
};

function normalizeFollowerAccount(
  account: Account,
  overrides?: ResolveFollowerConnectionInput['overrides'],
): Account {
  return {
    ...account,
    positionScaling: overrides?.positionScaling ?? account.positionScaling,
    maxContracts: overrides?.maxContracts ?? account.maxContracts,
    blockedTickers: overrides?.blockedTickers ?? account.blockedTickers,
  };
}

export function resolveTradeCopyMasterConnection(
  input: ResolveMasterConnectionInput,
): MasterConnectionResolution {
  if (input.account.platform === 'Tradovate') {
    const masterUsername = input.providedUsername ?? input.account.tradovateUsername ?? undefined;
    if (!masterUsername) {
      throw new Error('Tradovate master username is missing for this saved account.');
    }

    const masterTradovate = input.tradovateInstances.get(masterUsername);
    if (!masterTradovate || !masterTradovate.isTokenValid()) {
      throw new Error('Master account not authenticated or token expired');
    }

    const accessToken = masterTradovate.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token for master account');
    }

    return {
      platform: 'Tradovate',
      masterUsername,
      accessToken,
    };
  }

  if (input.account.platform === 'Rithmic') {
    if (!input.account.rithmicUsername || !input.account.rithmicPassword) {
      throw new Error('Rithmic credentials are missing for this saved master account.');
    }

    return {
      platform: 'Rithmic',
      rithmicCredentials: {
        username: input.account.rithmicUsername,
        password: input.account.rithmicPassword,
        environment: (input.account.rithmicEnvironment as 'test' | 'live') ?? 'test',
        systemName: resolveRithmicSystemName(input.account),
      },
    };
  }

  throw new Error(`Trade copy master is not supported for platform ${input.account.platform}.`);
}

export function resolveTradeCopyFollowerConnection(
  input: ResolveFollowerConnectionInput,
): FollowerConnectionResolution {
  const normalizedAccount = normalizeFollowerAccount(input.account, input.overrides);

  if (input.account.platform === 'Tradovate') {
    const followerUsername =
      input.providedFollowerUsername ?? input.account.tradovateUsername ?? undefined;

    if (!followerUsername) {
      throw new Error('Tradovate follower username is missing for this saved account.');
    }

    const followerTradovate = input.tradovateInstances.get(followerUsername);
    if (!followerTradovate || !followerTradovate.isTokenValid()) {
      throw new Error('Follower account not authenticated or token expired');
    }

    const accessToken = followerTradovate.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token for follower account');
    }

    return {
      account: normalizedAccount,
      brokerConfig: {
        kind: 'legacy_websocket',
        accessToken,
      },
    };
  }

  if (input.account.platform === 'Rithmic') {
    if (!input.account.rithmicUsername || !input.account.rithmicPassword) {
      throw new Error('Rithmic credentials are missing for this saved follower account.');
    }

    const exchange =
      input.overrides?.exchange?.trim() ||
      input.account.rithmicExchange?.trim() ||
      undefined;
    if (!exchange) {
      throw new Error('Rithmic follower accounts require an exchange, for example CME.');
    }

    return {
      account: normalizedAccount,
      brokerConfig: {
        kind: 'rithmic',
        environment: (input.account.rithmicEnvironment as 'test' | 'live') ?? 'test',
        username: input.account.rithmicUsername,
        password: input.account.rithmicPassword,
        exchange,
        systemName: resolveRithmicSystemName(input.account),
      },
    };
  }

  throw new Error(`Trade copy follower is not supported for platform ${input.account.platform}.`);
}

export function resolveTradeCopyFollowerConnections(
  input: ResolveFollowerConnectionsInput,
): FollowerConnectionResolution[] {
  const accountsById = new Map(input.accounts.map((account) => [account.id, account]));

  return input.followerAccountIds.map((followerAccountId) => {
    const account = accountsById.get(followerAccountId);
    if (!account) {
      throw new Error(`Follower account not found: ${followerAccountId}`);
    }

    const accountOverrides = input.overridesByAccountId?.[followerAccountId];

    return resolveTradeCopyFollowerConnection({
      account,
      overrides: {
        ...input.defaultOverrides,
        ...accountOverrides,
      },
      providedFollowerUsername: input.providedFollowerUsernames?.[followerAccountId],
      tradovateInstances: input.tradovateInstances,
    });
  });
}
