import { Badge } from "@/components/ui/badge";
import type { ExecutionRecoveryFollowUpSignal } from "@/lib/runtime-overview";

interface ExecutionFollowUpSignalSummaryProps {
  checkpoint: ExecutionRecoveryFollowUpSignal;
  recoveryWindow: ExecutionRecoveryFollowUpSignal;
  variant?: "compact" | "detailed";
}

function getExecutionFollowUpSignalBadgeClass(
  tone: ExecutionRecoveryFollowUpSignal["tone"],
): string {
  if (tone === "danger") {
    return "border-rose-400/30 bg-rose-400/15 text-rose-100";
  }

  if (tone === "warn") {
    return "border-amber-400/30 bg-amber-400/15 text-amber-100";
  }

  if (tone === "ok") {
    return "border-emerald-400/30 bg-emerald-400/15 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-300";
}

function getExecutionFollowUpSignalPanelClass(
  tone: ExecutionRecoveryFollowUpSignal["tone"],
): string {
  if (tone === "danger") {
    return "rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-3";
  }

  if (tone === "warn") {
    return "rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-3";
  }

  if (tone === "ok") {
    return "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3";
  }

  return "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3";
}

function getExecutionFollowUpSignalDetailClass(
  tone: ExecutionRecoveryFollowUpSignal["tone"],
): string {
  if (tone === "danger") {
    return "mt-2 text-xs text-rose-100/90";
  }

  if (tone === "warn") {
    return "mt-2 text-xs text-amber-100/90";
  }

  if (tone === "ok") {
    return "mt-2 text-xs text-emerald-100/90";
  }

  return "mt-2 text-xs text-zinc-400";
}

export function ExecutionFollowUpSignalSummary({
  checkpoint,
  recoveryWindow,
  variant = "detailed",
}: ExecutionFollowUpSignalSummaryProps) {
  const signals = [
    { key: "checkpoint", title: "Lifecycle checkpoint", signal: checkpoint },
    { key: "recovery-window", title: "Recovery window", signal: recoveryWindow },
  ] as const;

  if (variant === "compact") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {signals.map(({ key, title, signal }) => (
          <Badge
            key={key}
            variant="outline"
            className={getExecutionFollowUpSignalBadgeClass(signal.tone)}
          >
            {title}: {signal.label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {signals.map(({ key, title, signal }) => (
        <div key={key} className={getExecutionFollowUpSignalPanelClass(signal.tone)}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </p>
          <Badge
            variant="outline"
            className={`mt-2 ${getExecutionFollowUpSignalBadgeClass(signal.tone)}`}
          >
            {signal.label}
          </Badge>
          <p className={getExecutionFollowUpSignalDetailClass(signal.tone)}>
            {signal.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
