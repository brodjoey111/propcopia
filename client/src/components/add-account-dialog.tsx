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
import { Plus } from "lucide-react";

interface AddAccountDialogProps {
  onAdd?: (account: any) => void;
}

export function AddAccountDialog({ onAdd }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"ninjatrader" | "tradovate">("ninjatrader");
  const [formData, setFormData] = useState({
    name: "",
    accountType: "follower",
    apiKey: "",
    apiSecret: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding account:", { ...formData, platform });
    onAdd?.({ ...formData, platform });
    setOpen(false);
    setFormData({ name: "", accountType: "follower", apiKey: "", apiSecret: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-account">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Trading Account</DialogTitle>
          <DialogDescription>
            Add a simulated account to start copying trades. API credentials are optional and can be added later for live trading.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ninjatrader" data-testid="tab-ninjatrader">NinjaTrader</TabsTrigger>
            <TabsTrigger value="tradovate" data-testid="tab-tradovate">Tradovate</TabsTrigger>
          </TabsList>

          <TabsContent value={platform} className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="My Trading Account"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-account-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                >
                  <SelectTrigger id="accountType" data-testid="select-account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master">Master Account</SelectItem>
                    <SelectItem value="follower">Follower Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Optional - for live trading"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  data-testid="input-api-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="Optional - for live trading"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  data-testid="input-api-secret"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-account">
                  Add Account
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
