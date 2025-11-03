import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { X, Plus, Globe } from "lucide-react";

interface GlobalRiskSettingsDialogProps {
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  onSave: (config: {
    positionScaling: number;
    maxContracts: number | null;
    blockedTickers: string[];
  }) => void;
}

export function GlobalRiskSettingsDialog({
  positionScaling = 100,
  maxContracts,
  blockedTickers = [],
  onSave,
}: GlobalRiskSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [scaling, setScaling] = useState(positionScaling);
  const [contracts, setContracts] = useState(maxContracts?.toString() || "");
  const [tickers, setTickers] = useState<string[]>(blockedTickers);
  const [newTicker, setNewTicker] = useState("");
  const [contractsError, setContractsError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setScaling(positionScaling);
      setContracts(maxContracts?.toString() || "");
      setTickers(blockedTickers);
      setNewTicker("");
      setContractsError(null);
    }
  }, [open, positionScaling, maxContracts, blockedTickers]);

  const handleAddTicker = () => {
    const ticker = newTicker.trim().toUpperCase();
    if (ticker && !tickers.includes(ticker)) {
      setTickers([...tickers, ticker]);
      setNewTicker("");
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setTickers(tickers.filter((t) => t !== ticker));
  };

  const handleContractsChange = (value: string) => {
    setContracts(value);
    
    if (value === "") {
      setContractsError(null);
      return;
    }
    
    const positiveIntegerPattern = /^[1-9]\d*$/;
    
    if (!positiveIntegerPattern.test(value)) {
      setContractsError("Must be a positive whole number or empty for unlimited");
    } else {
      setContractsError(null);
    }
  };

  const handleSave = () => {
    if (contractsError) {
      return;
    }
    
    onSave({
      positionScaling: scaling,
      maxContracts: contracts ? parseInt(contracts) : null,
      blockedTickers: tickers,
    });
    setOpen(false);
  };

  const isSaveDisabled = contractsError !== null;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTicker();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-global-risk-settings"
        >
          <Globe className="mr-2 h-4 w-4" />
          Global Risk Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-global-risk-settings">
        <DialogHeader>
          <DialogTitle>Global Risk Settings</DialogTitle>
          <DialogDescription>
            Set default risk settings for all follower accounts using global mode
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Position Scaling */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="global-scaling">Position Scaling</Label>
              <span className="text-sm font-semibold tabular-nums" data-testid="text-global-scaling-value">
                {scaling}%
              </span>
            </div>
            <Slider
              id="global-scaling"
              min={10}
              max={200}
              step={5}
              value={[scaling]}
              onValueChange={(value) => setScaling(value[0])}
              data-testid="slider-global-position-scaling"
            />
            <p className="text-xs text-muted-foreground">
              Scale trade sizes relative to the master account (10% - 200%)
            </p>
          </div>

          {/* Max Contracts */}
          <div className="space-y-2">
            <Label htmlFor="global-maxContracts">Maximum Contracts per Trade</Label>
            <Input
              id="global-maxContracts"
              type="number"
              min="1"
              placeholder="No limit"
              value={contracts}
              onChange={(e) => handleContractsChange(e.target.value)}
              data-testid="input-global-max-contracts"
              className={contractsError ? "border-destructive" : ""}
            />
            {contractsError ? (
              <p className="text-xs text-destructive" data-testid="error-global-max-contracts">
                {contractsError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Set the maximum number of contracts allowed per trade (leave empty for no limit)
              </p>
            )}
          </div>

          {/* Blocked Tickers */}
          <div className="space-y-2">
            <Label htmlFor="global-blockedTickers">Blocked Ticker Symbols</Label>
            <div className="flex gap-2">
              <Input
                id="global-blockedTickers"
                placeholder="e.g., ES, NQ, YM"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                data-testid="input-global-blocked-ticker"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleAddTicker}
                disabled={!newTicker.trim()}
                data-testid="button-global-add-ticker"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Prevent trades for specific symbols. Trades with these tickers will be skipped.
            </p>
            {tickers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tickers.map((ticker) => (
                  <Badge
                    key={ticker}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`badge-global-ticker-${ticker}`}
                  >
                    {ticker}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="no-default-hover-elevate no-default-active-elevate h-4 w-4"
                      onClick={() => handleRemoveTicker(ticker)}
                      data-testid={`button-global-remove-ticker-${ticker}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel-global-settings"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaveDisabled}
            data-testid="button-save-global-settings"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
