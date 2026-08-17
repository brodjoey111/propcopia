import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";

type RithmicReadinessResponse = {
  success: boolean;
  readiness: {
    status: "ready" | "action_required";
    ready: boolean;
    environment: "test" | "live";
    systemName: string;
    hasExplicitSystemName: boolean;
    exchange: string | null;
    savedBrokerUsername: string | null;
    hasSavedCredentials: boolean;
    hasSavedAccountId: boolean;
    sessionActive: boolean;
    reconnectValidated: boolean;
    reconnectValidation?: {
      validatedAt: string;
      source: "saved_connect";
    };
    loginMetadata?: {
      uniqueUserId: string;
      fcmId: string;
      ibId: string;
      timestamp: string;
      timezone: string;
    };
    blockers: string[];
  };
};

export function getBrokerSettingsReadinessToneClass(ready: boolean): string {
  return ready
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

export function getBrokerSettingsReadinessLabel(ready: boolean): string {
  return ready ? "Ready for Rithmic Test" : "Needs attention";
}

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
  const readinessQuery = useQuery<RithmicReadinessResponse>({
    queryKey: [`/api/accounts/${accountId}/rithmic-readiness`],
    enabled: open && platform === "Rithmic",
  });

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

  const readiness = readinessQuery.data?.readiness;
  const readinessLabel = readiness
    ? getBrokerSettingsReadinessLabel(readiness.ready)
    : "Checking readiness";
  const readinessToneClass = readiness
    ? getBrokerSettingsReadinessToneClass(readiness.ready)
    : "border-white/10 bg-white/[0.03] text-muted-foreground";

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
          <div
            className={`rounded-xl border p-4 ${readinessToneClass}`}
            data-testid={`broker-settings-readiness-${accountId}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{readinessLabel}</p>
                <p className="mt-1 text-xs opacity-80">
                  {readiness
                    ? `Session ${readiness.sessionActive ? "connected" : "offline"} • ${readiness.reconnectValidated ? "saved reconnect verified" : "reconnect needs proof"} • ${readiness.environment.toUpperCase()} • ${readiness.systemName}`
                    : readinessQuery.isLoading
                      ? "Loading the saved account and current Rithmic session."
                      : "Open this panel while signed in to inspect Rithmic reconnect readiness."}
                </p>
              </div>
              <Badge variant={readiness?.ready ? "default" : "secondary"}>
                {readiness?.ready ? "Ready" : readinessQuery.isLoading ? "Checking" : "Review"}
              </Badge>
            </div>

            {readinessQuery.error ? (
              <p className="mt-3 text-xs text-red-200">
                {readinessQuery.error instanceof Error
                  ? readinessQuery.error.message
                  : "Unable to load Rithmic readiness right now."}
              </p>
            ) : null}

            {readiness && readiness.blockers.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs">
                {readiness.blockers.map((blocker) => (
                  <p key={blocker}>• {blocker}</p>
                ))}
              </div>
            ) : null}

            {readiness?.reconnectValidation ? (
              <p className="mt-3 text-xs opacity-80">
                Saved reconnect last verified on{" "}
                {new Date(readiness.reconnectValidation.validatedAt).toLocaleString()}.
              </p>
            ) : null}

            {readiness?.loginMetadata ? (
              <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-xs">
                <p>
                  <span className="text-muted-foreground">unique_user_id:</span>{" "}
                  {readiness.loginMetadata.uniqueUserId || "Not returned"}
                </p>
                <p>
                  <span className="text-muted-foreground">fcm_id:</span>{" "}
                  {readiness.loginMetadata.fcmId || "Not returned"}
                </p>
                <p>
                  <span className="text-muted-foreground">ib_id:</span>{" "}
                  {readiness.loginMetadata.ibId || "Not returned"}
                </p>
              </div>
            ) : null}
          </div>

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
