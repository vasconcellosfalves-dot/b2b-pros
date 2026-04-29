import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function Respostas() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Respostas</h1>
        <p className="text-sm text-muted-foreground">Inbox das respostas dos seus leads</p>
      </div>
      <Card className="p-10 text-center bg-card border-border space-y-3">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground opacity-60" />
        <p className="font-semibold">Inbox em construção</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O recebimento automático de respostas será ativado quando o webhook do
          provedor de e-mail estiver configurado. As respostas dos leads aparecerão aqui,
          já classificadas pela IA.
        </p>
      </Card>
    </div>
  );
}
