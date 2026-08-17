import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccountGroupsDemoBannerProps {
  onDismiss: () => void;
}

export function AccountGroupsDemoBanner({ onDismiss }: AccountGroupsDemoBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary">Interactive demo — try it now</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Drag the example cards between groups using the ⠿ handle. Add real accounts to replace these.
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
