import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RemoveAccountAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  onConfirm: () => void;
  isRemoving?: boolean;
}

export function RemoveAccountAlert({
  open,
  onOpenChange,
  accountName,
  onConfirm,
  isRemoving = false,
}: RemoveAccountAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="alert-remove-account">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this saved account?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{accountName}</strong> and its saved credentials and settings will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving} data-testid="button-cancel-remove-account">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-remove-account"
          >
            {isRemoving ? "Removing..." : "Remove account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
