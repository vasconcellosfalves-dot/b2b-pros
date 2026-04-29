import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Trash2, Calendar as CalendarIcon, Send, BarChart3, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_OPTIONS, LeadStatus } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Campanha {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  status: string;
  criado_em: string;
  agendado_para: string | null;
  lead_count?: number;
}

interface Step {
  id?: string;
  step_numero: number;
  assunto: string;
  corpo: string;
  delay_dias: number;
}

const VARIAVEIS = ["{{nome}}", "{{empresa}}", "{{cargo}}", "{{email}}"];

export default function Emails() {
  const { user } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Campanha | null>(null);

  const [form, setForm] = useState({
    nome: "",
    leadStatus: "novo" as LeadStatus,
    agendar: false,
    agendadoPara: "",
  });
  const [steps, setSteps] = useState<Step[]>([
    { step_numero: 1, assunto: "", corpo: "", delay_dias: 0 },
  ]);

  const load = async () => {
    const { data, error } = await supabase
      .from("campanhas")
      .select("*, campanha_leads(count)")
      .order("criado_em", { ascending: false });
    if (error) return toast.error(error.message);
    setCampanhas(
      (data ?? []).map((c: any) => ({
        ...c,
        lead_count: c.campanha_leads?.[0]?.count ?? 0,
      })),
    );
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const resetForm = () => {
    setForm({ nome: "", leadStatus: "novo", agendar: false, agendadoPara: "" });
    setSteps([{ step_numero: 1, assunto: "", corpo: "", delay_dias: 0 }]);
  };

  const addStep = () =>
    setSteps((s) => [
      ...s,
      { step_numero: s.length + 1, assunto: "", corpo: "", delay_dias: 3 },
    ]);

  const removeStep = (idx: number) =>
    setSteps((s) =>
      s.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_numero: i + 1 })),
    );

  const updateStep = (idx: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, i) => (i === idx ? { ...st, ...patch } : st)));

  const insertVar = (idx: number, v: string) =>
    updateStep(idx, { corpo: (steps[idx].corpo + " " + v).trim() });

  const generateAI = async (idx: number) => {
    const step = steps[idx];
    if (!step.assunto && !form.nome) {
      return toast.error("Preencha o nome da campanha ou assunto primeiro");
    }
    toast.loading("Gerando com IA...", { id: "ai" });
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          contexto: `${form.nome}. Step ${step.step_numero} de uma sequência. ${step.assunto || ""}`,
          tom: idx === 0 ? "profissional cordial" : "follow-up educado",
        },
      });
      if (error) throw error;
      updateStep(idx, {
        assunto: data?.assunto || step.assunto,
        corpo: data?.corpo || step.corpo,
      });
      toast.success("Gerado!", { id: "ai" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar", { id: "ai" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (steps.some((s) => !s.assunto || !s.corpo)) {
      return toast.error("Preencha todos os steps");
    }
    setBusy(true);

    const status = form.agendar ? "agendada" : "rascunho";
    const agendado_para = form.agendar && form.agendadoPara
      ? new Date(form.agendadoPara).toISOString()
      : null;

    const { data: campanha, error } = await supabase
      .from("campanhas")
      .insert({
        user_id: user.id,
        nome: form.nome,
        assunto: steps[0].assunto,
        corpo: steps[0].corpo,
        status: status as any,
        agendado_para,
      })
      .select()
      .single();

    if (error || !campanha) {
      setBusy(false);
      return toast.error(error?.message ?? "Erro ao criar campanha");
    }

    // salvar steps
    await supabase.from("email_steps").insert(
      steps.map((s) => ({
        campanha_id: campanha.id,
        step_numero: s.step_numero,
        assunto: s.assunto,
        corpo: s.corpo,
        delay_dias: s.delay_dias,
      })),
    );

    // vincular leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("status", form.leadStatus);

    if (leads && leads.length > 0) {
      await supabase
        .from("campanha_leads")
        .insert(leads.map((l) => ({ campanha_id: campanha.id, lead_id: l.id })));
    }

    setBusy(false);
    toast.success(
      form.agendar
        ? `Campanha agendada para ${new Date(agendado_para!).toLocaleString("pt-BR")} (${leads?.length ?? 0} leads)`
        : `Rascunho criado (${leads?.length ?? 0} leads)`,
    );
    resetForm();
    setOpen(false);
    load();
  };

  const statusColor = (s: string) =>
    s === "enviado" ? "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30"
    : s === "enviando" ? "bg-status-em-contato/15 text-status-em-contato border-status-em-contato/30"
    : s === "agendada" ? "bg-primary/15 text-primary border-primary/30"
    : "bg-status-descartado/15 text-status-descartado border-status-descartado/30";

  const statusLabel = (s: string) =>
    s === "rascunho" ? "Rascunho" : s === "enviando" ? "Enviando" : s === "agendada" ? "Agendada" : "Enviado";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground text-sm">{campanhas.length} campanha(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Nova campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome da campanha</Label>
                  <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Público (status do lead)</Label>
                  <Select value={form.leadStatus} onValueChange={(v) => setForm({ ...form, leadStatus: v as LeadStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AGENDAMENTO */}
              <Card className="p-3 bg-secondary/30 border-border">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <Label className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, agendar: !f.agendar }))}>
                      Agendar envio
                    </Label>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.agendar}
                    onChange={(e) => setForm({ ...form, agendar: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                {form.agendar && (
                  <Input
                    type="datetime-local"
                    required={form.agendar}
                    value={form.agendadoPara}
                    onChange={(e) => setForm({ ...form, agendadoPara: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                )}
              </Card>

              {/* STEPS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Sequência de e-mails ({steps.length} step{steps.length > 1 ? "s" : ""})</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addStep}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar step
                  </Button>
                </div>

                {steps.map((step, idx) => (
                  <Card key={idx} className="p-3 bg-card border-border space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          Step {step.step_numero}
                        </Badge>
                        {idx > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Aguardar</span>
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              value={step.delay_dias}
                              onChange={(e) => updateStep(idx, { delay_dias: Number(e.target.value) })}
                              className="h-7 w-14 text-xs"
                            />
                            <span>dia(s) após o anterior</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => generateAI(idx)} title="Gerar com IA">
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        {steps.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Input
                      placeholder="Assunto"
                      required
                      value={step.assunto}
                      onChange={(e) => updateStep(idx, { assunto: e.target.value })}
                    />
                    <Textarea
                      rows={5}
                      placeholder="Olá {{nome}}, ..."
                      required
                      value={step.corpo}
                      onChange={(e) => updateStep(idx, { corpo: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1">
                      {VARIAVEIS.map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 text-[10px]"
                          onClick={() => insertVar(idx, v)}
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : form.agendar ? "Agendar campanha" : "Salvar rascunho"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campanhas.length === 0 ? (
        <Card className="p-10 text-center bg-card border-border">
          <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {campanhas.map((c) => (
            <Card
              key={c.id}
              className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setDetail(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{c.nome}</h3>
                  <p className="text-sm text-muted-foreground truncate">{c.assunto}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.lead_count} lead(s) • {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    {c.agendado_para && ` • 📅 ${new Date(c.agendado_para).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <Badge variant="outline" className={statusColor(c.status)}>
                  {statusLabel(c.status)}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

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
          .from("email_eventos")
          .select("tipo")
          .in("campanha_lead_id", ids);
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
