import { useEffect, useState } from "react";

interface UseDashboardDetailPreferencesOptions {
  usingMockData: boolean;
}

export function useDashboardDetailPreferences(
  options: UseDashboardDetailPreferencesOptions,
) {
  const [loadDetailSections, setLoadDetailSections] = useState(false);
  const [showAccountRoster, setShowAccountRoster] = useState(false);
  const [showOpenPositions, setShowOpenPositions] = useState(false);
  const [showCopyGroupDetail, setShowCopyGroupDetail] = useState(false);
  const [showPositionSyncDetail, setShowPositionSyncDetail] = useState(false);
  const [selectedPositionSyncGroupId, setSelectedPositionSyncGroupId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadDetailSections(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (options.usingMockData) {
      setShowAccountRoster(true);
      setShowOpenPositions(true);
      setShowCopyGroupDetail(true);
      setShowPositionSyncDetail(true);
    }
  }, [options.usingMockData]);

  useEffect(() => {
    if (!showPositionSyncDetail) {
      setSelectedPositionSyncGroupId(null);
    }
  }, [showPositionSyncDetail]);

  return {
    loadDetailSections,
    showAccountRoster,
    setShowAccountRoster,
    showOpenPositions,
    setShowOpenPositions,
    showCopyGroupDetail,
    setShowCopyGroupDetail,
    showPositionSyncDetail,
    setShowPositionSyncDetail,
    selectedPositionSyncGroupId,
    setSelectedPositionSyncGroupId,
  };
}
