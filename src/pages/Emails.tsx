import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_OPTIONS, LeadStatus } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Campanha {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  status: "rascunho" | "enviando" | "enviado";
  criado_em: string;
  lead_count?: number;
}

const VARIAVEIS = ["{{nome}}", "{{empresa}}", "{{cargo}}", "{{email}}"];

export default function Emails() {
  const { user } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    assunto: "",
    corpo: "",
    leadStatus: "novo" as LeadStatus,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("campanhas")
      .select("*, campanha_leads(count)")
      .order("criado_em", { ascending: false });
    if (error) return toast.error(error.message);
    setCampanhas(
      (data ?? []).map((c: any) => ({
        ...c,
        lead_count: c.campanha_leads?.[0]?.count ?? 0,
      })),
    );
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);

    const { data: campanha, error } = await supabase
      .from("campanhas")
      .insert({
        user_id: user.id,
        nome: form.nome,
        assunto: form.assunto,
        corpo: form.corpo,
        status: "rascunho",
      })
      .select()
      .single();

    if (error || !campanha) {
      setBusy(false);
      return toast.error(error?.message ?? "Erro ao criar campanha");
    }

    // Vincular leads do status escolhido
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("status", form.leadStatus);

    if (leads && leads.length > 0) {
      await supabase
        .from("campanha_leads")
        .insert(leads.map((l) => ({ campanha_id: campanha.id, lead_id: l.id })));
    }

    setBusy(false);
    toast.success(`Campanha criada (${leads?.length ?? 0} leads)`);
    setForm({ nome: "", assunto: "", corpo: "", leadStatus: "novo" });
    setOpen(false);
    load();
  };

  const insertVar = (v: string) => {
    setForm((f) => ({ ...f, corpo: f.corpo + " " + v }));
  };

  const statusColor = (s: string) =>
    s === "enviado" ? "bg-status-respondeu/15 text-status-respondeu border-status-respondeu/30"
    : s === "enviando" ? "bg-status-em-contato/15 text-status-em-contato border-status-em-contato/30"
    : "bg-status-descartado/15 text-status-descartado border-status-descartado/30";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">E-mails</h1>
          <p className="text-muted-foreground text-sm">{campanhas.length} campanha(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Nova campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome da campanha</Label>
                <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Selecionar leads por status</Label>
                <Select value={form.leadStatus} onValueChange={(v) => setForm({ ...form, leadStatus: v as LeadStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input required value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo do e-mail</Label>
                <Textarea
                  rows={8}
                  required
                  value={form.corpo}
                  onChange={(e) => setForm({ ...form, corpo: e.target.value })}
                  placeholder="Olá {{nome}}, vi que você trabalha na {{empresa}}..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Campos variáveis (clique para inserir)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVar(v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : "Salvar rascunho"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campanhas.length === 0 ? (
        <Card className="p-10 text-center bg-card border-border">
          <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {campanhas.map((c) => (
            <Card key={c.id} className="p-4 bg-card border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{c.nome}</h3>
                  <p className="text-sm text-muted-foreground truncate">{c.assunto}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.lead_count} lead(s) • {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant="outline" className={statusColor(c.status)}>
                  {c.status === "rascunho" ? "Rascunho" : c.status === "enviando" ? "Enviando" : "Enviado"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
