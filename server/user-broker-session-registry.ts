export type UserBrokerSessionEntry<TSession> = {
  userId: string;
  username: string;
  session: TSession;
};

export class UserBrokerSessionRegistry<TSession> {
  private readonly sessionsByUser = new Map<string, Map<string, TSession>>();

  forUser(userId: string): Map<string, TSession> {
    let sessions = this.sessionsByUser.get(userId);
    if (!sessions) {
      sessions = new Map<string, TSession>();
      this.sessionsByUser.set(userId, sessions);
    }
    return sessions;
  }

  drain(): UserBrokerSessionEntry<TSession>[] {
    const entries: UserBrokerSessionEntry<TSession>[] = [];
    this.sessionsByUser.forEach((sessions, userId) => {
      sessions.forEach((session, username) => {
        entries.push({ userId, username, session });
      });
    });
    this.sessionsByUser.clear();
    return entries;
  }

  get userCount(): number {
    return this.sessionsByUser.size;
  }
}
