import { useState, useRef } from "react";
import { PositionScalingControl } from "@/components/position-scaling-control";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Upload, User as UserIcon } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Trade copying settings
  const [autoCopy, setAutoCopy] = useState(true);
  const [copyExits, setCopyExits] = useState(true);
  const [copyMods, setCopyMods] = useState(true);
  const [bidirectional, setBidirectional] = useState(false);
  
  // Notification settings
  const [notifyTrades, setNotifyTrades] = useState(true);
  const [notifyErrors, setNotifyErrors] = useState(true);
  const [notifyConnection, setNotifyConnection] = useState(true);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { bio?: string | null; profilePicture?: string | null }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      bio: bio.trim() || null,
      profilePicture: profilePicture || null,
    });
  };

  const handleSaveAllSettings = () => {
    toast({
      title: "Settings saved",
      description: "All your settings have been saved successfully.",
    });
  };

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
          <h2 className="mb-4 text-xl font-semibold">Profile</h2>
          <Card className="card-3d p-6">
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profilePicture || undefined} alt={user?.username} />
                    <AvatarFallback className="text-2xl">
                      {user?.username?.charAt(0).toUpperCase() || <UserIcon className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-profile-picture"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-picture"
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    Upload Photo
                  </Button>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <p className="mt-1 text-sm font-medium">{user?.username}</p>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-1 resize-none"
                      rows={4}
                      maxLength={200}
                      data-testid="textarea-bio"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {bio.length}/200 characters
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
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
                <Switch 
                  id="auto-copy" 
                  checked={autoCopy}
                  onCheckedChange={setAutoCopy}
                  data-testid="switch-auto-copy" 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="copy-exits">Copy Exit Signals</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy trade exits and position closures
                  </p>
                </div>
                <Switch 
                  id="copy-exits" 
                  checked={copyExits}
                  onCheckedChange={setCopyExits}
                  data-testid="switch-copy-exits" 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="copy-mods">Copy Order Modifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy stop-loss and take-profit adjustments
                  </p>
                </div>
                <Switch 
                  id="copy-mods" 
                  checked={copyMods}
                  onCheckedChange={setCopyMods}
                  data-testid="switch-copy-mods" 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bidirectional">Bidirectional Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable two-way synchronization between accounts
                  </p>
                </div>
                <Switch 
                  id="bidirectional" 
                  checked={bidirectional}
                  onCheckedChange={setBidirectional}
                  data-testid="switch-bidirectional" 
                />
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
                <Switch 
                  id="notify-trades" 
                  checked={notifyTrades}
                  onCheckedChange={setNotifyTrades}
                  data-testid="switch-notify-trades" 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-errors">Error Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert me when trade execution fails
                  </p>
                </div>
                <Switch 
                  id="notify-errors" 
                  checked={notifyErrors}
                  onCheckedChange={setNotifyErrors}
                  data-testid="switch-notify-errors" 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-connection">Connection Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify on API connection changes
                  </p>
                </div>
                <Switch 
                  id="notify-connection" 
                  checked={notifyConnection}
                  onCheckedChange={setNotifyConnection}
                  data-testid="switch-notify-connection" 
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={handleSaveAllSettings}
            data-testid="button-save-settings"
          >
            <Save className="mr-2 h-4 w-4" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
