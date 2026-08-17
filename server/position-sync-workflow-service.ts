import type { PersistedPositionSyncReview } from "./position-sync-review-store";

type PositionSyncWorkflowStatus = PersistedPositionSyncReview["status"];

export type PositionSyncWorkflowValidation =
  | { valid: true }
  | { valid: false; message: string };

function hasSimulationEvidence(review: PersistedPositionSyncReview | undefined): boolean {
  return Boolean(
    review?.simulationId &&
      review.simulationFingerprint &&
      review.simulationSourceGeneratedAt &&
      review.simulationPlan?.noOrdersSubmitted === true,
  );
}

export function validatePositionSyncWorkflowTransition(input: {
  current?: PersistedPositionSyncReview;
  nextStatus: PositionSyncWorkflowStatus;
}): PositionSyncWorkflowValidation {
  const currentStatus = input.current?.status;

  if (input.nextStatus === "reviewed") {
    return { valid: true };
  }

  if (input.nextStatus === "simulated") {
    if (currentStatus === "simulated" && hasSimulationEvidence(input.current)) {
      return { valid: true };
    }

    return {
      valid: false,
      message: "Use the position sync simulation action before marking this plan simulated.",
    };
  }

  if (!hasSimulationEvidence(input.current)) {
    return {
      valid: false,
      message: "Position sync simulation evidence is required before this workflow can advance.",
    };
  }

  if (input.nextStatus === "approved") {
    return currentStatus === "simulated" || currentStatus === "approved"
      ? { valid: true }
      : {
          valid: false,
          message: "A position sync plan must be simulated before it can be approved.",
        };
  }

  if (input.nextStatus === "handed_off") {
    return currentStatus === "approved" || currentStatus === "handed_off"
      ? { valid: true }
      : {
          valid: false,
          message: "A position sync plan must be approved before it can be handed off.",
        };
  }

  return currentStatus === "handed_off" || currentStatus === "completed_manually"
    ? { valid: true }
    : {
        valid: false,
        message: "A position sync plan must be handed off before manual completion is recorded.",
      };
}
