export interface NotificationPolicyItem {
  category: "copy_group" | "trade" | "position" | "risk";
  severity: "info" | "warn" | "error";
}

export interface NotificationPreferences {
  notifyTrades?: boolean;
  notifyErrors?: boolean;
  notifyConnection?: boolean;
}

export interface NotificationDeliverySummary {
  generatedCount: number;
  inAppEligibleCount: number;
  preferenceSuppressedCount: number;
  channels: {
    inApp: { available: true };
    email: { available: false };
    push: { available: false };
  };
}

export function isNotificationEnabled(
  notification: NotificationPolicyItem,
  preferences: NotificationPreferences,
): boolean {
  if (notification.category === "trade" && preferences.notifyTrades === false) {
    return false;
  }

  const isConnectionNotification =
    notification.category === "copy_group" || notification.category === "position";
  if (isConnectionNotification && preferences.notifyConnection === false) {
    return false;
  }

  return notification.severity !== "error" || preferences.notifyErrors !== false;
}

export function applyNotificationPolicy<T extends NotificationPolicyItem>(
  notifications: T[],
  preferences: NotificationPreferences,
): T[] {
  return notifications.filter((notification) => isNotificationEnabled(notification, preferences));
}

export function buildNotificationDeliveryPreview<T extends NotificationPolicyItem>(
  notifications: T[],
  preferences: NotificationPreferences,
): { notifications: T[]; summary: NotificationDeliverySummary } {
  const eligible = applyNotificationPolicy(notifications, preferences);

  return {
    notifications: eligible,
    summary: {
      generatedCount: notifications.length,
      inAppEligibleCount: eligible.length,
      preferenceSuppressedCount: notifications.length - eligible.length,
      channels: {
        inApp: { available: true },
        email: { available: false },
        push: { available: false },
      },
    },
  };
}
