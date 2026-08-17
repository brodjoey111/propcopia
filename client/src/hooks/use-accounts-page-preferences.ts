import { useEffect, useState } from "react";

import {
  DEFAULT_RISK_SETTINGS,
  type RiskSettings,
} from "@/components/risk-settings-dialog";

export type AccountsViewMode = "grid" | "list" | "table" | "groups";

interface UseAccountsPagePreferencesOptions {
  connectedAccountIds: string[];
  serverMasterAccountId?: string | null;
}

export function useAccountsPagePreferences(
  options: UseAccountsPagePreferencesOptions,
) {
  const [viewMode, setViewMode] = useState<AccountsViewMode>("grid");
  const [sessionMasterAccountId, setSessionMasterAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("copy-session-master-account-id");
    } catch {
      return null;
    }
  });
  const [globalSettings, setGlobalSettings] = useState<RiskSettings>(() => {
    try {
      const saved = localStorage.getItem("global-risk-settings-v1");
      return saved
        ? { ...DEFAULT_RISK_SETTINGS, ...JSON.parse(saved) }
        : { ...DEFAULT_RISK_SETTINGS };
    } catch {
      return { ...DEFAULT_RISK_SETTINGS };
    }
  });
  const [globalSettingsServerSynced, setGlobalSettingsServerSynced] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("accounts-view-mode");
      if (saved) {
        setViewMode(saved as AccountsViewMode);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    void fetch("/api/risk-settings/global", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (cancelled || !payload?.settings) {
          return;
        }

        const cachedSettings = localStorage.getItem("global-risk-settings-v1");
        setGlobalSettingsServerSynced(Boolean(payload.stored));
        if (!payload.stored && cachedSettings) {
          return;
        }

        const settings = { ...DEFAULT_RISK_SETTINGS, ...payload.settings };
        setGlobalSettings(settings);
        localStorage.setItem("global-risk-settings-v1", JSON.stringify(settings));
      })
      .catch(() => {
        // The local cache remains available while the server is offline.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accounts-view-mode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (sessionMasterAccountId) {
      localStorage.setItem("copy-session-master-account-id", sessionMasterAccountId);
    } else {
      localStorage.removeItem("copy-session-master-account-id");
    }
  }, [sessionMasterAccountId]);

  useEffect(() => {
    if (options.serverMasterAccountId) {
      setSessionMasterAccountId(options.serverMasterAccountId);
      return;
    }

    if (options.connectedAccountIds.length === 0) {
      setSessionMasterAccountId(null);
      return;
    }

    if (
      sessionMasterAccountId &&
      options.connectedAccountIds.includes(sessionMasterAccountId)
    ) {
      return;
    }

    setSessionMasterAccountId(options.connectedAccountIds[0] ?? null);
  }, [options.connectedAccountIds, options.serverMasterAccountId, sessionMasterAccountId]);

  const saveGlobalSettings = (settings: RiskSettings) => {
    setGlobalSettings(settings);
    setGlobalSettingsServerSynced(true);
    try {
      localStorage.setItem("global-risk-settings-v1", JSON.stringify(settings));
    } catch {}
  };

  return {
    viewMode,
    setViewMode,
    sessionMasterAccountId,
    setSessionMasterAccountId,
    activeSessionMasterAccountId: options.serverMasterAccountId ?? sessionMasterAccountId,
    globalSettings,
    globalSettingsServerSynced,
    saveGlobalSettings,
  };
}
