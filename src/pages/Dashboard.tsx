import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Mail, MessageCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, LeadStatus } from "@/components/StatusBadge";

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  status: LeadStatus;
  criado_em: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, respondeu: 0, enviadosHoje: 0 });
  const [activities, setActivities] = useState<Lead[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, nome, empresa, status, criado_em")
        .order("criado_em", { ascending: false });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: enviadosHoje } = await supabase
        .from("campanha_leads")
        .select("*", { count: "exact", head: true })
        .gte("enviado_em", today.toISOString());

      const all = (leads ?? []) as Lead[];
      setStats({
        total: all.length,
        respondeu: all.filter((l) => l.status === "respondeu").length,
        enviadosHoje: enviadosHoje ?? 0,
      });
      setActivities(all.slice(0, 5));
    };
    load();
  }, [user]);

  const cards = [
    { label: "Leads cadastrados", value: stats.total, icon: Users, color: "text-status-novo" },
    { label: "E-mails enviados hoje", value: stats.enviadosHoje, icon: Mail, color: "text-status-em-contato" },
    { label: "Leads que responderam", value: stats.respondeu, icon: MessageCircle, color: "text-status-respondeu" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumo da sua prospecção</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold mt-2">{c.value}</p>
              </div>
              <div className={`rounded-lg bg-secondary p-2.5 ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Últimas atividades</h2>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum lead cadastrado ainda. Comece adicionando seu primeiro lead.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{a.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.empresa ?? "—"}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
