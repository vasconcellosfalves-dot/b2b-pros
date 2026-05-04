const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const tomMap: Record<string, string> = {
  profissional_direto: "profissional, direto e objetivo",
  consultivo_educativo: "consultivo e educativo, trazendo um insight ou dado relevante",
  provocativo_desafiador: "provocativo, desafiando uma crença comum do prospect",
  proximo_descontraido: "próximo, humano e descontraído (sem ser informal demais)",
};

function stepGuidance(step: number) {
  if (step === 1)
    return "Primeiro contato. Apresente o motivo do e-mail em 1 frase, mostre que entende o contexto da pessoa, traga 1 insight curto e termine com um CTA leve (ex.: pergunta aberta ou pedido de 15 min).";
  if (step === 2)
    return "Follow-up 1. NÃO repetir o e-mail anterior. Trazer um ângulo novo: case curto, número, ou pergunta provocativa. CTA mais direto.";
  return "Follow-up 2 (break-up). Tom curto, gentil, dar a opção de encerrar a conversa. 3-4 linhas no máximo.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Modo legado (retrocompatibilidade): { cargo, setor } -> { content }
    if (body?.cargo !== undefined || body?.setor !== undefined) {
      const cargoText = body.cargo?.trim() || "tomadores de decisão";
      const setorText = body.setor?.trim() || "diversos";
      const prompt = `Você é um especialista em prospecção B2B. Escreva um e-mail frio curto e direto para ${cargoText} de empresas do setor ${setorText}. Máximo 5 linhas, tom profissional mas humano, CTA pedindo 15 min. Use {{nome}}, {{empresa}}, {{cargo}}. Retorne apenas o corpo.`;
      const r = await callAI(LOVABLE_API_KEY, prompt);
      const content = r.choices?.[0]?.message?.content?.trim() ?? "";
      return json({ content });
    }

    // Modo novo: briefing rico
    const {
      empresa_descricao = "",
      cliente_ideal = "",
      dores = "",
      persona = "",
      dor = "",
      cta = "",
      tom = "profissional_direto",
      idioma = "pt-BR",
      step = 1,            // 1, 2 ou 3
      assunto_atual = "",
    } = body ?? {};

    const tomText = tomMap[tom] ?? tomMap.profissional_direto;
    const langText = idioma === "en" ? "inglês" : idioma === "es" ? "espanhol" : "português do Brasil";

    const sys = `Você é um especialista em cold e-mail B2B (estilo Outreach/Lemlist). Escreve no idioma: ${langText}. Tom: ${tomText}. Princípios: assunto curto (3-6 palavras, parecer conversa entre humanos, sem clickbait), corpo entre 60-110 palavras, sem jargão de marketing, sem "espero que esteja bem", uma única ideia por e-mail, CTA único e claro. Use as variáveis {{nome}}, {{empresa}}, {{cargo}} naturalmente — não force.`;

    const user = `Contexto da minha empresa: ${empresa_descricao || "(não informado)"}
Cliente ideal: ${cliente_ideal || "(não informado)"}
Dores que resolvemos: ${dores || "(não informado)"}

Para esta campanha:
- Persona alvo: ${persona || "(não informada)"}
- Dor específica: ${dor || "(não informada)"}
- CTA desejado: ${cta || "Agendar 15 min de conversa"}

Tarefa: ${stepGuidance(step)}
${assunto_atual ? `Assunto sugerido pelo usuário: "${assunto_atual}" — pode adaptar.` : ""}

Responda EXCLUSIVAMENTE em JSON válido com este formato:
{"assunto":"...", "corpo":"..."}
Nada antes nem depois do JSON.`;

    const res = await callAI(LOVABLE_API_KEY, user, sys);
    if (res.status === 429)
      return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
    if (res.status === 402)
      return json({ error: "Créditos de IA esgotados. Adicione créditos em Workspace > Usage." }, 402);

    const raw = res.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();
    let parsed: { assunto?: string; corpo?: string } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // fallback: tentar extrair primeiro objeto JSON
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* noop */ }
      }
    }
    return json({
      assunto: (parsed.assunto ?? "").trim(),
      corpo: (parsed.corpo ?? cleaned).trim(),
    });
  } catch (err) {
    console.error("generate-email error", err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});

async function callAI(key: string, userMsg: string, sysMsg?: string): Promise<any> {
  const messages: any[] = [];
  if (sysMsg) messages.push({ role: "system", content: sysMsg });
  messages.push({ role: "user", content: userMsg });
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
  });
  if (r.status === 429 || r.status === 402) return { status: r.status };
  if (!r.ok) {
    const t = await r.text();
    console.error("AI gateway error:", r.status, t);
    throw new Error("Erro ao chamar IA");
  }
  return await r.json();
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
