import { Crown } from "lucide-react";

export function getAccountGroupsMasterDragBadgeLabel() {
  return "Set as Master";
}

export function AccountGroupsMasterDragBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 shadow-xl shadow-amber-500/20 backdrop-blur-sm">
      <Crown className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
        {getAccountGroupsMasterDragBadgeLabel()}
      </span>
    </div>
  );
}
