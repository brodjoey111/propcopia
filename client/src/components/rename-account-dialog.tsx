import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameAccountDialogProps {
  accountId: string;
  accountName: string;
  onSave: (name: string) => Promise<void>;
  children: React.ReactNode;
}

export function RenameAccountDialog({ accountId, accountName, onSave, children }: RenameAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(accountName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setName(accountName);
  }, [accountName, open]);

  const normalizedName = name.trim();
  const canSave = normalizedName.length > 0 && normalizedName.length <= 80 && normalizedName !== accountName;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSave(normalizedName);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent data-testid={`dialog-rename-account-${accountId}`}>
        <DialogHeader>
          <DialogTitle>Rename saved account</DialogTitle>
          <DialogDescription>
            Change the label shown in PropCopia. Broker credentials and account IDs will not change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`account-name-${accountId}`}>Account name</Label>
          <Input
            id={`account-name-${accountId}`}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSave();
            }}
            data-testid={`input-account-name-${accountId}`}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving} data-testid={`button-save-account-name-${accountId}`}>
            {isSaving ? "Saving..." : "Save name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
