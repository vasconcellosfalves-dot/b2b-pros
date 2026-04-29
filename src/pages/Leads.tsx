import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Trash2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, STATUS_OPTIONS, LeadStatus } from "@/components/StatusBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ApolloSearch } from "@/components/ApolloSearch";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { toast } from "sonner";

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
  criado_em: string;
}

interface Tag { id: string; nome: string; cor: string; }
interface LeadTagRow { lead_id: string; tag_id: string; tags: Tag | null; }

const empty = { nome: "", empresa: "", cargo: "", email: "", telefone: "", status: "novo" as LeadStatus };

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tagsByLead, setTagsByLead] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qualifying, setQualifying] = useState(false);
  const [qualifyProgress, setQualifyProgress] = useState({ done: 0, total: 0 });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = async () => {
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
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("leads").insert({ ...form, user_id: user.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lead adicionado");
    setForm(empty);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead removido");
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    load();
  };

  const filtered = useMemo(() => leads.filter((l) => {
    const matchSearch =
      !search ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      (l.empresa ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.status === filter;
    const matchTag = tagFilter === "all" || (tagsByLead[l.id] ?? []).some((t) => t.id === tagFilter);
    return matchSearch && matchFilter && matchTag;
  }), [leads, search, filter, tagFilter, tagsByLead]);

  const toggleOne = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const exportCSV = (rows: Lead[]) => {
    const header = ["Nome", "Empresa", "Cargo", "Email", "Telefone", "Status", "Score", "Cadastro"];
    const data = rows.map((l) => [
      l.nome, l.empresa ?? "", l.cargo ?? "", l.email ?? "", l.telefone ?? "", l.status,
      l.score ?? "", new Date(l.criado_em).toLocaleDateString("pt-BR"),
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
          body: { nome: lead.nome, cargo: lead.cargo, empresa: lead.empresa, setor: "" },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const { score, abordagem_sugerida } = data as any;
        await supabase.from("leads").update({ score, abordagem_sugerida }).eq("id", lead.id);
        ok++;
      } catch (e) {
        // continue
      }
      toast.loading(`Qualificando ${i + 1}/${target.length} leads...`, { id: toastId });
      setQualifyProgress({ done: i + 1, total: target.length });
    }
    toast.success(`${ok}/${target.length} leads qualificados`, { id: toastId });
    setQualifying(false);
    clearSelection();
    load();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} lead(s)?`)) return;
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} lead(s) removido(s)`);
    clearSelection();
    load();
  };

  const openDetail = (id: string) => { setDetailId(id); setDetailOpen(true); };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-32 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} de {leads.length}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> Novo lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                {(["nome", "empresa", "cargo", "email", "telefone"] as const).map((f) => (
                  <div key={f} className="space-y-1.5">
                    <Label htmlFor={f} className="capitalize">{f === "email" ? "E-mail" : f}</Label>
                    <Input
                      id={f}
                      type={f === "email" ? "email" : "text"}
                      required={f === "nome"}
                      value={form[f]}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ApolloSearch onImported={load} />

      <Card className="p-3 md:p-4 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou empresa..." className="pl-9"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {allTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Desktop table */}
      <Card className="hidden md:block bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow>
            ) : filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => openDetail(l.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} />
                </TableCell>
                <TableCell className="font-medium">
                  {l.nome}
                  {(tagsByLead[l.id] ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(tagsByLead[l.id] ?? []).slice(0, 3).map((t) => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ color: t.cor, backgroundColor: `${t.cor}20` }}>
                          {t.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{l.empresa ?? "—"}</TableCell>
                <TableCell>{l.cargo ?? "—"}</TableCell>
                <TableCell>{l.email ?? "—"}</TableCell>
                <TableCell><ScoreBadge score={l.score} /></TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell>{new Date(l.criado_em).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground bg-card border-border">Nenhum lead encontrado</Card>
        ) : filtered.map((l) => (
          <Card key={l.id} className="p-4 bg-card border-border space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} className="mt-1" />
              <button onClick={() => openDetail(l.id)} className="flex-1 text-left min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold truncate">{l.nome}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ScoreBadge score={l.score} />
                    <StatusBadge status={l.status} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {l.empresa ?? "—"} {l.cargo ? `• ${l.cargo}` : ""}
                </p>
                {l.email && <p className="text-xs text-muted-foreground truncate">{l.email}</p>}
                {(tagsByLead[l.id] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(tagsByLead[l.id] ?? []).map((t) => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ color: t.cor, backgroundColor: `${t.cor}20` }}>
                        {t.nome}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50">
          <Card className="p-3 bg-card border-primary/40 shadow-[var(--shadow-elegant)] flex items-center gap-2 flex-wrap md:flex-nowrap">
            <span className="text-sm font-semibold mr-1">{selected.size} selecionado(s)</span>
            <Button size="sm" onClick={qualifySelected} disabled={qualifying}>
              <Sparkles className="h-4 w-4" />
              {qualifying ? `${qualifyProgress.done}/${qualifyProgress.total}` : "Qualificar com IA"}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => exportCSV(leads.filter((l) => selected.has(l.id)))}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button size="sm" variant="outline" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 text-destructive" /> Excluir
            </Button>
            <Button size="icon" variant="ghost" onClick={clearSelection} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      <LeadDetailSheet
        leadId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={load}
      />
    </div>
  );
}
