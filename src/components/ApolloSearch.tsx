import { useMemo, useState, KeyboardEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search, Linkedin, User, X, ChevronDown, Info, ChevronLeft, ChevronRight, MailCheck, MailQuestion, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ApolloPaidWarning } from "./ApolloPaidWarning";
import { cn } from "@/lib/utils";

interface ApolloPerson {
  id: string;
  nome: string;
  cargo: string | null;
  empresa: string | null;
  setor: string | null;
  cidade: string | null;
  senioridade: string | null;
  email: string | null;
  telefone: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
}

const SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
];

const SIZE_OPTIONS = [
  { value: "1,10", label: "1-10" },
  { value: "11,20", label: "11-20" },
  { value: "21,50", label: "21-50" },
  { value: "51,100", label: "51-100" },
  { value: "101,200", label: "101-200" },
  { value: "201,500", label: "201-500" },
  { value: "501,1000", label: "501-1000" },
  { value: "1001,5000", label: "1001-5000" },
  { value: "5001,1000000", label: "5001+" },
];

function ChipsInput({
  values, onChange, placeholder,
}: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-10 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}
            className="hover:bg-muted-foreground/20 rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={values.length ? "" : placeholder}
      />
    </div>
  );
}

function MultiSelect({
  options, values, onChange, placeholder,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full min-h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left"
        >
          <span className={cn("truncate", !labels.length && "text-muted-foreground")}>
            {labels.length ? labels.join(", ") : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-[var(--radix-popover-trigger-width)]" align="start">
        <div className="max-h-64 overflow-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
            >
              <Checkbox checked={values.includes(o.value)} className="pointer-events-none" />
              {o.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  onImported: () => void;
  onGoBaseFiltered?: () => void;
}

export function ApolloSearch({ onImported, onGoBaseFiltered }: Props) {
  const { user } = useAuth();

  // Form state
  const [titles, setTitles] = useState<string[]>([]);
  const [seniorities, setSeniorities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [perPage, setPerPage] = useState<string>("25");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApolloPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Enrichment toggles
  const [enrichEmail, setEnrichEmail] = useState(true);
  const [enrichPhone, setEnrichPhone] = useState(false);

  // Import progress
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<null | {
    imported: number; skipped: number; noEmail: number;
  }>(null);

  const totalPages = Math.max(1, Math.ceil(total / Number(perPage)));

  const runSearch = async (targetPage = 1) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const body = {
        person_titles: titles,
        person_seniorities: seniorities,
        organization_industries: industries,
        organization_num_employees_ranges: sizes,
        person_locations: locations,
        q_organization_keyword_tags: keywords,
        page: targetPage,
        per_page: Number(perPage),
      };
      const { data, error } = await supabase.functions.invoke("apollo-search", { body });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const people: ApolloPerson[] = (data as any)?.people ?? [];
      setResults(people);
      setTotal((data as any)?.total ?? people.length);
      setPage(targetPage);
      if (people.length === 0) toast.info("Nenhum resultado encontrado");
      else toast.success(`${(data as any)?.total ?? people.length} resultados`);
    } catch (err: any) {
      toast.error(err.message || "Falha na busca");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(1);
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.id)));
  };

  const estimatedCredits = useMemo(() => {
    const perLead = (enrichEmail ? 1 : 0) + (enrichPhone ? 1 : 0);
    return perLead * selected.size;
  }, [enrichEmail, enrichPhone, selected.size]);

  const handleImport = async () => {
    if (!user || selected.size === 0) return;
    const chosen = results.filter((r) => selected.has(r.id));
    setImporting(true);
    setSummary(null);
    setProgress({ done: 0, total: chosen.length });

    let imported = 0, skipped = 0, noEmail = 0;

    // Pre-fetch existing apollo_ids and emails
    const apolloIds = chosen.map((c) => c.id);
    const emails = chosen.map((c) => c.email).filter(Boolean) as string[];

    const [{ data: existA }, { data: existE }] = await Promise.all([
      supabase.from("leads").select("apollo_id").in("apollo_id", apolloIds),
      emails.length
        ? supabase.from("leads").select("email").in("email", emails)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const existingApollo = new Set((existA ?? []).map((r: any) => r.apollo_id).filter(Boolean));
    const existingEmail = new Set((existE ?? []).map((r: any) => r.email).filter(Boolean));

    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      try {
        if (existingApollo.has(c.id) || (c.email && existingEmail.has(c.email))) {
          skipped++;
          setProgress({ done: i + 1, total: chosen.length });
          continue;
        }

        let person = c;
        const needEnrich = (enrichEmail && !c.email) || enrichPhone;
        if (needEnrich) {
          try {
            const { data: enr, error: enrErr } = await supabase.functions.invoke("apollo-enrich", {
              body: {
                apollo_id: c.id,
                first_name: c.nome.split(" ")[0],
                last_name: c.nome.split(" ").slice(1).join(" "),
                organization_name: c.empresa ?? undefined,
                linkedin_url: c.linkedin_url ?? undefined,
                reveal_personal_emails: enrichEmail,
                reveal_phone_number: enrichPhone,
              },
            });
            if (!enrErr && (enr as any)?.person) {
              const p = (enr as any).person as ApolloPerson;
              person = { ...c, email: p.email ?? c.email, telefone: p.telefone ?? c.telefone };
            }
          } catch (e) {
            console.warn("enrich failed", e);
          }
        }

        if (person.email && existingEmail.has(person.email)) {
          skipped++;
        } else {
          const { error } = await supabase.from("leads").insert({
            user_id: user.id,
            nome: person.nome || "Sem nome",
            empresa: person.empresa,
            cargo: person.cargo,
            email: person.email,
            telefone: person.telefone,
            linkedin_url: person.linkedin_url,
            cidade: person.cidade,
            setor: person.setor,
            senioridade: person.senioridade,
            apollo_id: person.id,
            fonte: "apollo",
            status: "novo" as const,
          });
          if (error) {
            // If duplicate from index race
            if ((error as any).code === "23505") skipped++;
            else throw error;
          } else {
            imported++;
            if (!person.email) noEmail++;
            if (person.email) existingEmail.add(person.email);
            existingApollo.add(person.id);
          }
        }
      } catch (e: any) {
        console.error("import error", e);
      } finally {
        setProgress({ done: i + 1, total: chosen.length });
      }
    }

    setImporting(false);
    setSummary({ imported, skipped, noEmail });
    if (imported > 0) {
      onImported();
      setSelected(new Set());
    }
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-border space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Buscar leads no Apollo.io</h2>
        <p className="text-xs text-muted-foreground">
          Configure sua chave em Configurações antes de buscar.
        </p>
      </div>

      <ApolloPaidWarning />

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cargo alvo</Label>
            <ChipsInput values={titles} onChange={setTitles}
              placeholder="Ex: CEO, CMO, Diretor Comercial (Enter para adicionar)" />
          </div>
          <div className="space-y-1.5">
            <Label>Senioridade</Label>
            <MultiSelect options={SENIORITY_OPTIONS} values={seniorities}
              onChange={setSeniorities} placeholder="Selecione níveis" />
          </div>

          <div className="space-y-1.5">
            <Label>Setor da empresa</Label>
            <ChipsInput values={industries} onChange={setIndustries}
              placeholder="Ex: SaaS, E-commerce, Indústria (Enter para adicionar)" />
          </div>
          <div className="space-y-1.5">
            <Label>Tamanho da empresa</Label>
            <MultiSelect options={SIZE_OPTIONS} values={sizes}
              onChange={setSizes} placeholder="Selecione faixas" />
          </div>

          <div className="space-y-1.5">
            <Label>Localização</Label>
            <ChipsInput values={locations} onChange={setLocations}
              placeholder="Ex: São Paulo Brasil, Rio de Janeiro Brasil (Enter para adicionar)" />
          </div>
          <div className="space-y-1.5">
            <Label>Palavras-chave da empresa</Label>
            <ChipsInput values={keywords} onChange={setKeywords}
              placeholder="Ex: marketing digital, automação (Enter para adicionar)" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Resultados por busca</Label>
            <Select value={perPage} onValueChange={setPerPage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          <Search className="h-4 w-4" />
          {loading ? "Buscando..." : "Buscar no Apollo"}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-start gap-3 rounded-lg border-l-[3px] border-blue-400 bg-blue-400/10 p-3 text-sm text-blue-200">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
            <p className="leading-snug">
              A busca do Apollo não retorna e-mails ou telefones automaticamente.
              Você precisa selecionar quais leads quer enriquecer — cada enriquecimento
              consome 1 crédito do seu plano Apollo.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected.size === results.length && results.length > 0}
                onCheckedChange={toggleAll}
                id="apollo-all"
              />
              <Label htmlFor="apollo-all" className="cursor-pointer text-sm">
                Selecionar todos visíveis
              </Label>
              <span className="text-xs text-muted-foreground ml-2">
                {total} resultado{total === 1 ? "" : "s"} • {selected.size} selecionado{selected.size === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm"
                disabled={page <= 1 || loading}
                onClick={() => runSearch(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => runSearch(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 pb-24">
            {results.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <div key={p.id}
                  className={cn(
                    "relative flex items-start gap-3 p-3 rounded-lg border bg-background/40 hover:bg-background/70 transition-colors",
                    isSel ? "border-primary" : "border-border"
                  )}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.nome}
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium">
                      {p.nome?.[0]?.toUpperCase() ?? <User className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.nome}</p>
                      {p.senioridade && (
                        <Badge variant="outline" className="text-[10px] py-0 capitalize">
                          {p.senioridade.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.cargo ?? "—"}{p.empresa ? ` • ${p.empresa}` : ""}
                      {p.setor ? ` • ${p.setor}` : ""}
                    </p>
                    {p.cidade && (
                      <p className="text-xs text-muted-foreground truncate">{p.cidade}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {p.email ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <MailCheck className="h-3 w-3" /> E-mail disponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MailQuestion className="h-3 w-3" /> Requer enriquecimento
                        </span>
                      )}
                      {p.linkedin_url && (
                        <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          aria-label="LinkedIn">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => toggle(p.id)}
                    className="absolute top-3 right-3"
                  />
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl">
              <div className="rounded-xl border border-border bg-card shadow-lg p-3 md:p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-medium text-sm">
                    {selected.size} lead{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custo estimado: <span className="font-medium text-foreground">{estimatedCredits}</span> crédito{estimatedCredits === 1 ? "" : "s"} do Apollo
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <Switch checked={enrichEmail} onCheckedChange={setEnrichEmail} />
                    <span>Enriquecer e-mails (1 crédito/lead)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <Switch checked={enrichPhone} onCheckedChange={setEnrichPhone} />
                    <span>Enriquecer telefones (créditos extras)</span>
                  </label>
                </div>
                <Button onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Importar {selected.size} lead{selected.size === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={importing || !!summary} onOpenChange={(o) => { if (!o) setSummary(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importing ? "Importando leads…" : "Importação concluída"}</DialogTitle>
            <DialogDescription>
              {importing
                ? `Processando ${progress.done}/${progress.total}…`
                : "Resumo da importação:"}
            </DialogDescription>
          </DialogHeader>
          {importing ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="space-y-2 text-sm">
              <p>✓ <strong>{summary.imported}</strong> lead{summary.imported === 1 ? "" : "s"} importado{summary.imported === 1 ? "" : "s"} com sucesso</p>
              <p>⊘ <strong>{summary.skipped}</strong> lead{summary.skipped === 1 ? "" : "s"} pulado{summary.skipped === 1 ? "" : "s"} (já existia{summary.skipped === 1 ? "" : "m"})</p>
              <p>⚠ <strong>{summary.noEmail}</strong> lead{summary.noEmail === 1 ? "" : "s"} importado{summary.noEmail === 1 ? "" : "s"} sem e-mail</p>
            </div>
          ) : null}
          {!importing && summary && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSummary(null)}>Fechar</Button>
              {onGoBaseFiltered && (
                <Button onClick={() => { setSummary(null); onGoBaseFiltered(); }}>
                  Ver leads importados
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
