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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Plus, Settings, Globe, Sliders } from "lucide-react";

interface ConfigureAccountDialogProps {
  accountId: string;
  accountName: string;
  riskMode: 'global' | 'custom';
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  globalSettings: {
    positionScaling: number;
    maxContracts?: number;
    blockedTickers: string[];
  };
  onSave: (config: {
    riskMode: 'global' | 'custom';
    positionScaling: number;
    maxContracts: number | null;
    blockedTickers: string[];
  }) => void;
  children?: React.ReactNode;
}

export function ConfigureAccountDialog({
  accountId,
  accountName,
  riskMode: initialRiskMode,
  positionScaling = 100,
  maxContracts,
  blockedTickers = [],
  globalSettings,
  onSave,
  children,
}: ConfigureAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [riskMode, setRiskMode] = useState<'global' | 'custom'>(initialRiskMode);
  const [scaling, setScaling] = useState(positionScaling);
  const [contracts, setContracts] = useState(maxContracts?.toString() || "");
  const [tickers, setTickers] = useState<string[]>(blockedTickers);
  const [newTicker, setNewTicker] = useState("");
  const [contractsError, setContractsError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRiskMode(initialRiskMode);
      setScaling(positionScaling);
      setContracts(maxContracts?.toString() || "");
      setTickers(blockedTickers);
      setNewTicker("");
      setContractsError(null);
    }
  }, [open, initialRiskMode, positionScaling, maxContracts, blockedTickers]);

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
      riskMode,
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
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid={`dialog-configure-${accountId}`}>
        <DialogHeader>
          <DialogTitle>Configure Account</DialogTitle>
          <DialogDescription>
            Customize position scaling and trading restrictions for {accountName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Risk Mode Selection */}
          <div className="space-y-3">
            <Label>Risk Settings Mode</Label>
            <RadioGroup value={riskMode} onValueChange={(value: 'global' | 'custom') => setRiskMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="mode-global" data-testid="radio-mode-global" />
                <Label htmlFor="mode-global" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Globe className="h-4 w-4" />
                  <div>
                    <div>Use Global Settings</div>
                    <div className="text-xs text-muted-foreground">
                      {globalSettings.positionScaling}% scaling
                      {globalSettings.maxContracts && `, max ${globalSettings.maxContracts} contracts`}
                      {globalSettings.blockedTickers.length > 0 && `, ${globalSettings.blockedTickers.length} blocked ticker(s)`}
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="mode-custom" data-testid="radio-mode-custom" />
                <Label htmlFor="mode-custom" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Sliders className="h-4 w-4" />
                  <div>
                    <div>Custom Settings</div>
                    <div className="text-xs text-muted-foreground">Configure individual settings below</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Position Scaling */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="scaling">Position Scaling</Label>
              <span className="text-sm font-semibold tabular-nums" data-testid="text-scaling-value">
                {riskMode === 'global' ? globalSettings.positionScaling : scaling}%
              </span>
            </div>
            <Slider
              id="scaling"
              min={10}
              max={200}
              step={5}
              value={[riskMode === 'global' ? globalSettings.positionScaling : scaling]}
              onValueChange={(value) => setScaling(value[0])}
              disabled={riskMode === 'global'}
              data-testid="slider-position-scaling"
            />
            <p className="text-xs text-muted-foreground">
              {riskMode === 'global' ? 'Using global position scaling (edit in Global Risk Settings)' : 'Scale trade sizes relative to the master account (10% - 200%)'}
            </p>
          </div>

          {/* Max Contracts */}
          <div className="space-y-2">
            <Label htmlFor="maxContracts">Maximum Contracts per Trade</Label>
            <Input
              id="maxContracts"
              type="number"
              min="1"
              placeholder="No limit"
              value={riskMode === 'global' ? (globalSettings.maxContracts?.toString() || "") : contracts}
              onChange={(e) => handleContractsChange(e.target.value)}
              disabled={riskMode === 'global'}
              data-testid="input-max-contracts"
              className={contractsError ? "border-destructive" : ""}
            />
            {contractsError ? (
              <p className="text-xs text-destructive" data-testid="error-max-contracts">
                {contractsError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {riskMode === 'global' 
                  ? 'Using global maximum contracts limit (edit in Global Risk Settings)' 
                  : 'Set the maximum number of contracts allowed per trade (leave empty for no limit)'}
              </p>
            )}
          </div>

          {/* Blocked Tickers */}
          <div className="space-y-2">
            <Label htmlFor="blockedTickers">Blocked Ticker Symbols</Label>
            <div className="flex gap-2">
              <Input
                id="blockedTickers"
                placeholder="e.g., ES, NQ, YM"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                disabled={riskMode === 'global'}
                data-testid="input-blocked-ticker"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleAddTicker}
                disabled={!newTicker.trim() || riskMode === 'global'}
                data-testid="button-add-ticker"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {riskMode === 'global' 
                ? 'Using global blocked tickers (edit in Global Risk Settings)' 
                : 'Prevent trades for specific symbols. Trades with these tickers will be skipped.'}
            </p>
            {(riskMode === 'global' ? globalSettings.blockedTickers : tickers).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {(riskMode === 'global' ? globalSettings.blockedTickers : tickers).map((ticker) => (
                  <Badge
                    key={ticker}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`badge-ticker-${ticker}`}
                  >
                    {ticker}
                    {riskMode === 'custom' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="no-default-hover-elevate no-default-active-elevate h-4 w-4"
                        onClick={() => handleRemoveTicker(ticker)}
                        data-testid={`button-remove-ticker-${ticker}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
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
            data-testid="button-cancel-configure"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaveDisabled}
            data-testid="button-save-configure"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
