import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Rocket, Users, Mail, MessageCircle, Columns3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImpactWizard } from "@/components/ImpactWizard";

interface Kpis {
  totalLeads: number;
  campanhasAtivas: number;
  enviadosMes: number;
  responderam: number;
  importados: number;
  contatados: number;
  reuniao: number;
  convertidos: number;
}

const quickLinks = [
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/emails", icon: Mail, label: "Campanhas" },
  { to: "/respostas", icon: MessageCircle, label: "Respostas" },
  { to: "/kanban", icon: Columns3, label: "Pipeline" },
  { to: "/templates", icon: FileText, label: "Templates" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [kpis, setKpis] = useState<Kpis>({
    totalLeads: 0,
    campanhasAtivas: 0,
    enviadosMes: 0,
    responderam: 0,
    importados: 0,
    contatados: 0,
    reuniao: 0,
    convertidos: 0,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const startMonth = new Date();
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);

      const [
        { data: leads },
        { count: campanhasAtivas },
        { count: enviadosMes },
      ] = await Promise.all([
        supabase.from("leads").select("id, status"),
        supabase
          .from("campanhas")
          .select("*", { count: "exact", head: true })
          .in("status", ["enviando", "agendada"]),
        supabase
          .from("campanha_leads")
          .select("*", { count: "exact", head: true })
          .gte("enviado_em", startMonth.toISOString()),
      ]);

      const all = leads ?? [];
      const by = (s: string) => all.filter((l: any) => l.status === s).length;

      setKpis({
        totalLeads: all.length,
        campanhasAtivas: campanhasAtivas ?? 0,
        enviadosMes: enviadosMes ?? 0,
        responderam: by("respondeu"),
        importados: all.length,
        contatados: by("em_contato"),
        reuniao: by("respondeu"),
        convertidos: by("convertido"),
      });
    };
    load();
  }, [user]);

  const funnel = [
    { label: "Importados", value: kpis.importados, color: "bg-status-novo" },
    { label: "Contatados", value: kpis.contatados, color: "bg-status-em-contato" },
    { label: "Responderam", value: kpis.responderam, color: "bg-status-respondeu" },
    { label: "Reunião", value: kpis.reuniao, color: "bg-primary-glow" },
    { label: "Convertidos", value: kpis.convertidos, color: "bg-status-convertido" },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  const kpiCards = [
    { label: "Total de leads", value: kpis.totalLeads },
    { label: "Campanhas ativas", value: kpis.campanhasAtivas },
    { label: "Enviados este mês", value: kpis.enviadosMes },
    { label: "Responderam", value: kpis.responderam },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HERO */}
      <section className="text-center space-y-4 pt-2 md:pt-6">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight">
          Pronto para fechar novos negócios?
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          Encontre, impacte e converta seus próximos clientes em minutos.
        </p>
        <div className="space-y-2 max-w-md mx-auto">
          <button
            onClick={() => setWizardOpen(true)}
            className="w-full rounded-2xl px-6 py-6 md:py-7 text-white shadow-[var(--shadow-elegant)] hover:shadow-[0_18px_45px_-10px_hsl(217_92%_64%/0.55)] transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, #4F8EF7 0%, #3B7BE0 100%)" }}
          >
            <Rocket className="h-6 w-6" />
            <span className="text-xl md:text-2xl font-bold">Impactar agora</span>
          </button>
          <p className="text-xs text-muted-foreground">
            Selecione um público, crie seu e-mail e dispare — tudo em um fluxo
          </p>
        </div>
      </section>

      <ImpactWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* KPIs */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {kpiCards.map((c) => (
            <Card key={c.label} className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{c.value}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FUNIL */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Funil de conversão</h2>
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="space-y-3 md:hidden">
            {funnel.map((f, i) => {
              const prev = i === 0 ? f.value : funnel[i - 1].value;
              const pct = prev > 0 && i > 0 ? Math.round((f.value / prev) * 100) : null;
              return (
                <div key={f.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">
                      {f.value}{pct !== null ? ` · ${pct}%` : ""}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${f.color} transition-all`} style={{ width: `${(f.value / funnelMax) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:flex items-end justify-between gap-2">
            {funnel.map((f, i) => {
              const prev = i === 0 ? f.value : funnel[i - 1].value;
              const pct = prev > 0 && i > 0 ? Math.round((f.value / prev) * 100) : null;
              const heightPct = (f.value / funnelMax) * 100;
              return (
                <div key={f.label} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-2xl font-bold">{f.value}</p>
                  <div className="w-full h-32 flex items-end">
                    <div
                      className={`w-full ${f.color} rounded-t-lg transition-all`}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-center">{f.label}</p>
                  {pct !== null && (
                    <p className="text-[10px] text-muted-foreground">{pct}% da etapa anterior</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
