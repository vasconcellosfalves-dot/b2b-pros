import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Configuracoes() {
  const { user } = useAuth();
  const [config, setConfig] = useState({ sendgrid_key: "", remetente_nome: "", remetente_email: "", apollo_key: "" });
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("configuracoes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConfig({
          sendgrid_key: data.sendgrid_key ?? "",
          remetente_nome: data.remetente_nome ?? "",
          remetente_email: data.remetente_email ?? "",
          apollo_key: (data as any).apollo_key ?? "",
        });
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("configuracoes")
      .upsert({ user_id: user.id, ...config }, { onConflict: "user_id" });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  const handleSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada");
      setNovaSenha("");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
      </div>

      <Card className="p-5 bg-card border-border">
        <h2 className="font-semibold mb-4">Envio de e-mails</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Chave de API do SendGrid</Label>
            <Input
              type="password"
              value={config.sendgrid_key}
              onChange={(e) => setConfig({ ...config, sendgrid_key: e.target.value })}
              placeholder="SG...."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do remetente</Label>
            <Input
              value={config.remetente_nome}
              onChange={(e) => setConfig({ ...config, remetente_nome: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail do remetente</Label>
            <Input
              type="email"
              value={config.remetente_email}
              onChange={(e) => setConfig({ ...config, remetente_email: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar configurações"}</Button>
        </form>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h2 className="font-semibold mb-4">Trocar senha</h2>
        <form onSubmit={handleSenha} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={busy || !novaSenha}>Atualizar senha</Button>
        </form>
      </Card>
    </div>
  );
}
