import { PositionScalingControl } from "@/components/position-scaling-control";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your trade copier preferences and account settings
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Position Scaling</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Adjust position size multipliers for each follower account
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PositionScalingControl
              accountName="Follower Account 1"
              defaultValue={50}
              onSave={(value) => console.log('Saved scaling:', value)}
            />
            <PositionScalingControl
              accountName="Follower Account 2"
              defaultValue={100}
              onSave={(value) => console.log('Saved scaling:', value)}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Trade Copying Rules</h2>
          <Card className="card-3d p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-copy">Automatic Trade Copying</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically copy trades from master to follower accounts
                  </p>
                </div>
                <Switch id="auto-copy" defaultChecked data-testid="switch-auto-copy" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="copy-exits">Copy Exit Signals</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy trade exits and position closures
                  </p>
                </div>
                <Switch id="copy-exits" defaultChecked data-testid="switch-copy-exits" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="copy-mods">Copy Order Modifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy stop-loss and take-profit adjustments
                  </p>
                </div>
                <Switch id="copy-mods" defaultChecked data-testid="switch-copy-mods" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bidirectional">Bidirectional Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable two-way synchronization between accounts
                  </p>
                </div>
                <Switch id="bidirectional" data-testid="switch-bidirectional" />
              </div>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Notifications</h2>
          <Card className="card-3d p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-trades">Trade Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when trades are copied
                  </p>
                </div>
                <Switch id="notify-trades" defaultChecked data-testid="switch-notify-trades" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-errors">Error Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert me when trade execution fails
                  </p>
                </div>
                <Switch id="notify-errors" defaultChecked data-testid="switch-notify-errors" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-connection">Connection Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify on API connection changes
                  </p>
                </div>
                <Switch id="notify-connection" defaultChecked data-testid="switch-notify-connection" />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button size="lg" data-testid="button-save-settings">
            <Save className="mr-2 h-4 w-4" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
