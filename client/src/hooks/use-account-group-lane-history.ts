import { useEffect, useState } from "react";
import type {
  CopyGroupActivity,
  CopyGroupObservability,
} from "@/lib/copy-groups";

interface UseAccountGroupLaneHistoryOptions {
  groupId: string;
  isDemo?: boolean;
  isUngrouped?: boolean;
  recentActivityPreview: CopyGroupActivity[];
}

interface CopyGroupLaneHistoryPayload {
  activity?: CopyGroupActivity[];
  observability?: CopyGroupObservability | null;
}

export function shouldResetAccountGroupLaneHistoryPreview(historyOpen: boolean) {
  return !historyOpen;
}

export function shouldLoadAccountGroupLaneHistory(input: {
  historyOpen: boolean;
  isUngrouped: boolean;
  isDemo: boolean;
}) {
  return input.historyOpen && !input.isUngrouped && !input.isDemo;
}

export async function fetchCopyGroupLaneHistory(
  groupId: string,
): Promise<CopyGroupLaneHistoryPayload> {
  const response = await fetch(`/api/copy-groups/${groupId}/activity`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load copy-group history");
  }

  return (await response.json()) as CopyGroupLaneHistoryPayload;
}

export function useAccountGroupLaneHistory({
  groupId,
  isDemo = false,
  isUngrouped = false,
  recentActivityPreview,
}: UseAccountGroupLaneHistoryOptions) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyActivity, setHistoryActivity] = useState<CopyGroupActivity[]>(recentActivityPreview);
  const [historyObservability, setHistoryObservability] = useState<CopyGroupObservability | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldResetAccountGroupLaneHistoryPreview(historyOpen)) {
      return;
    }

    setHistoryActivity(recentActivityPreview);
    setHistoryObservability(null);
  }, [historyOpen, recentActivityPreview]);

  useEffect(() => {
    if (
      !shouldLoadAccountGroupLaneHistory({
        historyOpen,
        isUngrouped,
        isDemo,
      })
    ) {
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void (async () => {
      const payload = await fetchCopyGroupLaneHistory(groupId);
      if (cancelled) {
        return;
      }

      setHistoryActivity(payload.activity ?? []);
      setHistoryObservability(payload.observability ?? null);
    })()
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setHistoryError(error instanceof Error ? error.message : "Unable to load history.");
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, historyOpen, isDemo, isUngrouped]);

  return {
    historyOpen,
    setHistoryOpen,
    historyActivity,
    historyObservability,
    historyLoading,
    historyError,
  };
}
