export type AccountRosterFilter = "all" | "connected" | "disconnected" | "master" | "follower";
export type AccountRosterSort = "name" | "connection" | "role";

export function normalizeAccountRosterFilter(value: string | null): AccountRosterFilter {
  return value === "connected" ||
    value === "disconnected" ||
    value === "master" ||
    value === "follower"
    ? value
    : "all";
}

export function normalizeAccountRosterSort(value: string | null): AccountRosterSort {
  return value === "connection" || value === "role" ? value : "name";
}

export interface AccountRosterItem {
  account: {
    id: string;
    name: string;
    platform: string;
    accountType: string;
    isConnected: boolean | null;
  };
}

function matchesFilter(item: AccountRosterItem, filter: AccountRosterFilter): boolean {
  if (filter === "connected") return !!item.account.isConnected;
  if (filter === "disconnected") return !item.account.isConnected;
  if (filter === "master" || filter === "follower") return item.account.accountType === filter;
  return true;
}

export function filterAndSortAccountRoster<T extends AccountRosterItem>(
  items: T[],
  options: {
    query: string;
    filter: AccountRosterFilter;
    sort: AccountRosterSort;
  },
): T[] {
  const query = options.query.trim().toLocaleLowerCase();
  const filtered = items.filter((item) => {
    if (!matchesFilter(item, options.filter)) return false;
    if (!query) return true;
    return [item.account.name, item.account.platform, item.account.accountType]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });

  return filtered.sort((left, right) => {
    if (options.sort === "connection") {
      const connectionDifference = Number(!!right.account.isConnected) - Number(!!left.account.isConnected);
      if (connectionDifference !== 0) return connectionDifference;
    }
    if (options.sort === "role") {
      const roleRank = (role: string) => role === "master" ? 0 : role === "follower" ? 1 : 2;
      const roleDifference = roleRank(left.account.accountType) - roleRank(right.account.accountType);
      if (roleDifference !== 0) return roleDifference;
    }
    return left.account.name.localeCompare(right.account.name, undefined, { sensitivity: "base" });
  });
}
