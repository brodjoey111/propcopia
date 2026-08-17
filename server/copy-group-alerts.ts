import type {
  CopyGroup,
  CopyGroupActivity,
  CopyGroupHealth,
  CopyGroupObservability,
} from './copy-group-types';

export type CopyGroupAlertSeverity = 'info' | 'warn' | 'error';
export type CopyGroupAlertSource = 'activity' | 'health';

export interface CopyGroupAlertRecord {
  alertId: string;
  storyKey: string;
  userId: string;
  groupId: string;
  timestamp: string;
  severity: CopyGroupAlertSeverity;
  title: string;
  message: string;
  accountId?: string;
  source: CopyGroupAlertSource;
  healthStatus?: CopyGroupHealth['status'];
  restartRecoveryMessage?: string;
  restartRecoveryAt?: string;
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function mapActivitySeverity(severity: CopyGroupActivity['severity']): CopyGroupAlertSeverity {
  return severity === 'ERROR' ? 'error' : severity === 'WARN' ? 'warn' : 'info';
}

export function buildCopyGroupAlertFromActivity(input: {
  group: CopyGroup;
  activity: CopyGroupActivity;
  observability: CopyGroupObservability;
}): CopyGroupAlertRecord | null {
  if (input.activity.severity === 'INFO') {
    return null;
  }

  const actionableActivity = input.observability.recentActivity.filter((entry) => entry.severity !== 'INFO');
  const errorCount = actionableActivity.filter((entry) => entry.severity === 'ERROR').length;
  const warningCount = actionableActivity.filter((entry) => entry.severity === 'WARN').length;
  const healthCount = actionableActivity.filter((entry) => entry.category === 'HEALTH').length;
  const lifecycleCount = actionableActivity.filter((entry) => entry.category === 'LIFECYCLE').length;
  const detailParts = [
    errorCount > 0 ? pluralize(errorCount, 'error') : null,
    warningCount > 0 ? pluralize(warningCount, 'warning') : null,
    healthCount > 0 ? pluralize(healthCount, 'health signal') : null,
    lifecycleCount > 0 ? pluralize(lifecycleCount, 'lifecycle update') : null,
  ].filter((value): value is string => Boolean(value));
  const lifecycleMessage =
    input.observability.lastLifecycleMessage &&
    input.observability.lastLifecycleMessage !== input.activity.message
      ? ` Last lifecycle update: ${input.observability.lastLifecycleMessage}`
      : '';

  return {
    alertId: `activity:${input.activity.eventId}`,
    storyKey: `copy-group:${input.group.groupId}`,
    userId: input.group.userId,
    groupId: input.group.groupId,
    timestamp: input.activity.timestamp,
    severity: mapActivitySeverity(input.activity.severity),
    title:
      input.activity.severity === 'ERROR'
        ? `${input.group.name} recovery required`
        : `${input.group.name} needs follow-up`,
    message: `${input.activity.message}. Active signals: ${detailParts.join(', ')}.${lifecycleMessage}`.replace(/\.\./g, '.'),
    accountId: input.activity.followerAccountId,
    source: 'activity',
    restartRecoveryMessage: input.observability.lastRestartRecoveryMessage,
    restartRecoveryAt: input.observability.lastRestartRecoveryAt,
  };
}

export function buildCopyGroupAlertFromHealthChange(input: {
  group: CopyGroup;
  previousStatus: CopyGroupHealth['status'];
  health: CopyGroupHealth;
}): CopyGroupAlertRecord {
  const primaryMessage =
    input.health.errors[0] ??
    input.health.warnings[0] ??
    input.health.executionPipeline.message;
  const transitionLabel =
    input.previousStatus === input.health.status
      ? `Health details updated while staying ${input.health.status.toLowerCase()}.`
      : `Health moved from ${input.previousStatus.toLowerCase()} to ${input.health.status.toLowerCase()}.`;

  if (input.health.status === 'HEALTHY') {
    return {
      alertId: `health:${input.group.groupId}:${input.health.checkedAt}`,
      storyKey: `copy-group:${input.group.groupId}`,
      userId: input.group.userId,
      groupId: input.group.groupId,
      timestamp: input.health.checkedAt,
      severity: 'info',
      title: `${input.group.name} recovered`,
      message: `${transitionLabel} ${input.health.masterConnection.message}. ${input.health.followerConnections.message}.`,
      source: 'health',
      healthStatus: input.health.status,
    };
  }

  return {
    alertId: `health:${input.group.groupId}:${input.health.checkedAt}`,
    storyKey: `copy-group:${input.group.groupId}`,
    userId: input.group.userId,
    groupId: input.group.groupId,
    timestamp: input.health.checkedAt,
    severity: input.health.status === 'UNHEALTHY' ? 'error' : 'warn',
    title:
      input.health.status === 'UNHEALTHY'
        ? `${input.group.name} recovery required`
        : `${input.group.name} needs follow-up`,
    message: `${transitionLabel} ${primaryMessage}`,
    source: 'health',
    healthStatus: input.health.status,
  };
}
