import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Send,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { LeadStatus, STATUS_OPTIONS } from "./StatusBadge";

interface BaseLead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone?: string | null;
  source: "apollo" | "db";
  apollo_id?: string;
}

const SIZE_OPTIONS = [
  { value: "1,10", label: "1-10" },
  { value: "11,50", label: "11-50" },
  { value: "51,200", label: "51-200" },
  { value: "201,1000", label: "201-1000" },
  { value: "1001,1000000", label: "1000+" },
];

const FILTERABLE_STATUS = STATUS_OPTIONS.filter((s) =>
  ["novo", "em_contato", "respondeu"].includes(s.value),
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpactWizard({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 - origin
  const [origin, setOrigin] = useState<"apollo" | "db">("apollo");
  // Apollo
  const [apTitles, setApTitles] = useState("");
  const [apIndustry, setApIndustry] = useState("");
  const [apCountry, setApCountry] = useState("Brazil");
  const [apSize, setApSize] = useState("");
  const [apLoading, setApLoading] = useState(false);
  const [apResults, setApResults] = useState<BaseLead[]>([]);
  // DB
  const [dbStatus, setDbStatus] = useState<LeadStatus | "all">("all");
  const [dbLeads, setDbLeads] = useState<BaseLead[]>([]);
  // Selected (always tracked by id)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2 - email
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // Step 3/4
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    skipped: number;
    campanha_id: string;
  } | null>(null);
  const [sgConfigured, setSgConfigured] = useState<boolean | null>(null);

  const reset = () => {
    setStep(1);
    setOrigin("apollo");
    setApResults([]);
    setSelectedIds(new Set());
    setNomeCampanha("");
    setAssunto("");
    setCorpo("");
    setResult(null);
  };

  useEffect(() => {
    if (!open) {
      // delay reset until close anim
      setTimeout(reset, 200);
    } else {
      // load db leads + sendgrid config
      loadDbLeads();
      checkSendGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadDbLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("id, nome, empresa, cargo, email, telefone, status")
      .order("criado_em", { ascending: false });
    setDbLeads(
      ((data ?? []) as any[]).map((l) => ({
        id: `db:${l.id}`,
        nome: l.nome,
        empresa: l.empresa,
        cargo: l.cargo,
        email: l.email,
        telefone: l.telefone,
        source: "db" as const,
        // store status on the object via cast for filtering
        ...(l.status ? { _status: l.status } : {}),
      })),
    );
  };

  const checkSendGrid = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("configuracoes")
      .select("sendgrid_key, remetente_email")
      .eq("user_id", user.id)
      .maybeSingle();
    setSgConfigured(!!(data?.sendgrid_key && data?.remetente_email));
  };

  const filteredDbLeads = useMemo(() => {
    if (dbStatus === "all") return dbLeads;
    return dbLeads.filter((l: any) => l._status === dbStatus);
  }, [dbLeads, dbStatus]);

  const currentList = origin === "apollo" ? apResults : filteredDbLeads;
  const selectedCount = currentList.filter((l) => selectedIds.has(l.id)).length;

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleApolloSearch = async () => {
    setApLoading(true);
    setApResults([]);
    try {
      const body = {
        person_titles: apTitles ? apTitles.split(",").map((s) => s.trim()).filter(Boolean) : [],
        organization_industry_tag_ids: apIndustry
          ? apIndustry.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        person_locations: apCountry ? [apCountry] : [],
        organization_num_employees_ranges: apSize ? [apSize] : [],
      };
      const { data, error } = await supabase.functions.invoke("apollo-search", { body });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const people = (data as any).people ?? [];
      setApResults(
        people.map((p: any) => ({
          id: `ap:${p.id}`,
          apollo_id: p.id,
          nome: p.nome,
          empresa: p.empresa,
          cargo: p.cargo,
          email: p.email,
          telefone: p.telefone,
          source: "apollo" as const,
        })),
      );
      if (people.length === 0) toast.info("Nenhum resultado");
    } catch (err: any) {
      toast.error(err.message || "Erro na busca");
    } finally {
      setApLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: { cargo: apTitles, setor: apIndustry },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setCorpo((data as any).content ?? "");
      toast.success("Sugestão gerada");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar");
    } finally {
      setAiBusy(false);
    }
  };

  // Get selected leads with full data
  const selectedLeads = useMemo(() => {
    const all = [...apResults, ...filteredDbLeads];
    return all.filter((l) => selectedIds.has(l.id));
  }, [apResults, filteredDbLeads, selectedIds]);

  const firstLead = selectedLeads[0];

  const renderTpl = (tpl: string, lead?: BaseLead) =>
    tpl
      .replaceAll("{{nome}}", lead?.nome ?? "[nome]")
      .replaceAll("{{empresa}}", lead?.empresa ?? "[empresa]")
      .replaceAll("{{cargo}}", lead?.cargo ?? "[cargo]");

  const canStep2 = selectedIds.size > 0;
  const canStep3 = nomeCampanha.trim() && assunto.trim() && corpo.trim();

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      // 1) Importar leads do Apollo (criar registros novos)
      const apolloSelected = selectedLeads.filter((l) => l.source === "apollo");
      const dbSelected = selectedLeads.filter((l) => l.source === "db");

      let importedDbIds: string[] = [];

      if (apolloSelected.length) {
        // dedupe por email
        const emails = apolloSelected.map((l) => l.email).filter(Boolean) as string[];
        let existing = new Map<string, string>();
        if (emails.length) {
          const { data: ex } = await supabase
            .from("leads")
            .select("id, email")
            .in("email", emails);
          existing = new Map((ex ?? []).map((r: any) => [r.email, r.id]));
        }

        const toInsert = apolloSelected
          .filter((l) => !l.email || !existing.has(l.email))
          .map((l) => ({
            user_id: user.id,
            nome: l.nome || "Sem nome",
            empresa: l.empresa,
            cargo: l.cargo,
            email: l.email,
            telefone: l.telefone ?? null,
            status: "novo" as const,
          }));

        if (toInsert.length) {
          const { data: inserted, error } = await supabase
            .from("leads")
            .insert(toInsert)
            .select("id");
          if (error) throw error;
          importedDbIds = (inserted ?? []).map((r) => r.id);
        }

        // ids existentes reutilizados
        for (const l of apolloSelected) {
          if (l.email && existing.has(l.email)) {
            importedDbIds.push(existing.get(l.email)!);
          }
        }
      }

      const dbIdsFromSelection = dbSelected.map((l) => l.id.replace(/^db:/, ""));
      const allLeadDbIds = [...new Set([...importedDbIds, ...dbIdsFromSelection])];

      if (allLeadDbIds.length === 0) {
        throw new Error("Nenhum lead válido para envio");
      }

      // 2) Buscar dados completos
      const { data: fullLeads, error: fullErr } = await supabase
        .from("leads")
        .select("id, nome, empresa, cargo, email")
        .in("id", allLeadDbIds);
      if (fullErr) throw fullErr;

      // 3) Criar campanha
      const { data: camp, error: campErr } = await supabase
        .from("campanhas")
        .insert({
          user_id: user.id,
          nome: nomeCampanha,
          assunto,
          corpo,
          status: "rascunho",
        })
        .select("id")
        .single();
      if (campErr) throw campErr;

      // 4) Disparar envio
      const { data: sendRes, error: sendErr } = await supabase.functions.invoke(
        "send-campaign",
        {
          body: {
            campanha_id: camp.id,
            leads: fullLeads,
            assunto,
            corpo,
          },
        },
      );
      if (sendErr) throw new Error(sendErr.message);
      if ((sendRes as any)?.error) throw new Error((sendRes as any).error);

      setResult({
        sent: (sendRes as any).sent ?? 0,
        failed: (sendRes as any).failed ?? 0,
        skipped: (sendRes as any).skipped ?? 0,
        campanha_id: camp.id,
      });
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Erro ao disparar");
    } finally {
      setSending(false);
    }
  };

  const stepTitles = [
    "Quem você quer impactar?",
    "O que você vai dizer?",
    "Revise antes de enviar",
    "Campanha disparada!",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Passo {step} de 4</span>
            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
          <SheetTitle className="text-left text-xl">{stepTitles[step - 1]}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <Tabs value={origin} onValueChange={(v) => setOrigin(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="apollo">Buscar no Apollo</TabsTrigger>
                <TabsTrigger value="db">Leads cadastrados</TabsTrigger>
              </TabsList>

              <TabsContent value="apollo" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cargo alvo</Label>
                    <Input
                      placeholder="CEO, Diretor"
                      value={apTitles}
                      onChange={(e) => setApTitles(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Setor</Label>
                    <Input
                      placeholder="SaaS, Indústria"
                      value={apIndustry}
                      onChange={(e) => setApIndustry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>País</Label>
                    <Input value={apCountry} onChange={(e) => setApCountry(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamanho</Label>
                    <Select value={apSize} onValueChange={setApSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleApolloSearch} disabled={apLoading} className="w-full">
                  {apLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {apLoading ? "Buscando..." : "Buscar"}
                </Button>

                {apResults.length > 0 && (
                  <LeadList
                    leads={apResults}
                    selectedIds={selectedIds}
                    onToggle={toggleId}
                  />
                )}
              </TabsContent>

              <TabsContent value="db" className="space-y-3 mt-4">
                <Select value={dbStatus} onValueChange={(v) => setDbStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {FILTERABLE_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredDbLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum lead encontrado.
                  </p>
                ) : (
                  <LeadList
                    leads={filteredDbLeads}
                    selectedIds={selectedIds}
                    onToggle={toggleId}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da campanha *</Label>
                <Input
                  value={nomeCampanha}
                  onChange={(e) => setNomeCampanha(e.target.value)}
                  placeholder="Outreach SaaS Janeiro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Assunto do e-mail *</Label>
                <Input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Pergunta rápida sobre {{empresa}}"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Corpo do e-mail *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAiSuggest}
                    disabled={aiBusy}
                  >
                    {aiBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiBusy ? "Gerando..." : "Gerar com IA"}
                  </Button>
                </div>
                <Textarea
                  rows={8}
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                  placeholder="Olá {{nome}}, vi que você é {{cargo}} na {{empresa}}..."
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: <code className="text-primary">{"{{nome}}"}</code>{" "}
                  <code className="text-primary">{"{{empresa}}"}</code>{" "}
                  <code className="text-primary">{"{{cargo}}"}</code>
                </p>
              </div>

              {firstLead && (corpo || assunto) && (
                <Card className="p-4 bg-secondary/40 border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Preview com {firstLead.nome}:
                  </p>
                  <p className="text-sm font-semibold">{renderTpl(assunto, firstLead)}</p>
                  <p className="text-sm whitespace-pre-wrap mt-2">
                    {renderTpl(corpo, firstLead)}
                  </p>
                </Card>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Card className="p-4 bg-card border-border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Público</p>
                  <p className="font-semibold">{selectedLeads.length} leads selecionados</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {selectedLeads.slice(0, 3).map((l) => (
                      <li key={l.id} className="truncate">
                        • {l.nome} {l.empresa ? `— ${l.empresa}` : ""}
                      </li>
                    ))}
                    {selectedLeads.length > 3 && (
                      <li>e mais {selectedLeads.length - 3}…</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Campanha</p>
                  <p className="font-semibold">{nomeCampanha}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assunto</p>
                  <p className="font-semibold">{renderTpl(assunto, firstLead)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <p className="text-sm whitespace-pre-wrap mt-1 p-3 rounded-md bg-secondary/40">
                    {renderTpl(corpo, firstLead)}
                  </p>
                </div>
              </Card>

              {sgConfigured ? (
                <p className="text-xs text-muted-foreground">
                  Os e-mails serão enviados usando sua conta SendGrid configurada.
                </p>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Configure sua chave SendGrid em{" "}
                    <Link
                      to="/configuracoes"
                      onClick={() => onOpenChange(false)}
                      className="underline font-medium"
                    >
                      Configurações
                    </Link>{" "}
                    antes de enviar.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 4 && result && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-status-respondeu/15">
                <CheckCircle2 className="h-10 w-10 text-status-respondeu" />
              </div>
              <div>
                <p className="font-semibold text-lg">
                  Sua campanha {nomeCampanha} foi enviada para {result.sent} lead{result.sent === 1 ? "" : "s"}.
                </p>
                {result.failed > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    {result.failed} falha(s) no envio
                  </p>
                )}
                {result.skipped > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.skipped} lead(s) ignorado(s) por não ter e-mail
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-2 shrink-0 bg-card">
          {step === 1 && (
            <>
              <div className="text-sm text-muted-foreground">
                {selectedIds.size} lead{selectedIds.size === 1 ? "" : "s"} selecionado
                {selectedIds.size === 1 ? "" : "s"}
              </div>
              <Button onClick={() => setStep(2)} disabled={!canStep2}>
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canStep3}>
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} disabled={sending}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !sgConfigured}
                className="bg-status-respondeu text-white hover:bg-status-respondeu/90"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Disparando..." : "Disparar campanha"}
              </Button>
            </>
          )}
          {step === 4 && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Voltar ao início
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/emails");
                }}
                className="flex-1"
              >
                Ver campanha
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LeadList({
  leads,
  selectedIds,
  onToggle,
}: {
  leads: BaseLead[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      <div className="text-xs text-muted-foreground sticky top-0 bg-background py-1">
        {leads.filter((l) => selectedIds.has(l.id)).length} de {leads.length} selecionados
      </div>
      {leads.map((l) => (
        <label
          key={l.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/40 hover:bg-background/70 cursor-pointer transition-colors"
        >
          <Checkbox
            checked={selectedIds.has(l.id)}
            onCheckedChange={() => onToggle(l.id)}
            className="mt-0.5"
          />
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{l.nome}</p>
            <p className="text-xs text-muted-foreground truncate">
              {l.cargo ?? "—"}
              {l.empresa ? ` • ${l.empresa}` : ""}
            </p>
            {l.email && (
              <p className="text-xs text-muted-foreground truncate">{l.email}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
