import { AlertTriangle } from "lucide-react";

export function ApolloPaidWarning() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border-l-[3px] border-amber-400 bg-amber-400/10 p-3 text-sm text-amber-200"
      role="note"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
      <p className="leading-snug">
        Você precisa de uma conta paga no Apollo.io para conectar ao B2B PROS.
        O plano gratuito do Apollo não libera acesso à API.{" "}
        <a
          href="https://apollo.io/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-300 underline-offset-2 hover:underline"
        >
          Ver planos do Apollo →
        </a>
      </p>
    </div>
  );
}
