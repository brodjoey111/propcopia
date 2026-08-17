import type { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";

type SavedRithmicAccount = {
  id: string;
  rithmicUsername: string | null;
  rithmicPassword: string | null;
  rithmicEnvironment: string | null;
};

type RithmicSession = {
  authenticate(): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<void>;
};

type RithmicSessionFactory<TSession extends RithmicSession> = (credentials: {
  username: string;
  password: string;
  environment: "test";
  systemName: string;
}) => TSession;

type SavedReconnectInput<TAccount extends SavedRithmicAccount, TSession extends RithmicSession> = {
  account: TAccount;
  systemName: string;
  sessions: Map<string, TSession>;
  validationStore: Pick<RithmicReconnectValidationStore, "markValidated">;
  createSession: RithmicSessionFactory<TSession>;
  refreshIdentity: (account: TAccount, session: TSession) => Promise<TAccount>;
  now?: () => string;
};

export type SavedRithmicReconnectResult<TAccount> =
  | { success: true; account: TAccount }
  | { success: false; message: string };

async function disconnectQuietly(session: RithmicSession): Promise<void> {
  try {
    await session.disconnect();
  } catch {
    // Cleanup must not hide the authentication or refresh error that caused it.
  }
}

export async function reconnectSavedRithmicTestAccount<
  TAccount extends SavedRithmicAccount,
  TSession extends RithmicSession,
>({
  account,
  systemName,
  sessions,
  validationStore,
  createSession,
  refreshIdentity,
  now = () => new Date().toISOString(),
}: SavedReconnectInput<TAccount, TSession>): Promise<SavedRithmicReconnectResult<TAccount>> {
  if (!account.rithmicUsername || !account.rithmicPassword) {
    return {
      success: false,
      message: "Rithmic credentials are missing for this saved account.",
    };
  }

  if (account.rithmicEnvironment && account.rithmicEnvironment !== "test") {
    return {
      success: false,
      message: "Only Rithmic Test saved accounts can be connected during this phase.",
    };
  }

  const username = account.rithmicUsername;
  const session = createSession({
    username,
    password: account.rithmicPassword,
    environment: "test",
    systemName,
  });

  try {
    const authentication = await session.authenticate();
    if (!authentication.success) {
      await disconnectQuietly(session);
      return {
        success: false,
        message: authentication.message,
      };
    }

    const refreshedAccount = await refreshIdentity(account, session);
    const previousSession = sessions.get(username);
    if (previousSession && previousSession !== session) {
      await disconnectQuietly(previousSession);
    }

    sessions.set(username, session);
    validationStore.markValidated(refreshedAccount.id, {
      validatedAt: now(),
      source: "saved_connect",
    });

    return { success: true, account: refreshedAccount };
  } catch (error) {
    await disconnectQuietly(session);
    throw error;
  }
}
