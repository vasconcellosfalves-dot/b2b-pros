import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileSpreadsheet, Search, User } from "lucide-react";
import { ApolloSearch } from "@/components/ApolloSearch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Mode = null | "apollo" | "csv" | "manual";

interface Props {
  onImported: () => void;
  onCreated?: (leadId: string) => void;
}

export function LeadsImportTab({ onImported, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <OptionCard
          icon={<Search className="h-6 w-6 text-primary" />}
          title="Apollo.io"
          description="Busque na base de 210M+ contatos B2B do Apollo"
          cta="Buscar no Apollo"
          onClick={() => setMode("apollo")}
        />
        <OptionCard
          icon={<FileSpreadsheet className="h-6 w-6 text-primary" />}
          title="Planilha CSV"
          description="Suba um arquivo .csv com sua lista de contatos"
          cta="Subir arquivo"
          onClick={() => setMode("csv")}
        />
        <OptionCard
          icon={<User className="h-6 w-6 text-primary" />}
          title="Cadastro manual"
          description="Adicione um lead por vez com dados completos"
          cta="Cadastrar"
          onClick={() => setMode("manual")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
        <ArrowLeft className="h-4 w-4" /> Voltar para opções
      </Button>

      {mode === "apollo" && <ApolloSearch onImported={onImported} />}
      {mode === "csv" && <CsvComingSoon />}
      {mode === "manual" && (
        <ManualForm
          onCancel={() => setMode(null)}
          onCreated={(id) => {
            onCreated?.(id);
            onImported();
          }}
        />
      )}
    </div>
  );
}

function OptionCard({
  icon, title, description, cta, onClick,
}: {
  icon: React.ReactNode; title: string; description: string; cta: string; onClick: () => void;
}) {
  return (
    <Card className="p-5 bg-card border-border hover:border-primary/40 transition-colors flex flex-col">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 flex-1">{description}</p>
      <Button onClick={onClick} className="mt-4 w-full">{cta}</Button>
    </Card>
  );
}

function CsvComingSoon() {
  return (
    <Card className="p-8 text-center bg-card border-border border-dashed">
      <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">Importação por CSV em breve</p>
      <p className="text-sm text-muted-foreground mt-1">
        Vamos liberar mapeamento de colunas e preview na próxima atualização.
      </p>
    </Card>
  );
}

function ManualForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", empresa: "", cargo: "",
    linkedin_url: "", cidade: "", setor: "", tagsRaw: "", notas: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    setBusy(true);
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          user_id: user.id,
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          empresa: form.empresa.trim() || null,
          cargo: form.cargo.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          cidade: form.cidade.trim() || null,
          setor: form.setor.trim() || null,
          fonte: "manual",
          status: "novo",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Tags
      const tagNames = form.tagsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (tagNames.length) {
        const { data: existing } = await supabase
          .from("tags")
          .select("id, nome")
          .eq("user_id", user.id);
        const existingMap = new Map((existing ?? []).map((t: any) => [t.nome.toLowerCase(), t.id]));
        for (const name of tagNames) {
          let tagId = existingMap.get(name.toLowerCase());
          if (!tagId) {
            const cor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;
            const { data: t } = await supabase
              .from("tags")
              .insert({ user_id: user.id, nome: name, cor })
              .select("id")
              .single();
            tagId = t?.id;
          }
          if (tagId) await supabase.from("lead_tags").insert({ lead_id: lead!.id, tag_id: tagId });
        }
      }

      // Initial note
      if (form.notas.trim()) {
        await supabase.from("notas").insert({
          lead_id: lead!.id, user_id: user.id, texto: form.notas.trim(),
        });
      }

      toast.success("Lead cadastrado");
      onCreated(lead!.id);
    } catch (err: any) {
      toast.error(err.message || "Falha ao cadastrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 bg-card border-border max-w-xl mx-auto">
      <h3 className="font-semibold text-lg mb-4">Cadastro manual de lead</h3>
      <form onSubmit={submit} className="space-y-3">
        {([
          ["nome", "Nome *", "text", true],
          ["email", "E-mail", "email", false],
          ["telefone", "Telefone", "text", false],
          ["empresa", "Empresa", "text", false],
          ["cargo", "Cargo", "text", false],
          ["linkedin_url", "LinkedIn URL", "url", false],
          ["cidade", "Cidade", "text", false],
          ["setor", "Setor", "text", false],
          ["tagsRaw", "Tags (separadas por vírgula)", "text", false],
        ] as const).map(([k, label, type, req]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={k}>{label}</Label>
            <Input
              id={k}
              type={type}
              required={req as boolean}
              value={(form as any)[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas iniciais</Label>
          <Textarea
            id="notas"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? "Cadastrando..." : "Cadastrar lead"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
