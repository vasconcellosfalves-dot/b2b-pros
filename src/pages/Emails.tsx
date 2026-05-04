import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Mail, Trash2, Send, BarChart3,
  MoreHorizontal, FileText, Copy, Pause, Pencil, BookmarkPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CampanhaWizard, { TemplateSeed } from "@/components/campanhas/CampanhaWizard";

interface Campanha {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  status: string;
  criado_em: string;
  agendado_para: string | null;
  lead_count?: number;
  enviados?: number;
  abertos?: number;
  respostas?: number;
  steps_count?: number;
  delay_total?: number;
}

interface TemplateCampanha {
  id: string;
  nome: string;
  tom_voz: string | null;
  email_1_delay: number;
  email_2_delay: number;
  email_3_delay: number;
  criado_em: string;
}

interface Step {
  id?: string;
  step_numero: number;
  assunto: string;
  corpo: string;
  delay_dias: number;
}

const VARIAVEIS = ["{{nome}}", "{{empresa}}", "{{cargo}}", "{{email}}"];

// ---------- helpers ----------
const tomLabel = (v: string | null) => {
  switch (v) {
    case "consultivo_educativo": return "Consultivo e educativo";
    case "provocativo_desafiador": return "Provocativo e desafiador";
    case "proximo_descontraido": return "Próximo e descontraído";
    case "profissional_direto":
    default: return "Profissional e direto";
  }
};

const statusBucket = (s: string): "andamento" | "rascunho" | "concluida" => {
  if (s === "rascunho") return "rascunho";
  if (s === "enviado" || s === "concluida") return "concluida";
  return "andamento"; // agendada, enviando, pausada
};

const statusColor = (s: string) =>
  s === "enviado" || s === "concluida" ? "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30"
  : s === "enviando" ? "bg-status-em-contato/15 text-status-em-contato border-status-em-contato/30"
  : s === "agendada" ? "bg-primary/15 text-primary border-primary/30"
  : s === "pausada" ? "bg-status-descartado/15 text-status-descartado border-status-descartado/30"
  : "bg-muted text-muted-foreground border-border";

const statusLabel = (s: string) => {
  switch (s) {
    case "rascunho": return "Rascunho";
    case "agendada": return "Agendada";
    case "enviando": return "Enviando";
    case "pausada": return "Pausada";
    case "enviado":
    case "concluida": return "Concluída";
    default: return s;
  }
};

export default function Emails() {
  const { user } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [templates, setTemplates] = useState<TemplateCampanha[]>([]);
  const [tab, setTab] = useState<"andamento" | "rascunho" | "concluida" | "templates">("andamento");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [seed, setSeed] = useState<TemplateSeed | null>(null);
  const [detail, setDetail] = useState<Campanha | null>(null);

  const load = async () => {
    const { data: camps, error } = await supabase
      .from("campanhas")
      .select("*, campanha_leads(count), email_steps(delay_dias)")
      .order("criado_em", { ascending: false });
    if (error) return toast.error(error.message);

    const ids = (camps ?? []).map((c: any) => c.id);
    let respByCamp: Record<string, number> = {};
    if (ids.length) {
      const { data: respRows } = await supabase
        .from("respostas")
        .select("campanha_id")
        .in("campanha_id", ids);
      respByCamp = (respRows ?? []).reduce((acc: any, r: any) => {
        acc[r.campanha_id] = (acc[r.campanha_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    setCampanhas(
      (camps ?? []).map((c: any) => {
        const stepRows = c.email_steps ?? [];
        const delay_total = stepRows.reduce((sum: number, s: any) => sum + (s.delay_dias ?? 0), 0);
        return {
          ...c,
          lead_count: c.campanha_leads?.[0]?.count ?? 0,
          steps_count: stepRows.length || 1,
          delay_total,
          respostas: respByCamp[c.id] ?? 0,
        };
      }),
    );

    const { data: tps } = await supabase
      .from("templates_campanha")
      .select("*")
      .order("criado_em", { ascending: false });
    setTemplates((tps ?? []) as any);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const buckets = useMemo(() => {
    const map = { andamento: [] as Campanha[], rascunho: [] as Campanha[], concluida: [] as Campanha[] };
    for (const c of campanhas) map[statusBucket(c.status)].push(c);
    return map;
  }, [campanhas]);

  const counts = {
    andamento: buckets.andamento.length,
    rascunho: buckets.rascunho.length,
    concluida: buckets.concluida.length,
    templates: templates.length,
  };

  const openNew = () => { setSeed(null); setWizardOpen(true); };
  const openFromTemplate = (t: any) => {
    setSeed({
      nome: t.nome,
      briefing_persona: t.briefing_persona,
      briefing_dor: t.briefing_dor,
      briefing_cta: t.briefing_cta,
      tom_voz: t.tom_voz,
      idioma: t.idioma,
      steps: [
        { assunto: t.email_1_assunto ?? "", corpo: t.email_1_corpo ?? "", delay_dias: t.email_1_delay ?? 0 },
        { assunto: t.email_2_assunto ?? "", corpo: t.email_2_corpo ?? "", delay_dias: t.email_2_delay ?? 3 },
        { assunto: t.email_3_assunto ?? "", corpo: t.email_3_corpo ?? "", delay_dias: t.email_3_delay ?? 7 },
      ].filter((s) => s.assunto || s.corpo),
    });
    setWizardOpen(true);
  };


  // ações no menu de 3 pontinhos
  const pauseCampanha = async (c: Campanha) => {
    const { error } = await supabase.from("campanhas").update({ status: "pausada" as any }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Campanha pausada");
    load();
  };

  const duplicarCampanha = async (c: Campanha) => {
    if (!user) return;
    const { data: nova, error } = await supabase
      .from("campanhas")
      .insert({
        user_id: user.id,
        nome: `${c.nome} (cópia)`,
        assunto: c.assunto,
        corpo: c.corpo,
        status: "rascunho" as any,
      })
      .select().single();
    if (error || !nova) return toast.error(error?.message ?? "Erro ao duplicar");
    const { data: stepRows } = await supabase
      .from("email_steps").select("step_numero, assunto, corpo, delay_dias").eq("campanha_id", c.id);
    if (stepRows?.length) {
      await supabase.from("email_steps").insert(
        stepRows.map((s: any) => ({ ...s, campanha_id: nova.id })),
      );
    }
    toast.success("Campanha duplicada");
    load();
  };

  const excluirCampanha = async (c: Campanha) => {
    if (!confirm(`Excluir campanha "${c.nome}"?`)) return;
    const { error } = await supabase.from("campanhas").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  };

  const salvarComoTemplate = async (c: Campanha) => {
    if (!user) return;
    const nome = prompt("Nome do template:", c.nome);
    if (!nome) return;
    const { data: stepRows } = await supabase
      .from("email_steps")
      .select("step_numero, assunto, corpo, delay_dias")
      .eq("campanha_id", c.id)
      .order("step_numero");
    const s1 = stepRows?.[0]; const s2 = stepRows?.[1]; const s3 = stepRows?.[2];
    const { error } = await supabase.from("templates_campanha").insert({
      user_id: user.id,
      nome,
      tom_voz: (c as any).tom_voz ?? null,
      idioma: (c as any).idioma ?? "pt-BR",
      briefing_persona: (c as any).briefing_persona ?? null,
      briefing_dor: (c as any).briefing_dor ?? null,
      briefing_cta: (c as any).briefing_cta ?? null,
      email_1_assunto: s1?.assunto ?? "", email_1_corpo: s1?.corpo ?? "", email_1_delay: s1?.delay_dias ?? 0,
      email_2_assunto: s2?.assunto ?? "", email_2_corpo: s2?.corpo ?? "", email_2_delay: s2?.delay_dias ?? 3,
      email_3_assunto: s3?.assunto ?? "", email_3_corpo: s3?.corpo ?? "", email_3_delay: s3?.delay_dias ?? 7,
    });
    if (error) return toast.error(error.message);
    toast.success("Template salvo");
    load();
  };

  const excluirTemplate = async (t: TemplateCampanha) => {
    if (!confirm(`Excluir template "${t.nome}"?`)) return;
    const { error } = await supabase.from("templates_campanha").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template excluído");
    load();
  };

  // ---------- render ----------
  const renderCampanha = (c: Campanha) => {
    const cadencia = `${c.steps_count ?? 1} e-mail${(c.steps_count ?? 1) > 1 ? "s" : ""} em ${c.delay_total ?? 0} dia${(c.delay_total ?? 0) === 1 ? "" : "s"}`;
    const showMetricas = c.status === "enviado" || c.status === "concluida" || c.status === "enviando";
    return (
      <Card
        key={c.id}
        className="p-4 bg-card border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => setDetail(c)}
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{c.nome}</h3>
              <Badge variant="outline" className={statusColor(c.status)}>
                {statusLabel(c.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {cadencia} · {c.lead_count} lead{c.lead_count === 1 ? "" : "s"}
            </p>
            {showMetricas && (c.lead_count ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {c.lead_count} enviados · {c.respostas ?? 0} resposta{(c.respostas ?? 0) === 1 ? "" : "s"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {c.agendado_para
                ? `📅 ${new Date(c.agendado_para).toLocaleString("pt-BR")}`
                : new Date(c.criado_em).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetail(c)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Ver / editar
              </DropdownMenuItem>
              {c.status !== "pausada" && c.status !== "rascunho" && (
                <DropdownMenuItem onClick={() => pauseCampanha(c)}>
                  <Pause className="h-3.5 w-3.5 mr-2" /> Pausar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => duplicarCampanha(c)}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => salvarComoTemplate(c)}>
                <BookmarkPlus className="h-3.5 w-3.5 mr-2" /> Salvar como template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => excluirCampanha(c)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  };

  const emptyState = (msg: string) => (
    <Card className="p-10 text-center bg-card border-border">
      <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">{msg}</p>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground text-sm">
            {campanhas.length} campanha{campanhas.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Nova campanha</Button>

      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-flex">
          <TabsTrigger value="andamento">
            Em andamento <span className="ml-1.5 text-[10px] opacity-70">({counts.andamento})</span>
          </TabsTrigger>
          <TabsTrigger value="rascunho">
            Rascunhos <span className="ml-1.5 text-[10px] opacity-70">({counts.rascunho})</span>
          </TabsTrigger>
          <TabsTrigger value="concluida">
            Concluídas <span className="ml-1.5 text-[10px] opacity-70">({counts.concluida})</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates salvos <span className="ml-1.5 text-[10px] opacity-70">({counts.templates})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="andamento" className="space-y-3">
          {buckets.andamento.length === 0
            ? emptyState("Nenhuma campanha em andamento ainda")
            : buckets.andamento.map(renderCampanha)}
        </TabsContent>

        <TabsContent value="rascunho" className="space-y-3">
          {buckets.rascunho.length === 0
            ? emptyState("Você não tem rascunhos salvos")
            : buckets.rascunho.map(renderCampanha)}
        </TabsContent>

        <TabsContent value="concluida" className="space-y-3">
          {buckets.concluida.length === 0
            ? emptyState("Nenhuma campanha foi concluída ainda")
            : buckets.concluida.map(renderCampanha)}
        </TabsContent>

        <TabsContent value="templates" className="space-y-3">
          {templates.length === 0 ? (
            <Card className="p-10 text-center bg-card border-border">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground max-w-md mx-auto">
                Nenhum template salvo. Crie uma campanha e salve como template para reutilizar depois.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {templates.map((t) => {
                const total = (t.email_1_delay ?? 0) + (t.email_2_delay ?? 0) + (t.email_3_delay ?? 0);
                return (
                  <Card key={t.id} className="p-4 bg-card border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">3 e-mails em {total} dias</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tom: {tomLabel(t.tom_voz)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" onClick={() => openFromTemplate(t)}>
                        Usar este template
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => toast.info("Edição direta de templates em breve — use 'Usar template' e depois 'Salvar como template'.")}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => excluirTemplate(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CampanhaWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={load}
        templateSeed={seed}
      />

      <CampaignDetailDialog
        campanha={detail}
        onClose={() => setDetail(null)}
        onChanged={load}
      />
    </div>
  );
}

function CampaignDetailDialog({
  campanha, onClose, onChanged,
}: { campanha: Campanha | null; onClose: () => void; onChanged: () => void }) {
  const [metrics, setMetrics] = useState({ total: 0, enviados: 0, abertos: 0, clicados: 0, respostas: 0 });
  const [steps, setSteps] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!campanha) return;
    (async () => {
      const [{ data: cl }, { data: stepRows }, { count: respCount }] = await Promise.all([
        supabase.from("campanha_leads").select("id, enviado_em").eq("campanha_id", campanha.id),
        supabase.from("email_steps").select("*").eq("campanha_id", campanha.id).order("step_numero"),
        supabase.from("respostas").select("*", { count: "exact", head: true }).eq("campanha_id", campanha.id),
      ]);
      const ids = (cl ?? []).map((r: any) => r.id);
      const enviados = (cl ?? []).filter((r: any) => r.enviado_em).length;
      let abertos = 0, clicados = 0;
      if (ids.length) {
        const { data: ev } = await supabase
          .from("email_eventos").select("tipo").in("campanha_lead_id", ids);
        abertos = (ev ?? []).filter((e: any) => e.tipo === "abertura").length;
        clicados = (ev ?? []).filter((e: any) => e.tipo === "clique").length;
      }
      setMetrics({ total: cl?.length ?? 0, enviados, abertos, clicados, respostas: respCount ?? 0 });
      setSteps(stepRows ?? []);
    })();
  }, [campanha]);

  const sendNow = async () => {
    if (!campanha) return;
    setSending(true);
    try {
      const { data: cls } = await supabase
        .from("campanha_leads")
        .select("lead_id, leads(id, nome, empresa, cargo, email)")
        .eq("campanha_id", campanha.id);

      const leads = (cls ?? []).map((r: any) => r.leads).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campanha_id: campanha.id, leads, assunto: campanha.assunto, corpo: campanha.corpo },
      });
      if (error) throw error;
      toast.success(`Enviado para ${data.sent} de ${data.total}`);
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  if (!campanha) return null;
  const taxa = (n: number) => metrics.enviados ? Math.round((n / metrics.enviados) * 100) : 0;

  return (
    <Dialog open={!!campanha} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> {campanha.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Leads", value: metrics.total },
              { label: "Enviados", value: metrics.enviados },
              { label: "Aberturas", value: metrics.abertos, pct: taxa(metrics.abertos) },
              { label: "Cliques", value: metrics.clicados, pct: taxa(metrics.clicados) },
              { label: "Respostas", value: metrics.respostas, pct: taxa(metrics.respostas) },
            ].map((m) => (
              <Card key={m.label} className="p-3 bg-card border-border">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{m.label}</p>
                <p className="text-xl font-bold">{m.value}</p>
                {"pct" in m && m.pct !== undefined && (
                  <p className="text-[10px] text-muted-foreground">{m.pct}%</p>
                )}
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Sequência ({steps.length} step{steps.length !== 1 ? "s" : ""})</p>
            {steps.map((s) => (
              <Card key={s.id} className="p-3 bg-secondary/30 border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                    Step {s.step_numero}
                  </Badge>
                  {s.delay_dias > 0 && (
                    <span className="text-[10px] text-muted-foreground">após {s.delay_dias} dia(s)</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{s.assunto}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.corpo}</p>
              </Card>
            ))}
          </div>

          {(campanha.status === "rascunho" || campanha.status === "agendada") && (
            <Button onClick={sendNow} disabled={sending} className="w-full">
              <Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar agora (step 1)"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
