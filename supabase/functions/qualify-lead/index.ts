const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nome, cargo, empresa, setor } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Analise este perfil de lead B2B e retorne APENAS JSON válido (sem markdown, sem comentários):
{"score": 0-100, "justificativa": "máximo 2 linhas", "abordagem_sugerida": "1 frase de abordagem"}

Lead: Nome: ${nome ?? "—"}, Cargo: ${cargo ?? "—"}, Empresa: ${empresa ?? "—"}, Setor: ${setor ?? "—"}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em qualificação de leads B2B. Responda apenas com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (resp.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (resp.status === 402)
      return new Response(JSON.stringify({ error: "Créditos da Lovable AI esgotados." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Gateway ${resp.status}: ${t}`);
    }

    const data = await resp.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "{}";
    // Strip markdown fences if any
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = {}; }

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const abordagem_sugerida = String(parsed.abordagem_sugerida ?? "").slice(0, 500);
    const justificativa = String(parsed.justificativa ?? "").slice(0, 500);

    return new Response(JSON.stringify({ score, abordagem_sugerida, justificativa }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
