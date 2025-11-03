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
    username: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding account:", { ...formData, platform });
    onAdd?.({ ...formData, platform });
    setOpen(false);
    setFormData({ name: "", accountType: "follower", username: "", password: "" });
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
            Add a simulated account or connect to your live trading platform
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
                <Label htmlFor="username">Username <span className="text-xs text-muted-foreground">(Optional - for live trading)</span></Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Optional - your platform username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-xs text-muted-foreground">(Optional - for live trading)</span></Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Optional - your platform password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-password"
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
