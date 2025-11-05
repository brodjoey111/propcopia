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

interface DisconnectAccountAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  onConfirm: () => void;
}

export function DisconnectAccountAlert({
  open,
  onOpenChange,
  accountName,
  onConfirm,
}: DisconnectAccountAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="alert-disconnect-account">
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect <strong>{accountName}</strong>? 
            Active positions will remain open, but new trades will not be copied to this account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-disconnect">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-disconnect"
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
