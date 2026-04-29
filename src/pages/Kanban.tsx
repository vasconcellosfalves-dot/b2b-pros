import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LeadStatus } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  status: LeadStatus;
}

type Col = { key: LeadStatus; title: string; color: string };
const COLS: Col[] = [
  { key: "novo", title: "Novo", color: "bg-status-novo" },
  { key: "em_contato", title: "Em contato", color: "bg-status-em-contato" },
  { key: "respondeu", title: "Respondeu", color: "bg-status-respondeu" },
  { key: "convertido", title: "Convertido", color: "bg-status-convertido" },
];

export default function Kanban() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("id, nome, empresa, cargo, status")
      .in("status", ["novo", "em_contato", "respondeu", "convertido"]);
    if (error) toast.error(error.message);
    else setLeads((data ?? []) as Lead[]);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const onDrop = async (status: LeadStatus) => {
    if (!draggedId) return;
    const lead = leads.find((l) => l.id === draggedId);
    if (!lead || lead.status === status) return;
    setLeads((prev) => prev.map((l) => (l.id === draggedId ? { ...l, status } : l)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", draggedId);
    if (error) {
      toast.error(error.message);
      load();
    } else {
      toast.success("Status atualizado");
    }
    setDraggedId(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Kanban</h1>
        <p className="text-muted-foreground text-sm">Arraste os cards para atualizar o status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible">
        {COLS.map((col) => {
          const items = leads.filter((l) => l.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
              className="bg-card/50 border border-border rounded-xl p-3 min-w-[260px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-sm">{col.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {items.map((l) => (
                  <Card
                    key={l.id}
                    draggable
                    onDragStart={() => setDraggedId(l.id)}
                    className="p-3 bg-card border-border cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
                  >
                    <p className="font-medium text-sm">{l.nome}</p>
                    {l.empresa && <p className="text-xs text-muted-foreground mt-0.5">{l.empresa}</p>}
                    {l.cargo && <p className="text-xs text-muted-foreground">{l.cargo}</p>}
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
