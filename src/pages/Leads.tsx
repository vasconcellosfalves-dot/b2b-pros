import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Plus, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LeadsBaseTab } from "@/components/leads/LeadsBaseTab";
import { LeadsImportTab } from "@/components/leads/LeadsImportTab";
import { toast } from "sonner";

type TabKey = "base" | "import";

export default function Leads() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("base");
  const [counts, setCounts] = useState({ visible: 0, total: 0 });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Total count for header
  const loadTotal = async () => {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true });
    setCounts((c) => ({ ...c, total: count ?? 0 }));
  };

  useEffect(() => { if (user) loadTotal(); }, [user, reloadKey]);

  const exportAllCSV = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) return toast.error(error.message);
    const rows = data ?? [];
    if (!rows.length) return toast.info("Nenhum lead para exportar");
    const header = [
      "Nome", "Empresa", "Cargo", "Email", "Telefone", "LinkedIn",
      "Cidade", "Setor", "Senioridade", "Fonte", "Status", "Score",
      "Última atividade", "Cadastro",
    ];
    const csv = [header, ...rows.map((l: any) => [
      l.nome, l.empresa ?? "", l.cargo ?? "", l.email ?? "", l.telefone ?? "",
      l.linkedin_url ?? "", l.cidade ?? "", l.setor ?? "", l.senioridade ?? "",
      l.fonte ?? "manual", l.status, l.score ?? "",
      l.ultima_atividade ? new Date(l.ultima_atividade).toLocaleString("pt-BR") : "",
      new Date(l.criado_em).toLocaleDateString("pt-BR"),
    ])].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatedManual = (id: string) => {
    setHighlightId(id);
    setTab("base");
    setReloadKey((k) => k + 1);
    setTimeout(() => setHighlightId(null), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-7xl mx-auto pb-32 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">
            {counts.total === 0 ? "Sua base está vazia" : `${counts.total} lead${counts.total === 1 ? "" : "s"} na base`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAllCSV} disabled={counts.total === 0}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setTab("import")}>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="base" className="gap-1.5">
            <Users className="h-4 w-4" /> Minha base de leads
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-4 w-4" /> Importar leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="mt-5">
          <LeadsBaseTab
            key={reloadKey}
            onGoImport={() => setTab("import")}
            highlightId={highlightId}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-5" forceMount hidden={tab !== "import"}>
          <LeadsImportTab
            key={`import-${tab === "import" ? reloadKey : "idle"}`}
            onImported={() => setReloadKey((k) => k + 1)}
            onCreated={handleCreatedManual}
            onGoBaseApollo={() => { setReloadKey((k) => k + 1); setTab("base"); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
