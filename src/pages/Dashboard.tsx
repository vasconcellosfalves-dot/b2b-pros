import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, MessageCircle, Activity, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, LeadStatus } from "@/components/StatusBadge";
import { ImpactWizard } from "@/components/ImpactWizard";

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
  const [wizardOpen, setWizardOpen] = useState(false);

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

      <button
        onClick={() => setWizardOpen(true)}
        className="w-full rounded-2xl px-6 py-7 md:py-8 text-white shadow-[var(--shadow-elegant)] hover:shadow-[0_18px_45px_-10px_hsl(217_92%_64%/0.55)] transition-all hover:-translate-y-0.5 active:translate-y-0 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5"
        style={{ background: "linear-gradient(135deg, #4F8EF7 0%, #3B7BE0 100%)" }}
      >
        <div className="rounded-full bg-white/20 p-3">
          <Rocket className="h-7 w-7" />
        </div>
        <div className="text-center md:text-left">
          <p className="text-xl md:text-2xl font-bold leading-tight">Impactar agora</p>
          <p className="text-sm text-white/85">Selecione um público e dispare uma campanha</p>
        </div>
      </button>

      <ImpactWizard open={wizardOpen} onOpenChange={setWizardOpen} />

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
