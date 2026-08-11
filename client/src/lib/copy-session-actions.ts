import type { CopySessionSummary } from "./copy-session-summary";

export interface CopySessionPrimaryAction {
  kind: "start" | "stop";
  label: string;
  disabled: boolean;
}

export interface CopySessionSecondaryAction {
  kind: "recover";
  label: string;
  disabled: boolean;
}

export interface CopySessionActionState {
  primary: CopySessionPrimaryAction;
  secondary: CopySessionSecondaryAction | null;
}

export function buildCopySessionActionState(input: {
  hasActiveSession: boolean;
  canStartSession: boolean;
  sessionActionPending: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isRecovering: boolean;
  summary: CopySessionSummary;
}): CopySessionActionState {
  const secondary =
    input.hasActiveSession && input.summary.unavailableFollowerCount > 0
      ? {
          kind: "recover" as const,
          label: input.isRecovering ? "Recovering..." : "Recover Followers",
          disabled: input.sessionActionPending,
        }
      : null;

  if (input.hasActiveSession) {
    return {
      primary: {
        kind: "stop",
        label: input.isStopping ? "Stopping..." : "Stop Session",
        disabled: input.sessionActionPending,
      },
      secondary,
    };
  }

  return {
    primary: {
      kind: "start",
      label:
        input.isStarting
          ? "Starting..."
          : input.summary.tone === "review" && input.canStartSession
            ? "Start Session"
            : "Start Session",
      disabled: !input.canStartSession || input.sessionActionPending,
    },
    secondary,
  };
}
