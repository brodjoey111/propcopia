import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Zap, ShieldOff, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── API helpers ─────────────────────────────────────────────────────────────

interface KillSwitchStatus {
  success: boolean;
  active: boolean;
  activatedAt: string | null;
  reason: string | null;
}

async function fetchStatus(): Promise<KillSwitchStatus> {
  const res = await fetch("/api/kill-switch/status", { credentials: "include" });
  return res.json();
}

async function activate(reason?: string): Promise<void> {
  const res = await fetch("/api/kill-switch/activate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || null }),
  });
  if (!res.ok) throw new Error("Failed to activate kill switch");
}

async function deactivate(): Promise<void> {
  const res = await fetch("/api/kill-switch/deactivate", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to deactivate kill switch");
}

// ─── Shared query key / poll interval ────────────────────────────────────────

const QUERY_KEY = ["/api/kill-switch/status"];
const POLL_MS = 10_000; // 10 s

// ─── Confirmation dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-background shadow-2xl shadow-red-900/30 p-6">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Zap className="h-7 w-7 text-red-500" />
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-red-500 mb-1">
          Activate Kill Switch?
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-5">
          This will <strong>immediately halt all trade copying</strong> across every
          account. No new trades will be copied until you deactivate it.
        </p>

        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-5">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">
              <strong>Immediately closes all open positions</strong> across every
              connected prop firm and broker account — Tradovate and Rithmic —
              using market orders.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            <Zap className="h-4 w-4" />
            {loading ? "Activating…" : "Activate Kill Switch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar button ───────────────────────────────────────────────────────────

export function KillSwitchButton() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const { data } = useQuery<KillSwitchStatus>({
    queryKey: QUERY_KEY,
    queryFn: fetchStatus,
    refetchInterval: POLL_MS,
  });

  const isActive = data?.active ?? false;

  const activateMut = useMutation({
    mutationFn: () => activate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      setShowConfirm(false);
      toast({
        title: "⚡ Kill Switch Activated",
        description: "All trade copying has been halted immediately.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({ title: "Failed to activate", variant: "destructive" });
    },
  });

  const deactivateMut = useMutation({
    mutationFn: deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "✅ Kill Switch Deactivated",
        description: "Trade copying can now resume.",
      });
    },
    onError: () => {
      toast({ title: "Failed to deactivate", variant: "destructive" });
    },
  });

  if (isActive) {
    return (
      <button
        onClick={() => deactivateMut.mutate()}
        disabled={deactivateMut.isPending}
        className="w-full flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {deactivateMut.isPending ? "Resuming…" : "Resume Copying"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all group"
      >
        <Zap className="h-4 w-4 shrink-0 group-hover:animate-pulse" />
        Kill Switch
      </button>

      {showConfirm && (
        <ConfirmDialog
          onConfirm={() => activateMut.mutate()}
          onCancel={() => setShowConfirm(false)}
          loading={activateMut.isPending}
        />
      )}
    </>
  );
}

// ─── Global banner (shown in AppLayout when active) ───────────────────────────

export function KillSwitchBanner() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery<KillSwitchStatus>({
    queryKey: QUERY_KEY,
    queryFn: fetchStatus,
    refetchInterval: POLL_MS,
  });

  const deactivateMut = useMutation({
    mutationFn: deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "✅ Kill Switch Deactivated", description: "Trade copying can now resume." });
    },
  });

  if (!data?.active) return null;

  const since = data.activatedAt
    ? new Date(data.activatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm font-medium flex-shrink-0 z-50">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
      </span>

      <ShieldOff className="h-4 w-4 shrink-0" />

      <span className="flex-1 min-w-0">
        <strong>KILL SWITCH ACTIVE</strong>
        {since && <span className="opacity-80 font-normal"> — all trade copying halted since {since}</span>}
        {data.reason && <span className="opacity-80 font-normal"> · {data.reason}</span>}
      </span>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0 h-7 text-xs border-white/40 text-white hover:bg-white/20 hover:text-white bg-transparent"
        onClick={() => deactivateMut.mutate()}
        disabled={deactivateMut.isPending}
      >
        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
        {deactivateMut.isPending ? "Resuming…" : "Resume Copying"}
      </Button>
    </div>
  );
}
