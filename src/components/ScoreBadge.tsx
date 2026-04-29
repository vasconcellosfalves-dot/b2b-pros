import { cn } from "@/lib/utils";

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null;
  const color =
    score >= 71
      ? "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30"
      : score >= 41
      ? "bg-status-em-contato/15 text-status-em-contato border-status-em-contato/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
        color,
        className,
      )}
      title="Score de qualificação"
    >
      {score}
    </span>
  );
}
