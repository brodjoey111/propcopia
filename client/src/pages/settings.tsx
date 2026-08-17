import { useEffect, useRef, useState } from "react";
import { PositionScalingControl } from "@/components/position-scaling-control";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Upload, User as UserIcon, Users } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";
import type { Account } from "@shared/schema";
import { PASSWORD_MIN_LENGTH } from "@shared/auth";

type QueueSortPreference = "recent" | "age" | "owner" | "reassignments";
type QueueAuditFocusPreference = "all" | "overdue" | "unassigned" | "reassigned";
type CopyGroupHealthReviewFilterPreference =
  | "all"
  | "unreviewed"
  | "reviewed"
  | "stale"
  | "recurring";

export default function Settings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
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
  const [showReviewedNotifications, setShowReviewedNotifications] = useState(true);
  const [activityQueueSort, setActivityQueueSort] = useState<QueueSortPreference>("recent");
  const [activityQueueAuditFocus, setActivityQueueAuditFocus] =
    useState<QueueAuditFocusPreference>("all");
  const [copyGroupHealthReviewFilter, setCopyGroupHealthReviewFilter] =
    useState<CopyGroupHealthReviewFilterPreference>("all");
  const { data: accountsData } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ["/api/accounts"],
  });
  const followerAccounts = (accountsData?.accounts ?? []).filter(
    (account) => account.accountType === "follower",
  );

  useEffect(() => {
    setBio(user?.bio || "");
    setProfilePicture(user?.profilePicture || "");
    setAutoCopy(user?.autoCopyEnabled ?? true);
    setCopyExits(user?.copyExitsEnabled ?? true);
    setCopyMods(user?.copyModificationsEnabled ?? true);
    setBidirectional(user?.bidirectionalSyncEnabled ?? false);
    setNotifyTrades(user?.notifyTrades ?? true);
    setNotifyErrors(user?.notifyErrors ?? true);
    setNotifyConnection(user?.notifyConnection ?? true);
    setShowReviewedNotifications(user?.showReviewedNotifications ?? true);
    setActivityQueueSort(
      user?.activityQueueSort === "age" ||
        user?.activityQueueSort === "owner" ||
        user?.activityQueueSort === "reassignments"
        ? user.activityQueueSort
        : "recent",
    );
    setActivityQueueAuditFocus(
      user?.activityQueueAuditFocus === "overdue" ||
        user?.activityQueueAuditFocus === "unassigned" ||
        user?.activityQueueAuditFocus === "reassigned"
        ? user.activityQueueAuditFocus
        : "all",
    );
    setCopyGroupHealthReviewFilter(
      user?.copyGroupHealthReviewFilter === "unreviewed" ||
        user?.copyGroupHealthReviewFilter === "reviewed" ||
        user?.copyGroupHealthReviewFilter === "stale" ||
        user?.copyGroupHealthReviewFilter === "recurring"
        ? user.copyGroupHealthReviewFilter
        : "all",
    );
  }, [user]);

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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      autoCopyEnabled: boolean;
      copyExitsEnabled: boolean;
      copyModificationsEnabled: boolean;
      bidirectionalSyncEnabled: boolean;
      notifyTrades: boolean;
      notifyErrors: boolean;
      notifyConnection: boolean;
      showReviewedNotifications: boolean;
      activityQueueSort: QueueSortPreference;
      activityQueueAuditFocus: QueueAuditFocusPreference;
      copyGroupHealthReviewFilter: CopyGroupHealthReviewFilterPreference;
    }) => {
      const response = await apiRequest("PATCH", "/api/user/settings", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({
        title: "Password updated",
        description: "Your new password is active and you remain signed in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      toast({
        title: "Password too short",
        description: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "Re-enter the same new password in both fields.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const saveFollowerScalingMutation = useMutation({
    mutationFn: async ({
      accountId,
      positionScaling,
    }: {
      accountId: string;
      positionScaling: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/accounts/${accountId}/risk-settings`, {
        riskMode: "custom",
        positionScaling,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Scaling saved",
        description: "Follower scaling has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scaling update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveAllSettings = () => {
    updateSettingsMutation.mutate({
      autoCopyEnabled: autoCopy,
      copyExitsEnabled: copyExits,
      copyModificationsEnabled: copyMods,
      bidirectionalSyncEnabled: bidirectional,
      notifyTrades,
      notifyErrors,
      notifyConnection,
      showReviewedNotifications,
      activityQueueSort,
      activityQueueAuditFocus,
      copyGroupHealthReviewFilter,
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
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
          <h2 className="mb-4 text-xl font-semibold">Account Security</h2>
          <Card className="card-3d p-6">
            <div className="max-w-xl space-y-5">
              <div>
                <p className="font-medium text-white">Change password</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm your current password before choosing a new one.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  data-testid="input-current-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm new password</Label>
                  <PasswordInput
                    id="confirm-new-password"
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    data-testid="input-confirm-new-password"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use at least {PASSWORD_MIN_LENGTH} characters. Longer passphrases are encouraged.
              </p>
              <Button
                onClick={handleChangePassword}
                disabled={
                  changePasswordMutation.isPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword
                }
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </Card>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Position Scaling</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Adjust position size multipliers for each follower account
          </p>
          {followerAccounts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No follower accounts yet"
              description="Add or convert an account to follower mode to manage its scaling here."
              actionLabel="Open Accounts"
              onAction={() => {
                window.location.href = "/accounts";
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {followerAccounts.map((account) => (
                <PositionScalingControl
                  key={account.id}
                  accountName={account.name}
                  accountMeta={account.platform}
                  riskModeLabel={account.riskMode === "global" ? "global mode" : "custom mode"}
                  defaultValue={account.positionScaling ?? 100}
                  isSaving={saveFollowerScalingMutation.isPending}
                  onSave={(value) =>
                    saveFollowerScalingMutation.mutate({
                      accountId: account.id,
                      positionScaling: value,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Operations</h2>
          <Card className="card-3d p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activity-queue-sort">Activity queue default sort</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how manual sync work is ordered when you open Activity.
                </p>
                <Select
                  value={activityQueueSort}
                  onValueChange={(value) => setActivityQueueSort(value as QueueSortPreference)}
                >
                  <SelectTrigger id="activity-queue-sort" data-testid="select-activity-queue-sort">
                    <SelectValue placeholder="Choose a default sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Newest first</SelectItem>
                    <SelectItem value="age">Oldest first</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="reassignments">Reassignments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-queue-audit-focus">Activity queue default audit view</Label>
                <p className="text-sm text-muted-foreground">
                  Open straight into the follow-up view that matters most to you.
                </p>
                <Select
                  value={activityQueueAuditFocus}
                  onValueChange={(value) =>
                    setActivityQueueAuditFocus(value as QueueAuditFocusPreference)
                  }
                >
                  <SelectTrigger
                    id="activity-queue-audit-focus"
                    data-testid="select-activity-queue-audit-focus"
                  >
                    <SelectValue placeholder="Choose a default audit view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="reassigned">Reassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copy-group-health-review-filter">
                  Copy-group board default review view
                </Label>
                <p className="text-sm text-muted-foreground">
                  Start the copy-group health board on the review lane you use most.
                </p>
                <Select
                  value={copyGroupHealthReviewFilter}
                  onValueChange={(value) =>
                    setCopyGroupHealthReviewFilter(
                      value as CopyGroupHealthReviewFilterPreference,
                    )
                  }
                >
                  <SelectTrigger
                    id="copy-group-health-review-filter"
                    data-testid="select-copy-group-health-review-filter"
                  >
                    <SelectValue placeholder="Choose a default review view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All issues</SelectItem>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="stale">Stale reviews</SelectItem>
                    <SelectItem value="recurring">Recurring issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-reviewed-notifications">Show Reviewed Recovery Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep reviewed failures visible in Notifications and Activity feeds
                  </p>
                </div>
                <Switch
                  id="show-reviewed-notifications"
                  checked={showReviewedNotifications}
                  onCheckedChange={setShowReviewedNotifications}
                  data-testid="switch-show-reviewed-notifications"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={handleSaveAllSettings}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="mr-2 h-4 w-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
