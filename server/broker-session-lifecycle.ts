export type DisconnectableBrokerSession = {
  disconnect(): Promise<void>;
};

export async function disconnectBrokerSessionQuietly(
  session: DisconnectableBrokerSession,
): Promise<boolean> {
  try {
    await session.disconnect();
    return true;
  } catch {
    return false;
  }
}

export async function replaceBrokerSession<TSession extends DisconnectableBrokerSession>(
  sessions: Map<string, TSession>,
  key: string,
  nextSession: TSession,
): Promise<void> {
  const previousSession = sessions.get(key);
  if (previousSession && previousSession !== nextSession) {
    await disconnectBrokerSessionQuietly(previousSession);
  }
  sessions.set(key, nextSession);
}
