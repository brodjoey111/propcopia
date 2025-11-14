import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AddAccountDialogProps {
  onAdd?: (account: any) => void;
}

interface TradingAccount {
  id: number | string;
  name: string;
  accountType: string;
  active?: boolean;
  balance?: number;
}

type Step = 'credentials' | 'select-accounts';

export function AddAccountDialog({ onAdd }: AddAccountDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('credentials');
  const [platform, setPlatform] = useState<"tradovate" | "tradeify" | "rithmic">("tradovate");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAddingAccounts, setIsAddingAccounts] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number | string>>(new Set());
  const [accountRoles, setAccountRoles] = useState<Map<number | string, 'master' | 'follower'>>(new Map());
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    cid: "",
    secret: "",
    apiKey: "",
    environment: "demo" as 'demo' | 'live',
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      const endpoint = platform === 'tradeify' ? '/api/tradeify/test-connection' : '/api/tradovate/test-connection';
      const payload = platform === 'tradeify' 
        ? { username: formData.username, apiKey: formData.apiKey }
        : {
            username: formData.username,
            password: formData.password,
            cid: formData.cid || undefined,
            secret: formData.secret || undefined,
            environment: formData.environment,
          };

      const res = await apiRequest('POST', endpoint, payload);
      const response = await res.json();

      if (response.success) {
        setFetchedAccounts(response.accounts || []);
        setStep('select-accounts');
        toast({
          title: "Connected Successfully",
          description: `Found ${response.accounts?.length || 0} accounts`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: response.message || `Unable to connect to ${platform === 'tradeify' ? 'Tradeify' : 'Tradovate'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAccountToggle = (accountId: number | string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
        setAccountRoles(roles => {
          const newRoles = new Map(roles);
          newRoles.delete(accountId);
          return newRoles;
        });
      } else {
        newSet.add(accountId);
        if (!accountRoles.has(accountId)) {
          setAccountRoles(roles => new Map(roles).set(accountId, 'follower'));
        }
      }
      return newSet;
    });
  };

  const handleRoleChange = (accountId: number | string, role: 'master' | 'follower') => {
    setAccountRoles(prev => new Map(prev).set(accountId, role));
  };

  const handleAddSelectedAccounts = async () => {
    setIsAddingAccounts(true);
    try {
      const addPromises = Array.from(selectedAccounts).map(async accountId => {
        const account = fetchedAccounts.find(a => a.id === accountId);
        if (account && onAdd) {
          const baseData = {
            name: account.name,
            platform: platform === 'tradeify' ? 'Tradeify' : 'Tradovate',
            accountType: accountRoles.get(accountId) || 'follower',
          };
          
          const platformData = platform === 'tradeify'
            ? {
                ...baseData,
                tradeifyUsername: formData.username,
                tradeifyAccountId: String(account.id),
                tradeifyApiKey: formData.apiKey,
              }
            : {
                ...baseData,
                tradovateAccountId: String(account.id),
                tradovateUsername: formData.username,
                tradovateEnvironment: formData.environment,
              };
          
          await onAdd(platformData);
        }
      });

      await Promise.all(addPromises);

      toast({
        title: "Accounts Added",
        description: `Successfully added ${selectedAccounts.size} account(s)`,
      });

      resetDialog();
    } catch (error) {
      toast({
        title: "Error Adding Accounts",
        description: error instanceof Error ? error.message : "Failed to add one or more accounts",
        variant: "destructive",
      });
    } finally {
      setIsAddingAccounts(false);
    }
  };

  const resetDialog = () => {
    setOpen(false);
    setStep('credentials');
    setFetchedAccounts([]);
    setSelectedAccounts(new Set());
    setAccountRoles(new Map());
    setFormData({
      username: "",
      password: "",
      cid: "",
      secret: "",
      apiKey: "",
      environment: "demo",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { 
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-account">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'credentials' ? 'Connect Trading Platform' : 'Select Accounts'}
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' 
              ? 'Choose your platform and enter credentials to fetch your trading accounts' 
              : 'Choose which accounts to add and set their role'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'credentials' ? (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Trading Platform</Label>
              <Select
                value={platform}
                onValueChange={(value: 'tradovate' | 'tradeify') => setPlatform(value)}
              >
                <SelectTrigger id="platform" data-testid="select-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tradovate">Tradovate</SelectItem>
                  <SelectItem value="tradeify">Tradeify (ProjectX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={`Your ${platform === 'tradeify' ? 'Tradeify' : 'Tradovate'} username`}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-username"
                required
              />
            </div>

            {platform === 'tradovate' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    data-testid="input-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cid">CID (Client ID)</Label>
                  <Input
                    id="cid"
                    type="text"
                    placeholder="API Client ID"
                    value={formData.cid}
                    onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                    data-testid="input-cid"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret">API Secret</Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="API Secret"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    data-testid="input-secret"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value: 'demo' | 'live') => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger id="environment" data-testid="select-environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Your Tradeify API key from ProjectX Dashboard"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  data-testid="input-api-key"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://dashboard.projectx.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ProjectX Dashboard</a> ($29/month subscription required)
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => resetDialog()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAuthenticating} data-testid="button-connect">
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Connect & Fetch Accounts
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {fetchedAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Accounts Found</h3>
                <p className="text-sm text-muted-foreground">
                  No trading accounts were found for this username
                </p>
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  Found {fetchedAccounts.length} account(s). Select the ones you want to add:
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {fetchedAccounts.map((account) => (
                    <Card
                      key={account.id}
                      className={`p-4 cursor-pointer hover-elevate ${
                        selectedAccounts.has(account.id) ? 'border-primary' : ''
                      }`}
                      onClick={() => handleAccountToggle(account.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedAccounts.has(account.id)}
                          onCheckedChange={() => handleAccountToggle(account.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{account.name}</h4>
                            {account.active && (
                              <Badge variant="outline" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ID: {account.id} • Type: {account.accountType}
                          </p>
                          
                          {selectedAccounts.has(account.id) && (
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <Label className="text-xs mb-2">Account Role:</Label>
                              <RadioGroup
                                value={accountRoles.get(account.id) || 'follower'}
                                onValueChange={(value: 'master' | 'follower') => handleRoleChange(account.id, value)}
                                className="flex gap-4 mt-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="master" id={`${account.id}-master`} />
                                  <Label htmlFor={`${account.id}-master`} className="text-xs cursor-pointer">
                                    Master
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="follower" id={`${account.id}-follower`} />
                                  <Label htmlFor={`${account.id}-follower`} className="text-xs cursor-pointer">
                                    Follower
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setStep('credentials')} disabled={isAddingAccounts}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleAddSelectedAccounts}
                    disabled={selectedAccounts.size === 0 || isAddingAccounts}
                    data-testid="button-add-selected"
                  >
                    {isAddingAccounts ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>Add {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''}</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
