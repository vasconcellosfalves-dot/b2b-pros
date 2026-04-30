import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  onImpactarClick: () => void;
}

interface Item {
  key: string;
  label: string;
  done: boolean;
  onClick: () => void;
}

export function OnboardingChecklist({ onImpactarClick }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState({
    apolloOrLeads: false,
    template: false,
    sendgrid: false,
    campanha: false,
  });
  const dismissKey = user ? `onboarding_done_${user.id}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !dismissKey) return;
    if (localStorage.getItem(dismissKey) === "1") {
      setDismissed(true);
      return;
    }

    const load = async () => {
      const [{ data: cfg }, { count: leadsCount }, { count: tmplCount }, { count: sentCount }] = await Promise.all([
        supabase.from("configuracoes").select("apollo_key, sendgrid_key").eq("user_id", user.id).maybeSingle(),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("templates").select("*", { count: "exact", head: true }),
        supabase.from("campanhas").select("*", { count: "exact", head: true }).eq("status", "enviada" as any),
      ]);

      setState({
        apolloOrLeads: Boolean(cfg?.apollo_key) || (leadsCount ?? 0) > 0,
        template: (tmplCount ?? 0) > 0,
        sendgrid: Boolean(cfg?.sendgrid_key),
        campanha: (sentCount ?? 0) > 0,
      });
      setLoaded(true);
    };
    load();
  }, [user, dismissKey]);

  const items: Item[] = [
    { key: "1", label: "Conectar Apollo.io ou importar leads", done: state.apolloOrLeads, onClick: () => navigate("/leads") },
    { key: "2", label: "Criar primeiro template de e-mail", done: state.template, onClick: () => navigate("/templates") },
    { key: "3", label: "Configurar SendGrid para envio", done: state.sendgrid, onClick: () => navigate("/configuracoes") },
    { key: "4", label: "Disparar primeira campanha", done: state.campanha, onClick: onImpactarClick },
  ];

  const allDone = items.every((i) => i.done);

  useEffect(() => {
    if (loaded && allDone && dismissKey) {
      localStorage.setItem(dismissKey, "1");
    }
  }, [loaded, allDone, dismissKey]);

  if (!loaded || dismissed || allDone) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 md:py-2.5">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider md:whitespace-nowrap">
          Configure sua prospecção
        </p>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-1 md:flex-wrap md:justify-end md:flex-1">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.done}
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors text-left",
                item.done
                  ? "bg-status-convertido/15 text-status-convertido cursor-default"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                  item.done ? "border-status-convertido bg-status-convertido text-background" : "border-muted-foreground/40",
                )}
              >
                {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
