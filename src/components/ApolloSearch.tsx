import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Linkedin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ApolloPerson {
  id: string;
  nome: string;
  cargo: string | null;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
}

const SIZE_OPTIONS = [
  { value: "1,10", label: "1-10" },
  { value: "11,50", label: "11-50" },
  { value: "51,200", label: "51-200" },
  { value: "201,1000", label: "201-1000" },
  { value: "1001,1000000", label: "1000+" },
];

export function ApolloSearch({ onImported }: { onImported: () => void }) {
  const { user } = useAuth();
  const [titles, setTitles] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("Brazil");
  const [size, setSize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ApolloPerson[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      const body = {
        person_titles: titles ? titles.split(",").map((s) => s.trim()).filter(Boolean) : [],
        organization_industry_tag_ids: industry
          ? industry.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        person_locations: country ? [country] : [],
        organization_num_employees_ranges: size ? [size] : [],
      };
      const { data, error } = await supabase.functions.invoke("apollo-search", { body });
      // Em erros HTTP (4xx/5xx), supabase-js coloca o body em error.context — extrair
      if (error) {
        let msg = error.message;
        try {
          const ctxBody = await (error as any).context?.json?.();
          if (ctxBody?.error) msg = ctxBody.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const people: ApolloPerson[] = (data as any)?.people ?? [];
      setResults(people);
      if (people.length === 0) toast.info("Nenhum resultado encontrado");
      else toast.success(`${people.length} resultados`);
    } catch (err: any) {
      toast.error(err.message || "Falha na busca");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user || selected.size === 0) return;
    setImporting(true);
    try {
      const chosen = results.filter((r) => selected.has(r.id));
      const emails = chosen.map((c) => c.email).filter(Boolean) as string[];

      let existing = new Set<string>();
      if (emails.length) {
        const { data: existingRows } = await supabase
          .from("leads")
          .select("email")
          .in("email", emails);
        existing = new Set((existingRows ?? []).map((r) => r.email).filter(Boolean) as string[]);
      }

      const toInsert = chosen
        .filter((c) => !c.email || !existing.has(c.email))
        .map((c) => ({
          user_id: user.id,
          nome: c.nome || "Sem nome",
          empresa: c.empresa,
          cargo: c.cargo,
          email: c.email,
          telefone: c.telefone,
          status: "novo" as const,
        }));

      const skipped = chosen.length - toInsert.length;

      if (toInsert.length === 0) {
        toast.info(`Nada a importar — ${skipped} duplicado(s) ignorado(s)`);
      } else {
        const { error } = await supabase.from("leads").insert(toInsert);
        if (error) throw error;
        toast.success(
          `${toInsert.length} lead(s) importado(s)${skipped ? ` • ${skipped} duplicado(s) ignorado(s)` : ""}`,
        );
        setSelected(new Set());
        onImported();
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao importar");
    } finally {
      setImporting(false);
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

      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Cargo alvo</Label>
          <Input
            placeholder="CEO, Diretor Comercial"
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Setor da empresa</Label>
          <Input
            placeholder="SaaS, Indústria, Varejo"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>País</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tamanho da empresa</Label>
          <Select value={size} onValueChange={setSize}>
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

        <div className="md:col-span-2">
          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            <Search className="h-4 w-4" />
            {loading ? "Buscando..." : "Buscar no Apollo"}
          </Button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected.size === results.length}
                onCheckedChange={toggleAll}
                id="apollo-all"
              />
              <Label htmlFor="apollo-all" className="cursor-pointer text-sm">
                {selected.size}/{results.length} selecionados
              </Label>
            </div>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing || selected.size === 0}
            >
              <Download className="h-4 w-4" />
              {importing ? "Importando..." : "Importar selecionados"}
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {results.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/40 hover:bg-background/70 transition-colors"
              >
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                  className="mt-1"
                />
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.nome}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.cargo ?? "—"}
                    {p.empresa ? ` • ${p.empresa}` : ""}
                  </p>
                  {p.email && (
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  )}
                </div>
                {p.linkedin_url && (
                  <a
                    href={p.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary mt-1"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
