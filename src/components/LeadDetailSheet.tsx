import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Calendar as CalendarIcon, Sparkles, Mail, MessageCircle, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StatusBadge, LeadStatus, STATUS_OPTIONS } from "./StatusBadge";
import { ScoreBadge } from "./ScoreBadge";

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  status: LeadStatus;
  score: number | null;
  abordagem_sugerida: string | null;
}

interface Tag { id: string; nome: string; cor: string; }
interface Nota { id: string; texto: string; criado_em: string; }
interface Atividade { id: string; tipo: string; descricao: string; criado_em: string; }

interface Props {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function LeadDetailSheet({ leadId, open, onOpenChange, onUpdated }: Props) {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [notas, setNotas] = useState<Nota[]>([]);
  const [novaNota, setNovaNota] = useState("");
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  useEffect(() => {
    if (!open || !leadId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  const loadAll = async () => {
    if (!leadId) return;
    const [{ data: l }, { data: lt }, { data: at }, { data: nt }, { data: ats }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
      supabase.from("lead_tags").select("tag_id, tags(id,nome,cor)").eq("lead_id", leadId),
      supabase.from("tags").select("*").order("nome"),
      supabase.from("notas").select("*").eq("lead_id", leadId).order("criado_em", { ascending: false }),
      supabase.from("atividades").select("*").eq("lead_id", leadId).order("criado_em", { ascending: false }),
    ]);
    if (l) {
      setLead(l as any);
      setEditForm(l as any);
    }
    setTags(((lt ?? []) as any[]).map((r) => r.tags).filter(Boolean));
    setAllTags((at ?? []) as Tag[]);
    setNotas((nt ?? []) as Nota[]);
    setAtividades((ats ?? []) as Atividade[]);
  };

  const saveEdit = async () => {
    if (!lead) return;
    const { error } = await supabase
      .from("leads")
      .update({
        nome: editForm.nome,
        empresa: editForm.empresa,
        cargo: editForm.cargo,
        email: editForm.email,
        telefone: editForm.telefone,
        status: editForm.status as LeadStatus,
      })
      .eq("id", lead.id);
    if (error) return toast.error(error.message);
    toast.success("Lead atualizado");
    setEditing(false);
    onUpdated?.();
    loadAll();
  };

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !leadId || !newTag.trim()) return;
    const nome = newTag.trim();
    let tag = allTags.find((t) => t.nome.toLowerCase() === nome.toLowerCase());
    if (!tag) {
      const cor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;
      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: user.id, nome, cor })
        .select()
        .single();
      if (error) return toast.error(error.message);
      tag = data as Tag;
    }
    const { error: linkErr } = await supabase
      .from("lead_tags")
      .insert({ lead_id: leadId, tag_id: tag.id });
    if (linkErr && !linkErr.message.includes("duplicate")) return toast.error(linkErr.message);
    setNewTag("");
    loadAll();
    onUpdated?.();
  };

  const removeTag = async (tagId: string) => {
    if (!leadId) return;
    await supabase.from("lead_tags").delete().eq("lead_id", leadId).eq("tag_id", tagId);
    loadAll();
    onUpdated?.();
  };

  const addNota = async () => {
    if (!user || !leadId || !novaNota.trim()) return;
    const { error } = await supabase
      .from("notas")
      .insert({ lead_id: leadId, user_id: user.id, texto: novaNota.trim() });
    if (error) return toast.error(error.message);
    await supabase.from("atividades").insert({
      lead_id: leadId, user_id: user.id, tipo: "nota", descricao: novaNota.trim().slice(0, 100),
    });
    setNovaNota("");
    loadAll();
  };

  const removeNota = async (id: string) => {
    await supabase.from("notas").delete().eq("id", id);
    loadAll();
  };

  const calendarUrl = lead
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        `Reunião com ${lead.nome}`,
      )}&details=${encodeURIComponent(`Empresa: ${lead.empresa ?? "—"}`)}${lead.email ? `&add=${encodeURIComponent(lead.email)}` : ""}`
    : "#";

  const activityIcon = (tipo: string) => {
    if (tipo.startsWith("email")) return Mail;
    if (tipo.startsWith("resposta")) return MessageCircle;
    if (tipo === "nota") return StickyNote;
    return CalendarIcon;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        {!lead ? (
          <div className="p-6 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <SheetTitle className="text-left text-xl truncate">{lead.nome}</SheetTitle>
                  <p className="text-sm text-muted-foreground truncate">
                    {lead.empresa ?? "—"} {lead.cargo ? `• ${lead.cargo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={lead.score} />
                  <StatusBadge status={lead.status} />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => removeTag(t.id)}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium hover:opacity-70"
                    style={{ borderColor: t.cor, color: t.cor, backgroundColor: `${t.cor}15` }}
                    title="Clique para remover"
                  >
                    {t.nome} <X className="h-3 w-3" />
                  </button>
                ))}
                <form onSubmit={addTag} className="inline-flex">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="+ tag"
                    list="all-tags-suggestions"
                    className="h-6 w-24 text-xs"
                  />
                  <datalist id="all-tags-suggestions">
                    {allTags.map((t) => <option key={t.id} value={t.nome} />)}
                  </datalist>
                </form>
              </div>
            </SheetHeader>

            <Tabs defaultValue="perfil" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-5 mt-3 grid grid-cols-4">
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
                <TabsTrigger value="reuniao">Reunião</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <TabsContent value="perfil" className="space-y-3 mt-0">
                  {lead.abordagem_sugerida && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Abordagem sugerida pela IA
                      </p>
                      <p className="text-sm mt-1">{lead.abordagem_sugerida}</p>
                    </div>
                  )}
                  {!editing ? (
                    <>
                      <Field label="Nome" value={lead.nome} />
                      <Field label="Empresa" value={lead.empresa} />
                      <Field label="Cargo" value={lead.cargo} />
                      <Field label="E-mail" value={lead.email} />
                      <Field label="Telefone" value={lead.telefone} />
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        Editar dados
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {(["nome", "empresa", "cargo", "email", "telefone"] as const).map((f) => (
                        <div key={f} className="space-y-1">
                          <Label className="capitalize text-xs">{f}</Label>
                          <Input
                            value={(editForm as any)[f] ?? ""}
                            onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })}
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(v) => setEditForm({ ...editForm, status: v as LeadStatus })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={saveEdit}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditForm(lead); }}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="historico" className="mt-0">
                  {atividades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma atividade registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {atividades.map((a) => {
                        const Icon = activityIcon(a.tipo);
                        return (
                          <div key={a.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                            <div className="rounded-lg bg-secondary p-2 h-fit">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium capitalize">{a.tipo.replace(/_/g, " ")}</p>
                              <p className="text-sm">{a.descricao}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(a.criado_em).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notas" className="space-y-3 mt-0">
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={novaNota}
                      onChange={(e) => setNovaNota(e.target.value)}
                      placeholder="Adicione uma nota sobre este lead..."
                    />
                    <Button size="sm" onClick={addNota} disabled={!novaNota.trim()}>
                      <Plus className="h-4 w-4" /> Salvar nota
                    </Button>
                  </div>
                  {notas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma nota ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {notas.map((n) => (
                        <div key={n.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{n.texto}</p>
                            <Button variant="ghost" size="icon" onClick={() => removeNota(n.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.criado_em).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reuniao" className="space-y-3 mt-0">
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <p className="text-sm">
                      Agende uma reunião com {lead.nome} no Google Calendar.
                    </p>
                    <Button asChild size="sm">
                      <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                        <CalendarIcon className="h-4 w-4" /> Agendar no Google Calendar
                      </a>
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right truncate">{value ?? "—"}</span>
    </div>
  );
}
