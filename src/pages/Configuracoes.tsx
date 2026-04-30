import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ApolloPaidWarning } from "@/components/ApolloPaidWarning";

const TOM_OPCOES = [
  { value: "profissional_direto", label: "Profissional e direto" },
  { value: "consultivo_educativo", label: "Consultivo e educativo" },
  { value: "provocativo_desafiador", label: "Provocativo e desafiador" },
  { value: "proximo_descontraido", label: "Próximo e descontraído" },
];

const IDIOMA_OPCOES = [
  { value: "pt-BR", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
];

export default function Configuracoes() {
  const { user } = useAuth();
  const [config, setConfig] = useState({
    sendgrid_key: "",
    remetente_nome: "",
    remetente_email: "",
    apollo_key: "",
    empresa_descricao: "",
    cliente_ideal_padrao: "",
    dores_resolvidas: "",
    tom_voz_padrao: "profissional_direto",
    idioma_padrao: "pt-BR",
  });
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyNegocio, setBusyNegocio] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("configuracoes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setConfig({
            sendgrid_key: d.sendgrid_key ?? "",
            remetente_nome: d.remetente_nome ?? "",
            remetente_email: d.remetente_email ?? "",
            apollo_key: d.apollo_key ?? "",
            empresa_descricao: d.empresa_descricao ?? "",
            cliente_ideal_padrao: d.cliente_ideal_padrao ?? "",
            dores_resolvidas: d.dores_resolvidas ?? "",
            tom_voz_padrao: d.tom_voz_padrao ?? "profissional_direto",
            idioma_padrao: d.idioma_padrao ?? "pt-BR",
          });
        }
      });
  }, [user]);

  const upsertConfig = async (patch: Partial<typeof config>) => {
    if (!user) return { error: new Error("Sem usuário") as any };
    return supabase
      .from("configuracoes")
      .upsert({ user_id: user.id, ...config, ...patch }, { onConflict: "user_id" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await upsertConfig({});
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  const handleSaveNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyNegocio(true);
    const { error } = await upsertConfig({});
    setBusyNegocio(false);
    if (error) toast.error(error.message);
    else toast.success("Informações do negócio salvas");
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

      {/* SOBRE SEU NEGÓCIO */}
      <Card className="p-5 bg-card border-border">
        <h2 className="font-semibold mb-1">Sobre seu negócio</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Esses dados são usados pela IA em todas as gerações de e-mail das campanhas, garantindo consistência.
        </p>
        <form onSubmit={handleSaveNegocio} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Empresa/Produto que você oferece</Label>
            <Textarea
              maxLength={200}
              rows={2}
              value={config.empresa_descricao}
              onChange={(e) => setConfig({ ...config, empresa_descricao: e.target.value })}
              placeholder="Ex: Linea Consulting — consultoria em performance comercial para empresas SaaS B2B no Brasil"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {config.empresa_descricao.length}/200
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Para quem você vende (cliente ideal padrão)</Label>
            <Textarea
              maxLength={200}
              rows={2}
              value={config.cliente_ideal_padrao}
              onChange={(e) => setConfig({ ...config, cliente_ideal_padrao: e.target.value })}
              placeholder="Ex: Diretores comerciais e CEOs de empresas SaaS com 50-500 funcionários, faturamento entre R$5M e R$50M"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {config.cliente_ideal_padrao.length}/200
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Principais dores que você resolve</Label>
            <Textarea
              maxLength={300}
              rows={3}
              value={config.dores_resolvidas}
              onChange={(e) => setConfig({ ...config, dores_resolvidas: e.target.value })}
              placeholder="Ex: Time comercial sem previsibilidade, baixa conversão de leads, falta de processo estruturado de outbound"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {config.dores_resolvidas.length}/300
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tom de voz padrão</Label>
              <Select
                value={config.tom_voz_padrao}
                onValueChange={(v) => setConfig({ ...config, tom_voz_padrao: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOM_OPCOES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Idioma das campanhas</Label>
              <Select
                value={config.idioma_padrao}
                onValueChange={(v) => setConfig({ ...config, idioma_padrao: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDIOMA_OPCOES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={busyNegocio}>
            {busyNegocio ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      </Card>

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
        <h2 className="font-semibold mb-1">Integração Apollo.io</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use a API do Apollo para buscar e importar leads.
        </p>
        <div className="mb-4">
          <ApolloPaidWarning />
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Chave de API Apollo.io</Label>
            <Input
              type="password"
              value={config.apollo_key}
              onChange={(e) => setConfig({ ...config, apollo_key: e.target.value })}
              placeholder="cole sua API key aqui"
            />
            <a
              href="https://apollo.io/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-block"
            >
              Como obter minha chave do Apollo? →
            </a>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
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
