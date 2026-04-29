import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Template {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  criado_em: string;
}

export default function Templates() {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", assunto: "", corpo: "" });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("templates")
      .select("*")
      .order("criado_em", { ascending: false });
    setItems((data ?? []) as Template[]);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("templates").insert({ ...form, user_id: user.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Template salvo");
    setForm({ nome: "", assunto: "", corpo: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const generateAi = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: { cargo: "", setor: form.nome },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForm((f) => ({ ...f, corpo: (data as any).content ?? "" }));
      toast.success("Sugestão gerada");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">{items.length} salvos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input required value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Corpo</Label>
                  <Button type="button" size="sm" variant="outline" onClick={generateAi} disabled={aiBusy}>
                    <Sparkles className="h-3.5 w-3.5" />{aiBusy ? "Gerando..." : "Gerar com IA"}
                  </Button>
                </div>
                <Textarea required rows={8} value={form.corpo} onChange={(e) => setForm({ ...form, corpo: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground bg-card border-border">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum template salvo ainda. Crie seu primeiro!
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4 bg-card border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.assunto}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.corpo}</p>
              <p className="text-[10px] text-muted-foreground pt-1">
                {new Date(t.criado_em).toLocaleDateString("pt-BR")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
