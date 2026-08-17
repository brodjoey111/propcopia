import { Button } from "@/components/ui/button";
import { PlugZap, Sparkles, Unplug } from "lucide-react";

interface AccountGroupCardConnectionActionProps {
  isDemo?: boolean;
  isConnected: boolean;
  accountActionDisabled?: boolean;
  connectButtonLabel: string;
  disconnectButtonLabel: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function getAccountGroupCardConnectionMode(input: {
  isDemo?: boolean;
  isConnected: boolean;
}) {
  if (input.isDemo) {
    return "demo" as const;
  }

  return input.isConnected ? "disconnect" as const : "connect" as const;
}

export function createAccountGroupCardConnectionClickHandler(
  action: (() => void) | undefined,
) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    action?.();
  };
}

export function getAccountGroupCardConnectionDemoLabel() {
  return "example account";
}

export function AccountGroupCardConnectionAction({
  isDemo,
  isConnected,
  accountActionDisabled,
  connectButtonLabel,
  disconnectButtonLabel,
  onConnect,
  onDisconnect,
}: AccountGroupCardConnectionActionProps) {
  const mode = getAccountGroupCardConnectionMode({ isDemo, isConnected });

  if (mode === "demo") {
    return (
      <div className="flex items-center justify-center h-6 rounded-md border border-dashed border-muted-foreground/30 gap-1">
        <Sparkles className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/50">
          {getAccountGroupCardConnectionDemoLabel()}
        </span>
      </div>
    );
  }

  if (mode === "disconnect") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-[11px] px-2 w-full"
        onClick={createAccountGroupCardConnectionClickHandler(onDisconnect)}
        disabled={accountActionDisabled}
      >
        <Unplug className="h-3 w-3 mr-1" />
        {disconnectButtonLabel}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="h-6 text-[11px] px-2 w-full"
      onClick={createAccountGroupCardConnectionClickHandler(onConnect)}
      disabled={accountActionDisabled}
    >
      <PlugZap className="h-3 w-3 mr-1" />
      {connectButtonLabel}
    </Button>
  );
}
