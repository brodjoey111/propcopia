import { useState, type Dispatch, type SetStateAction } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RithmicReadinessFollowUpItemView } from "@/lib/follow-up-operator";
import type { RithmicReadinessViewItem } from "@/lib/rithmic-readiness";

interface DashboardRithmicReadinessPanelProps {
  authUsername?: string;
  hasRithmicAccounts: boolean;
  rithmicReadinessItems: RithmicReadinessFollowUpItemView[];
  readinessByAccountId?: Record<string, RithmicReadinessViewItem | undefined>;
  reviewedRithmicReadinessCount: number;
  ownedRithmicReadinessCount: number;
  unownedRithmicReadinessCount: number;
  reassignedRithmicReadinessCount: number;
  rithmicReadinessNotes: Record<string, string>;
  setRithmicReadinessNotes: Dispatch<SetStateAction<Record<string, string>>>;
  isSavingReview: boolean;
  isRecheckingAll: boolean;
  isRecheckingItem: boolean;
  recheckingAccountId?: string;
  onRecheckAll: () => void;
  onTakeOwnership: (item: RithmicReadinessFollowUpItemView) => void;
  onSaveNote: (item: RithmicReadinessFollowUpItemView) => void;
  onRecheck: (item: RithmicReadinessFollowUpItemView) => void;
  onReview: (item: RithmicReadinessFollowUpItemView) => void;
  onReopen: (item: RithmicReadinessFollowUpItemView) => void;
}

export function DashboardRithmicReadinessPanel(
  props: DashboardRithmicReadinessPanelProps,
) {
  const [panelView, setPanelView] = useState<"compact" | "detailed">("compact");
  const openRithmicReadinessCount = props.rithmicReadinessItems.length;
  const reconnectProofNeededCount = props.rithmicReadinessItems.filter(
    (item) => props.readinessByAccountId?.[item.accountId]?.reconnectValidated === false,
  ).length;
  const offlineSessionCount = props.rithmicReadinessItems.filter(
    (item) => props.readinessByAccountId?.[item.accountId]?.sessionActive === false,
  ).length;

  if (!props.hasRithmicAccounts) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,11,16,0.98))] p-5 shadow-xl shadow-black/25">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Rithmic Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Saved-session follow-up</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Recheck reconnect proof and clear the saved-account blockers before the next session restart.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-sky-400/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15"
          onClick={props.onRecheckAll}
          disabled={openRithmicReadinessCount === 0 || props.isRecheckingAll}
        >
          {props.isRecheckingAll ? "Re-checking open items..." : "Re-check open items"}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["compact", "detailed"] as const).map((view) => (
          <Button
            key={view}
            type="button"
            variant="outline"
            size="sm"
            className={
              panelView === view
                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15"
                : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
            }
            onClick={() => setPanelView(view)}
          >
            {view === "compact" ? "Compact view" : "Detailed view"}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
          Reviewed {props.reviewedRithmicReadinessCount}
        </span>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
          Owned {props.ownedRithmicReadinessCount}
        </span>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
          Unowned {props.unownedRithmicReadinessCount}
        </span>
        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-100">
          Reassigned {props.reassignedRithmicReadinessCount}
        </span>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
          Reconnect proof needed {reconnectProofNeededCount}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-zinc-200">
          Session offline {offlineSessionCount}
        </span>
      </div>

      {openRithmicReadinessCount === 0 ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          All saved Rithmic accounts are ready for the next session check right now.
        </div>
      ) : (
        <div className="space-y-3">
          {props.rithmicReadinessItems.map((item) => {
            const readiness = props.readinessByAccountId?.[item.accountId];

            return (
              <div
                key={item.storyKey}
                className={`rounded-2xl border p-4 ${
                  item.severity === "error"
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-amber-500/20 bg-amber-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.accountName}</p>
                    <p className="mt-1 text-xs text-zinc-300">{item.title}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      item.review?.status === "reviewed"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : item.severity === "error"
                          ? "border-red-400/30 bg-red-400/10 text-red-200"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    }
                  >
                    {item.review?.status === "reviewed"
                      ? "Reviewed"
                      : readiness?.statusLabel ??
                        (item.severity === "error" ? "Needs review" : "Reconnect proof")}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-zinc-300">{item.detail}</p>
                {readiness?.sessionLabel ? (
                  <p className="mt-2 text-xs text-zinc-500">{readiness.sessionLabel}</p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">{item.actionLabel}</p>
                )}
                {readiness ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-zinc-200">
                      {readiness.sessionActive ? "Session active" : "Session offline"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 ${
                        readiness.reconnectBadgeTone === "ok"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                      }`}
                    >
                      {readiness.reconnectBadgeLabel}
                    </span>
                  </div>
                ) : null}
                {readiness ? (
                  <p className="mt-2 text-xs text-zinc-400">Reconnect drift: {readiness.reconnectLabel}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  {item.review?.operatorName ? (
                    <span>Operator owner: {item.review.operatorName}</span>
                  ) : (
                    <span>Operator owner: Unassigned</span>
                  )}
                  {(item.review?.operatorHistory?.length ?? 0) > 0 ? (
                    <span>Ownership changes: {item.review?.operatorHistory?.length}</span>
                  ) : null}
                  {item.review?.reviewedAt ? (
                    <span>
                      Reviewed at {new Date(item.review.reviewedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  ) : null}
                </div>

                {panelView === "detailed" ? (
                  <div className="mt-3 space-y-3">
                    <Input
                      value={props.rithmicReadinessNotes[item.storyKey] ?? item.review?.note ?? ""}
                      onChange={(event) =>
                        props.setRithmicReadinessNotes((current) => ({
                          ...current,
                          [item.storyKey]: event.target.value,
                        }))
                      }
                      placeholder="Shared reconnect review note"
                      className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                    />
                    {(item.review?.operatorHistory?.length ?? 0) > 0 ? (
                      <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                          Ownership Timeline
                        </p>
                        <div className="mt-2 space-y-2">
                          {item.review?.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                            <div
                              key={`${item.storyKey}-dashboard-rithmic-owner-${index}`}
                              className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                            >
                              <p className="text-zinc-200">
                                {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}
                              </p>
                              {assignment.reason ? (
                                <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Compact view keeps the dashboard lighter. Switch to detailed view for notes and ownership history.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                    onClick={() => props.onTakeOwnership(item)}
                  >
                    {item.review?.operatorName === props.authUsername ? "Refresh owner" : "Take ownership"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => props.onSaveNote(item)}
                    disabled={props.isSavingReview}
                  >
                    Save note
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-sky-400/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15"
                    onClick={() => props.onRecheck(item)}
                    disabled={props.isRecheckingItem}
                  >
                    {props.isRecheckingItem && props.recheckingAccountId === item.accountId
                      ? "Re-checking..."
                      : "Re-check readiness"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={
                      item.review?.status === "reviewed"
                        ? "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    }
                    onClick={() =>
                      item.review?.status === "reviewed"
                        ? props.onReopen(item)
                        : props.onReview(item)
                    }
                    disabled={props.isSavingReview}
                  >
                    {props.isSavingReview
                      ? "Saving review..."
                      : item.review?.status === "reviewed"
                        ? "Reopen"
                        : "Mark reviewed"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
