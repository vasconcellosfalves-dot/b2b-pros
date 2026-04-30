import { cn } from "@/lib/utils";

export type LeadSource = "apollo" | "csv" | "manual" | string | null | undefined;

const map: Record<string, { label: string; cls: string }> = {
  apollo: { label: "Apollo", cls: "bg-primary/15 text-primary border-primary/30" },
  csv: { label: "CSV", cls: "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30" },
  manual: { label: "Manual", cls: "bg-muted text-muted-foreground border-border" },
};

export function SourceBadge({ source, className }: { source: LeadSource; className?: string }) {
  const cfg = map[(source ?? "manual") as string] ?? map.manual;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        cfg.cls,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
