import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  Linkedin,
  MailCheck,
  MailX,
  MoreHorizontal,
  Search,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, STATUS_OPTIONS, LeadStatus } from "@/components/StatusBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceBadge } from "@/components/leads/SourceBadge";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { relativeTime } from "@/lib/relativeTime";
import { toast } from "sonner";

export interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin_url: string | null;
  cidade: string | null;
  setor: string | null;
  senioridade: string | null;
  fonte: string | null;
  apollo_id: string | null;
  email_status: string | null;
  ultima_atividade: string | null;
  status: LeadStatus;
  score: number | null;
  abordagem_sugerida: string | null;
  criado_em: string;
}

interface Tag { id: string; nome: string; cor: string; }

type SortKey = "nome" | "score" | "ultima_atividade" | "criado_em";
type SortDir = "asc" | "desc";

const STATUS_CHIPS: { value: "all" | LeadStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "respondeu", label: "Respondeu" },
  { value: "convertido", label: "Convertido" },
  { value: "descartado", label: "Descartado" },
];

interface AdvFilters {
  fonte: "all" | "apollo" | "csv" | "manual";
  emailStatus: "all" | "valido" | "sem_email";
  tagIds: string[];
  scoreMin: number;
  scoreMax: number;
  cadastroDe: string;
  cadastroAte: string;
  atividadeDe: string;
  atividadeAte: string;
}

const defaultAdv: AdvFilters = {
  fonte: "all",
  emailStatus: "all",
  tagIds: [],
  scoreMin: 0,
  scoreMax: 100,
  cadastroDe: "",
  cadastroAte: "",
  atividadeDe: "",
  atividadeAte: "",
};

interface Props {
  onGoImport: () => void;
  highlightId?: string | null;
}

export function LeadsBaseTab({ onGoImport, highlightId }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tagsByLead, setTagsByLead] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusChip, setStatusChip] = useState<"all" | LeadStatus>("all");
  const [adv, setAdv] = useState<AdvFilters>(defaultAdv);
  const [advDraft, setAdvDraft] = useState<AdvFilters>(defaultAdv);
  const [advOpen, setAdvOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("criado_em");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qualifying, setQualifying] = useState(false);
  const [qualifyProgress, setQualifyProgress] = useState({ done: 0, total: 0 });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) toast.error(error.message);
    else setLeads((data ?? []) as Lead[]);

    const { data: lt } = await supabase
      .from("lead_tags")
      .select("lead_id, tag_id, tags(id,nome,cor)");
    const map: Record<string, Tag[]> = {};
    ((lt ?? []) as any[]).forEach((r) => {
      if (!r.tags) return;
      (map[r.lead_id] = map[r.lead_id] ?? []).push(r.tags);
    });
    setTagsByLead(map);

    const { data: at } = await supabase.from("tags").select("*").order("nome");
    setAllTags((at ?? []) as Tag[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  // Counts by status (ignoring chip filter, applies search + adv)
  const baseFilteredNoStatus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (q) {
        const hay = `${l.nome} ${l.empresa ?? ""} ${l.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (adv.fonte !== "all" && (l.fonte ?? "manual") !== adv.fonte) return false;
      if (adv.emailStatus === "valido" && l.email_status !== "valido") return false;
      if (adv.emailStatus === "sem_email" && l.email_status !== "sem_email") return false;
      if (adv.tagIds.length) {
        const ids = (tagsByLead[l.id] ?? []).map((t) => t.id);
        if (!adv.tagIds.every((tid) => ids.includes(tid))) return false;
      }
      if (l.score != null) {
        if (l.score < adv.scoreMin || l.score > adv.scoreMax) return false;
      } else if (adv.scoreMin > 0) {
        return false;
      }
      if (adv.cadastroDe && new Date(l.criado_em) < new Date(adv.cadastroDe)) return false;
      if (adv.cadastroAte && new Date(l.criado_em) > new Date(adv.cadastroAte + "T23:59:59")) return false;
      if (adv.atividadeDe) {
        if (!l.ultima_atividade || new Date(l.ultima_atividade) < new Date(adv.atividadeDe)) return false;
      }
      if (adv.atividadeAte) {
        if (!l.ultima_atividade || new Date(l.ultima_atividade) > new Date(adv.atividadeAte + "T23:59:59")) return false;
      }
      return true;
    });
  }, [leads, search, adv, tagsByLead]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseFilteredNoStatus.length };
    for (const c of STATUS_CHIPS) {
      if (c.value === "all") continue;
      counts[c.value] = baseFilteredNoStatus.filter((l) => l.status === c.value).length;
    }
    return counts;
  }, [baseFilteredNoStatus]);

  const filtered = useMemo(() => {
    const list = statusChip === "all"
      ? baseFilteredNoStatus
      : baseFilteredNoStatus.filter((l) => l.status === statusChip);
    const sorted = [...list].sort((a, b) => {
      let av: any; let bv: any;
      if (sortKey === "nome") { av = a.nome.toLowerCase(); bv = b.nome.toLowerCase(); }
      else if (sortKey === "score") { av = a.score ?? -1; bv = b.score ?? -1; }
      else if (sortKey === "ultima_atividade") {
        av = a.ultima_atividade ? new Date(a.ultima_atividade).getTime() : 0;
        bv = b.ultima_atividade ? new Date(b.ultima_atividade).getTime() : 0;
      } else {
        av = new Date(a.criado_em).getTime();
        bv = new Date(b.criado_em).getTime();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [baseFilteredNoStatus, statusChip, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "nome" ? "asc" : "desc"); }
  };
  const sortIcon = (k: SortKey) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-40" />
      : sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggleOne = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const exportCSV = (rows: Lead[]) => {
    const header = [
      "Nome", "Empresa", "Cargo", "Email", "Telefone", "LinkedIn",
      "Cidade", "Setor", "Senioridade", "Fonte", "Status", "Score",
      "Última atividade", "Cadastro",
    ];
    const data = rows.map((l) => [
      l.nome, l.empresa ?? "", l.cargo ?? "", l.email ?? "", l.telefone ?? "",
      l.linkedin_url ?? "", l.cidade ?? "", l.setor ?? "", l.senioridade ?? "",
      l.fonte ?? "manual", l.status, l.score ?? "",
      l.ultima_atividade ? new Date(l.ultima_atividade).toLocaleString("pt-BR") : "",
      new Date(l.criado_em).toLocaleDateString("pt-BR"),
    ]);
    const csv = [header, ...data]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qualifySelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const target = leads.filter((l) => ids.includes(l.id));
    setQualifying(true);
    setQualifyProgress({ done: 0, total: target.length });
    const toastId = toast.loading(`Qualificando 0/${target.length} leads...`);
    let ok = 0;
    for (let i = 0; i < target.length; i++) {
      const lead = target[i];
      try {
        const { data, error } = await supabase.functions.invoke("qualify-lead", {
          body: { nome: lead.nome, cargo: lead.cargo, empresa: lead.empresa, setor: lead.setor ?? "" },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const { score, abordagem_sugerida } = data as any;
        await supabase.from("leads").update({
          score,
          abordagem_sugerida,
          ultima_atividade: new Date().toISOString(),
        }).eq("id", lead.id);
        ok++;
      } catch (_) { /* continue */ }
      toast.loading(`Qualificando ${i + 1}/${target.length} leads...`, { id: toastId });
      setQualifyProgress({ done: i + 1, total: target.length });
    }
    toast.success(`${ok}/${target.length} leads qualificados`, { id: toastId });
    setQualifying(false);
    clearSelection();
    load();
  };

  const moveStatusBulk = async (newStatus: LeadStatus) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus, ultima_atividade: new Date().toISOString() })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} lead(s) movidos para ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}`);
    clearSelection();
    load();
  };

  const addTagBulk = async (tagId: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const rows = ids.map((lead_id) => ({ lead_id, tag_id: tagId }));
    const { error } = await supabase.from("lead_tags").upsert(rows, {
      onConflict: "lead_id,tag_id",
      ignoreDuplicates: true,
    } as any);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`Tag adicionada a ${ids.length} lead(s)`);
    clearSelection();
    load();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} lead(s)? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} lead(s) removidos`);
    clearSelection();
    load();
  };

  const moveOneStatus = async (id: string, newStatus: LeadStatus) => {
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus, ultima_atividade: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const deleteOne = async (id: string) => {
    if (!confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead removido");
    load();
  };

  const addTagToLead = async (leadId: string, tagId: string) => {
    const { error } = await supabase.from("lead_tags").insert({ lead_id: leadId, tag_id: tagId });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Tag adicionada");
    load();
  };

  const openDetail = (id: string) => { setDetailId(id); setDetailOpen(true); };

  const openAdv = () => { setAdvDraft(adv); setAdvOpen(true); };
  const applyAdv = () => { setAdv(advDraft); setAdvOpen(false); };
  const clearAdv = () => { setAdvDraft(defaultAdv); };

  const advCount =
    (adv.fonte !== "all" ? 1 : 0) +
    (adv.emailStatus !== "all" ? 1 : 0) +
    (adv.tagIds.length ? 1 : 0) +
    (adv.scoreMin > 0 || adv.scoreMax < 100 ? 1 : 0) +
    (adv.cadastroDe || adv.cadastroAte ? 1 : 0) +
    (adv.atividadeDe || adv.atividadeAte ? 1 : 0);

  // Empty database state
  if (!loading && leads.length === 0) {
    return (
      <Card className="p-10 md:p-16 text-center bg-card border-border">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Sua base de leads está vazia</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Importe leads do Apollo, suba uma planilha CSV ou cadastre manualmente.
        </p>
        <Button onClick={onGoImport} className="mt-5">Importar leads</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky filter area */}
      <div className="sticky top-0 z-30 -mx-4 md:mx-0 px-4 md:px-0 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou e-mail..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={openAdv} className="md:w-auto">
            <Filter className="h-4 w-4" />
            Filtros{advCount > 0 ? ` (${advCount})` : ""}
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_CHIPS.map((c) => {
            const active = statusChip === c.value;
            const count = statusCounts[c.value] ?? 0;
            return (
              <button
                key={c.value}
                onClick={() => setStatusChip(c.value)}
                className={
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted")
                }
              >
                {c.label}
                <span className={
                  "rounded-full px-1.5 text-[10px] " +
                  (active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")
                }>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("nome")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Nome {sortIcon("nome")}
                  </button>
                </TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("score")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Score {sortIcon("score")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("ultima_atividade")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Última atividade {sortIcon("ultima_atividade")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("criado_em")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Cadastro {sortIcon("criado_em")}
                  </button>
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
                    Nenhum lead encontrado com esses filtros
                  </TableCell>
                </TableRow>
              ) : filtered.map((l) => (
                <TableRow
                  key={l.id}
                  className={
                    "cursor-pointer " +
                    (highlightId === l.id ? "bg-primary/10 animate-pulse" : "")
                  }
                  onClick={() => openDetail(l.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} />
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="truncate">{l.nome}</div>
                    {l.empresa && (
                      <div className="text-[11px] text-muted-foreground truncate">{l.empresa}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-[140px] truncate">{l.cargo ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      {l.email ? (
                        <>
                          <MailCheck className="h-3.5 w-3.5 text-status-respondeu shrink-0" />
                          <span className="truncate">{l.email}</span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="sem e-mail">
                          <MailX className="h-3.5 w-3.5" /> sem e-mail
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{l.telefone ?? "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {l.linkedin_url ? (
                      <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary inline-flex">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{l.cidade ?? "—"}</TableCell>
                  <TableCell><SourceBadge source={l.fonte} /></TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell>
                    {l.score != null ? <ScoreBadge score={l.score} /> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {relativeTime(l.ultima_atividade)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(l.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      lead={l}
                      tags={allTags}
                      onEdit={() => openDetail(l.id)}
                      onMoveStatus={(s) => moveOneStatus(l.id, s)}
                      onAddTag={(tid) => addTagToLead(l.id, tid)}
                      onDelete={() => deleteOne(l.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground bg-card border-border">
            Nenhum lead encontrado
          </Card>
        ) : filtered.map((l) => (
          <Card
            key={l.id}
            className={
              "p-4 bg-card border-border space-y-2 " +
              (highlightId === l.id ? "ring-2 ring-primary/50" : "")
            }
          >
            <div className="flex items-start gap-2">
              <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} className="mt-1" />
              <button onClick={() => openDetail(l.id)} className="flex-1 text-left min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold truncate">{l.nome}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SourceBadge source={l.fonte} />
                    <StatusBadge status={l.status} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {l.empresa ?? "—"}{l.cargo ? ` • ${l.cargo}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Último contato: {relativeTime(l.ultima_atividade)}
                </p>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Bulk actions floating bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50">
          <Card className="p-3 bg-card border-primary/40 shadow-[var(--shadow-elegant)] flex items-center gap-2 flex-wrap md:flex-nowrap">
            <span className="text-sm font-semibold mr-1 whitespace-nowrap">{selected.size} selecionados</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">Mover para status...</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => moveStatusBulk(s.value)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={!allTags.length}>
                  <TagIcon className="h-4 w-4" /> Adicionar tag...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {allTags.length === 0 ? (
                  <DropdownMenuItem disabled>Nenhuma tag criada</DropdownMenuItem>
                ) : allTags.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => addTagBulk(t.id)}>
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: t.cor }} />
                    {t.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={qualifySelected} disabled={qualifying}>
              <Sparkles className="h-4 w-4" />
              {qualifying ? `${qualifyProgress.done}/${qualifyProgress.total}` : "Qualificar com IA"}
            </Button>

            <Button size="sm" variant="outline"
              onClick={() => exportCSV(leads.filter((l) => selected.has(l.id)))}>
              <Download className="h-4 w-4" /> Exportar
            </Button>

            <Button size="sm" variant="destructive" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>

            <Button size="icon" variant="ghost" onClick={clearSelection} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* Advanced filters drawer */}
      <Sheet open={advOpen} onOpenChange={setAdvOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Filtros avançados</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-5 py-4">
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={advDraft.fonte} onValueChange={(v: any) => setAdvDraft({ ...advDraft, fonte: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="apollo">Apollo</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status do e-mail</Label>
              <Select value={advDraft.emailStatus} onValueChange={(v: any) => setAdvDraft({ ...advDraft, emailStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="valido">Com e-mail válido</SelectItem>
                  <SelectItem value="sem_email">Sem e-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma tag criada</p>
                ) : allTags.map((t) => {
                  const on = advDraft.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdvDraft({
                        ...advDraft,
                        tagIds: on ? advDraft.tagIds.filter((x) => x !== t.id) : [...advDraft.tagIds, t.id],
                      })}
                      className={
                        "px-2 py-0.5 rounded-full text-[11px] border " +
                        (on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted")
                      }
                    >
                      {t.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Score</Label>
                <span className="text-xs text-muted-foreground">{advDraft.scoreMin} – {advDraft.scoreMax}</span>
              </div>
              <Slider
                min={0} max={100} step={1}
                value={[advDraft.scoreMin, advDraft.scoreMax]}
                onValueChange={([a, b]) => setAdvDraft({ ...advDraft, scoreMin: a, scoreMax: b })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de cadastro</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={advDraft.cadastroDe}
                  onChange={(e) => setAdvDraft({ ...advDraft, cadastroDe: e.target.value })} />
                <Input type="date" value={advDraft.cadastroAte}
                  onChange={(e) => setAdvDraft({ ...advDraft, cadastroAte: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Última atividade</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={advDraft.atividadeDe}
                  onChange={(e) => setAdvDraft({ ...advDraft, atividadeDe: e.target.value })} />
                <Input type="date" value={advDraft.atividadeAte}
                  onChange={(e) => setAdvDraft({ ...advDraft, atividadeAte: e.target.value })} />
              </div>
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="ghost" onClick={clearAdv}>Limpar filtros</Button>
            <Button onClick={applyAdv}>Aplicar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <LeadDetailSheet
        leadId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={load}
      />
    </div>
  );
}

function RowActions({
  lead, tags, onEdit, onMoveStatus, onAddTag, onDelete,
}: {
  lead: Lead;
  tags: Tag[];
  onEdit: () => void;
  onMoveStatus: (s: LeadStatus) => void;
  onAddTag: (tid: string) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Mover status</DropdownMenuLabel>
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem key={s.value} onClick={() => onMoveStatus(s.value)} disabled={lead.status === s.value}>
            {s.label}
          </DropdownMenuItem>
        ))}
        {tags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Adicionar tag</DropdownMenuLabel>
            {tags.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => onAddTag(t.id)}>
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: t.cor }} />
                {t.nome}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
