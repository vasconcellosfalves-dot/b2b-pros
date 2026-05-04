import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, ChevronLeft, ChevronRight, Send, CalendarIcon,
  CheckCircle2, AlertCircle, Plus, Trash2, Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_OPTIONS, LeadStatus } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Step {
  step_numero: number;
  assunto: string;
  corpo: string;
  delay_dias: number;
}

interface CampanhaWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  templateSeed?: TemplateSeed | null;
}

export interface TemplateSeed {
  nome?: string;
  briefing_persona?: string | null;
  briefing_dor?: string | null;
  briefing_cta?: string | null;
  tom_voz?: string | null;
  idioma?: string | null;
  steps?: Array<{ assunto: string; corpo: string; delay_dias: number }>;
}

const VARS = ["{{nome}}", "{{empresa}}", "{{cargo}}"];

const TONS = [
  { v: "profissional_direto", l: "Profissional e direto" },
  { v: "consultivo_educativo", l: "Consultivo e educativo" },
  { v: "provocativo_desafiador", l: "Provocativo e desafiador" },
  { v: "proximo_descontraido", l: "Próximo e descontraído" },
];
const IDIOMAS = [
  { v: "pt-BR", l: "Português (BR)" },
  { v: "en", l: "Inglês" },
  { v: "es", l: "Espanhol" },
];

const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export default function CampanhaWizard({ open, onClose, onCreated, templateSeed }: CampanhaWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // contexto do usuário (das Configurações)
  const [ctx, setCtx] = useState({
    empresa_descricao: "",
    cliente_ideal_padrao: "",
    dores_resolvidas: "",
    tom_voz_padrao: "profissional_direto",
    idioma_padrao: "pt-BR",
  });

  // Passo 1
  const [briefing, setBriefing] = useState({
    nome: "",
    persona: "",
    dor: "",
    cta: "",
    tom: "profissional_direto",
    idioma: "pt-BR",
    leadStatus: "novo" as LeadStatus,
  });

  // Passo 2
  const [steps, setSteps] = useState<Step[]>([
    { step_numero: 1, assunto: "", corpo: "", delay_dias: 0 },
    { step_numero: 2, assunto: "", corpo: "", delay_dias: 3 },
    { step_numero: 3, assunto: "", corpo: "", delay_dias: 4 },
  ]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  // Passo 4
  const [agendar, setAgendar] = useState(false);
  const [agendadoPara, setAgendadoPara] = useState("");
  const [leadCount, setLeadCount] = useState(0);

  // carregar config + sementes
  useEffect(() => {
    if (!open || !user) return;
    setStep(1);
    setPreviewMode(false);
    (async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("empresa_descricao, cliente_ideal_padrao, dores_resolvidas, tom_voz_padrao, idioma_padrao")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setCtx({
          empresa_descricao: data.empresa_descricao ?? "",
          cliente_ideal_padrao: data.cliente_ideal_padrao ?? "",
          dores_resolvidas: data.dores_resolvidas ?? "",
          tom_voz_padrao: data.tom_voz_padrao ?? "profissional_direto",
          idioma_padrao: data.idioma_padrao ?? "pt-BR",
        });
        setBriefing((b) => ({
          ...b,
          tom: templateSeed?.tom_voz ?? data.tom_voz_padrao ?? b.tom,
          idioma: templateSeed?.idioma ?? data.idioma_padrao ?? b.idioma,
        }));
      }
      if (templateSeed) {
        setBriefing((b) => ({
          ...b,
          nome: templateSeed.nome ? `${templateSeed.nome} — nova campanha` : b.nome,
          persona: templateSeed.briefing_persona ?? b.persona,
          dor: templateSeed.briefing_dor ?? b.dor,
          cta: templateSeed.briefing_cta ?? b.cta,
          tom: templateSeed.tom_voz ?? b.tom,
          idioma: templateSeed.idioma ?? b.idioma,
        }));
        if (templateSeed.steps?.length) {
          setSteps(
            templateSeed.steps.slice(0, 5).map((s, i) => ({
              step_numero: i + 1,
              assunto: s.assunto ?? "",
              corpo: s.corpo ?? "",
              delay_dias: s.delay_dias ?? (i === 0 ? 0 : 3),
            })),
          );
        }
      }
    })();
  }, [open, user, templateSeed]);

  // contagem de leads
  useEffect(() => {
    if (!user || step !== 4) return;
    (async () => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", briefing.leadStatus);
      setLeadCount(count ?? 0);
    })();
  }, [user, step, briefing.leadStatus]);

  const canNext = useMemo(() => {
    if (step === 1) return briefing.nome.trim() && briefing.persona.trim() && briefing.dor.trim() && briefing.cta.trim();
    if (step === 2) return steps.every((s) => s.assunto.trim() && s.corpo.trim());
    return true;
  }, [step, briefing, steps]);

  const updateStep = (idx: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, i) => (i === idx ? { ...st, ...patch } : st)));
  const addStep = () =>
    setSteps((s) =>
      s.length >= 5 ? s : [...s, { step_numero: s.length + 1, assunto: "", corpo: "", delay_dias: 4 }],
    );
  const removeStep = (idx: number) =>
    setSteps((s) => s.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_numero: i + 1 })));
  const insertVar = (idx: number, v: string) =>
    updateStep(idx, { corpo: (steps[idx].corpo + " " + v).trim() });

  const generate = async (idx: number) => {
    setGeneratingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          empresa_descricao: ctx.empresa_descricao,
          cliente_ideal: ctx.cliente_ideal_padrao,
          dores: ctx.dores_resolvidas,
          persona: briefing.persona,
          dor: briefing.dor,
          cta: briefing.cta,
          tom: briefing.tom,
          idioma: briefing.idioma,
          step: idx + 1,
          assunto_atual: steps[idx].assunto,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateStep(idx, {
        assunto: data?.assunto || steps[idx].assunto,
        corpo: data?.corpo || steps[idx].corpo,
      });
      toast.success(`E-mail ${idx + 1} gerado`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar");
    } finally {
      setGeneratingIdx(null);
    }
  };

  const generateAll = async () => {
    for (let i = 0; i < steps.length; i++) await generate(i);
  };

  const renderPreview = (text: string) =>
    text
      .replace(/\{\{nome\}\}/g, "Maria")
      .replace(/\{\{empresa\}\}/g, "Acme")
      .replace(/\{\{cargo\}\}/g, "CMO");

  const cadenciaTotal = steps.reduce((sum, s) => sum + s.delay_dias, 0);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const status = agendar ? "agendada" : "rascunho";
    const agendado_para = agendar && agendadoPara ? new Date(agendadoPara).toISOString() : null;

    const { data: campanha, error } = await supabase
      .from("campanhas")
      .insert({
        user_id: user.id,
        nome: briefing.nome,
        assunto: steps[0].assunto,
        corpo: steps[0].corpo,
        status: status as any,
        agendado_para,
        tom_voz: briefing.tom,
        idioma: briefing.idioma,
        briefing_persona: briefing.persona,
        briefing_dor: briefing.dor,
        briefing_cta: briefing.cta,
      })
      .select()
      .single();

    if (error || !campanha) {
      setBusy(false);
      return toast.error(error?.message ?? "Erro ao criar campanha");
    }

    await supabase.from("email_steps").insert(
      steps.map((s) => ({
        campanha_id: campanha.id,
        step_numero: s.step_numero,
        assunto: s.assunto,
        corpo: s.corpo,
        delay_dias: s.delay_dias,
      })),
    );

    const { data: leads } = await supabase
      .from("leads").select("id").eq("user_id", user.id).eq("status", briefing.leadStatus);
    if (leads?.length) {
      await supabase.from("campanha_leads").insert(
        leads.map((l) => ({ campanha_id: campanha.id, lead_id: l.id })),
      );
    }

    setBusy(false);
    toast.success(
      agendar
        ? `Campanha agendada para ${new Date(agendado_para!).toLocaleString("pt-BR")} (${leads?.length ?? 0} leads)`
        : `Rascunho salvo (${leads?.length ?? 0} leads)`,
    );
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full grid place-items-center text-xs font-semibold ${
                  step === n
                    ? "bg-primary text-primary-foreground"
                    : step > n
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
              </div>
              <span
                className={`text-xs ${step === n ? "font-semibold" : "text-muted-foreground"} hidden sm:inline`}
              >
                {n === 1 ? "Briefing" : n === 2 ? "Sequência" : n === 3 ? "Revisão" : "Disparo"}
              </span>
              {n < 4 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* PASSO 1 - Briefing */}
        {step === 1 && (
          <div className="space-y-4">
            {(!ctx.empresa_descricao || !ctx.cliente_ideal_padrao) && (
              <Card className="p-3 bg-amber-500/10 border-amber-500/30 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Para a IA gerar e-mails melhores, preencha "Sobre seu negócio" em{" "}
                  <a href="/configuracoes" className="underline">Configurações</a>.
                </span>
              </Card>
            )}
            <div className="space-y-1.5">
              <Label>Nome da campanha *</Label>
              <Input
                value={briefing.nome}
                onChange={(e) => setBriefing({ ...briefing, nome: e.target.value })}
                placeholder="Ex.: CMOs SaaS — outbound Q2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Persona alvo *</Label>
              <Textarea
                rows={2}
                value={briefing.persona}
                onChange={(e) => setBriefing({ ...briefing, persona: e.target.value })}
                placeholder="Ex.: Diretores de marketing de SaaS B2B com 50-300 funcionários"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dor que esta campanha vai atacar *</Label>
              <Textarea
                rows={2}
                value={briefing.dor}
                onChange={(e) => setBriefing({ ...briefing, dor: e.target.value })}
                placeholder="Ex.: CAC subindo enquanto a conversão de MQL para SQL caiu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CTA desejado *</Label>
              <Input
                value={briefing.cta}
                onChange={(e) => setBriefing({ ...briefing, cta: e.target.value })}
                placeholder="Ex.: Agendar 15 min para mostrar nosso playbook"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tom de voz</Label>
                <Select value={briefing.tom} onValueChange={(v) => setBriefing({ ...briefing, tom: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Idioma</Label>
                <Select value={briefing.idioma} onValueChange={(v) => setBriefing({ ...briefing, idioma: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IDIOMAS.map((i) => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Público (status)</Label>
                <Select
                  value={briefing.leadStatus}
                  onValueChange={(v) => setBriefing({ ...briefing, leadStatus: v as LeadStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2 - Sequência */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Sequência de {steps.length} e-mail{steps.length > 1 ? "s" : ""} em {cadenciaTotal} dia{cadenciaTotal === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewMode((p) => !p)}>
                  {previewMode ? <><EyeOff className="h-3.5 w-3.5" /> Editar</> : <><Eye className="h-3.5 w-3.5" /> Preview</>}
                </Button>
                <Button size="sm" variant="outline" onClick={generateAll} disabled={generatingIdx !== null}>
                  <Sparkles className="h-3.5 w-3.5" /> Gerar todos com IA
                </Button>
              </div>
            </div>

            {steps.map((s, idx) => {
              const wcSubject = s.assunto.length;
              const wcBody = wordCount(s.corpo);
              const subjectOk = wcSubject > 0 && wcSubject <= 50;
              const bodyOk = wcBody >= 40 && wcBody <= 130;
              return (
                <Card key={idx} className="p-3 bg-card border-border space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        E-mail {s.step_numero}
                      </Badge>
                      {idx > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>Aguardar</span>
                          <Input
                            type="number" min={1} max={60}
                            value={s.delay_dias}
                            onChange={(e) => updateStep(idx, { delay_dias: Number(e.target.value) })}
                            className="h-7 w-14 text-xs"
                          />
                          <span>dia(s)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button" size="sm" variant="ghost"
                        disabled={generatingIdx !== null}
                        onClick={() => generate(idx)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {generatingIdx === idx ? "Gerando..." : "Gerar"}
                      </Button>
                      {steps.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {previewMode ? (
                    <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Assunto:</p>
                      <p className="font-medium">{renderPreview(s.assunto) || <em className="text-muted-foreground">(vazio)</em>}</p>
                      <p className="text-xs text-muted-foreground mt-2">Corpo:</p>
                      <p className="text-sm whitespace-pre-wrap">{renderPreview(s.corpo) || <em className="text-muted-foreground">(vazio)</em>}</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Assunto curto (3-6 palavras)"
                        value={s.assunto}
                        onChange={(e) => updateStep(idx, { assunto: e.target.value })}
                      />
                      <Textarea
                        rows={6}
                        placeholder="Olá {{nome}}, ..."
                        value={s.corpo}
                        onChange={(e) => updateStep(idx, { corpo: e.target.value })}
                      />
                      <div className="flex flex-wrap gap-1">
                        {VARS.map((v) => (
                          <Badge
                            key={v} variant="outline"
                            className="cursor-pointer hover:bg-primary/10 text-[10px]"
                            onClick={() => insertVar(idx, v)}
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="flex gap-3 text-[11px]">
                    <span className={subjectOk ? "text-status-respondeu" : "text-muted-foreground"}>
                      Assunto: {wcSubject} car. {subjectOk ? "✓" : "(ideal ≤ 50)"}
                    </span>
                    <span className={bodyOk ? "text-status-respondeu" : "text-muted-foreground"}>
                      Corpo: {wcBody} palavras {bodyOk ? "✓" : "(ideal 40-130)"}
                    </span>
                  </div>
                </Card>
              );
            })}

            {steps.length < 5 && (
              <Button variant="outline" size="sm" onClick={addStep} className="w-full">
                <Plus className="h-3.5 w-3.5" /> Adicionar follow-up
              </Button>
            )}
          </div>
        )}

        {/* PASSO 3 - Revisão */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Revise como cada e-mail vai aparecer para o lead. Variáveis substituídas por exemplo (Maria / Acme / CMO).
            </p>
            {steps.map((s) => (
              <Card key={s.step_numero} className="p-3 bg-secondary/30 border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                    E-mail {s.step_numero}
                  </Badge>
                  {s.delay_dias > 0 && (
                    <span className="text-[10px] text-muted-foreground">após {s.delay_dias} dia(s)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Assunto:</p>
                <p className="font-semibold mb-2">{renderPreview(s.assunto)}</p>
                <p className="text-xs text-muted-foreground">Corpo:</p>
                <p className="text-sm whitespace-pre-wrap">{renderPreview(s.corpo)}</p>
              </Card>
            ))}
          </div>
        )}

        {/* PASSO 4 - Disparo */}
        {step === 4 && (
          <div className="space-y-4">
            <Card className="p-4 bg-card border-border space-y-1">
              <p className="font-semibold">{briefing.nome}</p>
              <p className="text-xs text-muted-foreground">
                {steps.length} e-mail{steps.length > 1 ? "s" : ""} em {cadenciaTotal} dia{cadenciaTotal === 1 ? "" : "s"} ·{" "}
                Tom: {TONS.find((t) => t.v === briefing.tom)?.l}
              </p>
              <p className="text-xs text-muted-foreground">
                Público: {STATUS_OPTIONS.find((s) => s.value === briefing.leadStatus)?.label} —{" "}
                <span className="font-semibold text-foreground">{leadCount} lead{leadCount === 1 ? "" : "s"}</span>
              </p>
            </Card>

            <Card className="p-3 bg-secondary/30 border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <Label>Agendar disparo do 1º e-mail</Label>
                </div>
                <input
                  type="checkbox" checked={agendar}
                  onChange={(e) => setAgendar(e.target.checked)} className="h-4 w-4"
                />
              </div>
              {agendar && (
                <Input
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </Card>

            {leadCount === 0 && (
              <Card className="p-3 bg-amber-500/10 border-amber-500/30 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                Nenhum lead com o status selecionado. A campanha será criada como rascunho sem leads.
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          <Button
            variant="ghost"
            disabled={step === 1 || busy}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < 4 ? (
            <Button
              disabled={!canNext || busy}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Avançar <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy}>
              <Send className="h-4 w-4" /> {busy ? "Salvando..." : agendar ? "Agendar campanha" : "Salvar como rascunho"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
