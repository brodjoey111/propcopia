export type CopyGroupLifecycleAction =
  | "start"
  | "stop"
  | "pause"
  | "resume"
  | "emergency-stop";

export interface CopyGroupLifecycleManager {
  start(groupId: string): Promise<void>;
  stop(groupId: string): Promise<void>;
  pause(groupId: string): void;
  resume(groupId: string): void;
  emergencyStop(groupId: string, reason?: string): Promise<void>;
  getRuntime(groupId: string): unknown;
}

export async function runCopyGroupLifecycleAction(input: {
  action: CopyGroupLifecycleAction;
  groupId: string;
  reason?: string;
  manager: CopyGroupLifecycleManager;
  persistState: (groupId: string) => Promise<void>;
}): Promise<unknown> {
  switch (input.action) {
    case "start":
      await input.manager.start(input.groupId);
      break;
    case "stop":
      await input.manager.stop(input.groupId);
      break;
    case "pause":
      input.manager.pause(input.groupId);
      break;
    case "resume":
      input.manager.resume(input.groupId);
      break;
    case "emergency-stop":
      await input.manager.emergencyStop(input.groupId, input.reason);
      break;
  }

  await input.persistState(input.groupId);
  return input.manager.getRuntime(input.groupId);
}
