import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LeadStatus = "novo" | "em_contato" | "respondeu" | "descartado" | "convertido";

const labels: Record<LeadStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  respondeu: "Respondeu",
  descartado: "Descartado",
  convertido: "Convertido",
};

const styles: Record<LeadStatus, string> = {
  novo: "bg-status-novo/15 text-status-novo border-status-novo/30",
  em_contato: "bg-status-em-contato/15 text-status-em-contato border-status-em-contato/30",
  respondeu: "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30",
  descartado: "bg-status-descartado/15 text-status-descartado border-status-descartado/30",
  convertido: "bg-status-convertido/15 text-status-convertido border-status-convertido/30",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("border", styles[status])}>
      {labels[status]}
    </Badge>
  );
}

export const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "respondeu", label: "Respondeu" },
  { value: "descartado", label: "Descartado" },
  { value: "convertido", label: "Convertido" },
];
