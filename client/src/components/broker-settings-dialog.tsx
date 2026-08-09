import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BrokerSettingsDialogProps {
  accountId: string;
  accountName: string;
  platform: string;
  rithmicExchange?: string | null;
  rithmicSystemName?: string | null;
  rithmicEnvironment?: string | null;
  onSave: (settings: {
    rithmicExchange: string;
    rithmicSystemName: string | null;
    rithmicEnvironment: "test" | "live";
  }) => Promise<void> | void;
  children: React.ReactNode;
}

export function BrokerSettingsDialog({
  accountId,
  accountName,
  platform,
  rithmicExchange,
  rithmicSystemName,
  rithmicEnvironment,
  onSave,
  children,
}: BrokerSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [exchange, setExchange] = useState(rithmicExchange ?? "");
  const [systemName, setSystemName] = useState(rithmicSystemName ?? "");
  const [environment, setEnvironment] = useState<"test" | "live">(
    rithmicEnvironment === "live" ? "live" : "test",
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setExchange(rithmicExchange ?? "");
    setSystemName(rithmicSystemName ?? "");
    setEnvironment(rithmicEnvironment === "live" ? "live" : "test");
  }, [open, rithmicExchange, rithmicSystemName, rithmicEnvironment]);

  if (platform !== "Rithmic") {
    return children;
  }

  const handleSave = async () => {
    const normalizedExchange = exchange.trim().toUpperCase();
    if (!normalizedExchange) {
      return;
    }

    await onSave({
      rithmicExchange: normalizedExchange,
      rithmicSystemName: systemName.trim() || null,
      rithmicEnvironment: environment,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent data-testid={`dialog-broker-settings-${accountId}`}>
        <DialogHeader>
          <DialogTitle>Broker Settings</DialogTitle>
          <DialogDescription>
            Save the Rithmic details for {accountName} so copy trading can reconnect cleanly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`rithmic-exchange-${accountId}`}>Exchange</Label>
            <Input
              id={`rithmic-exchange-${accountId}`}
              value={exchange}
              onChange={(event) => setExchange(event.target.value.toUpperCase())}
              placeholder="e.g. CME"
              data-testid={`input-rithmic-exchange-${accountId}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`rithmic-system-name-${accountId}`}>System Name</Label>
            <Input
              id={`rithmic-system-name-${accountId}`}
              value={systemName}
              onChange={(event) => setSystemName(event.target.value)}
              placeholder="e.g. Rithmic Test"
              data-testid={`input-rithmic-system-name-${accountId}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`rithmic-environment-${accountId}`}>Environment</Label>
            <Input
              id={`rithmic-environment-${accountId}`}
              value={environment}
              onChange={(event) =>
                setEnvironment(event.target.value === "live" ? "live" : "test")
              }
              placeholder="test"
              data-testid={`input-rithmic-environment-${accountId}`}
            />
            <p className="text-xs text-muted-foreground">
              Use <code>test</code> for demo logins and <code>live</code> for live-enabled accounts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!exchange.trim()}
            data-testid={`button-save-broker-settings-${accountId}`}
          >
            Save Broker Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
