import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadInput {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
}

const renderTemplate = (tpl: string, lead: LeadInput) =>
  tpl
    .replaceAll("{{nome}}", lead.nome ?? "")
    .replaceAll("{{empresa}}", lead.empresa ?? "")
    .replaceAll("{{cargo}}", lead.cargo ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { campanha_id, leads, assunto, corpo } = (await req.json()) as {
      campanha_id: string;
      leads: LeadInput[];
      assunto: string;
      corpo: string;
    };

    if (!campanha_id || !Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await supabase
      .from("configuracoes")
      .select("sendgrid_key, remetente_nome, remetente_email")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cfg?.sendgrid_key || !cfg.remetente_email) {
      return new Response(
        JSON.stringify({ error: "Configure SendGrid e e-mail remetente em Configurações" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    let failed = 0;
    const recipients = leads.filter((l) => l.email);

    for (const lead of recipients) {
      const personalSubject = renderTemplate(assunto, lead);
      const personalBody = renderTemplate(corpo, lead);

      try {
        const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.sendgrid_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: lead.email, name: lead.nome }] }],
            from: { email: cfg.remetente_email, name: cfg.remetente_nome ?? cfg.remetente_email },
            subject: personalSubject,
            content: [{ type: "text/plain", value: personalBody }],
          }),
        });

        if (sgRes.ok || sgRes.status === 202) {
          sent++;
        } else {
          failed++;
          const errText = await sgRes.text();
          console.error(`SendGrid ${sgRes.status} for ${lead.email}:`, errText);
        }
      } catch (e) {
        failed++;
        console.error("Send error", lead.email, e);
      }
    }

    // Registrar campanha_leads
    const linkRows = recipients.map((l) => ({
      campanha_id,
      lead_id: l.id,
      enviado_em: new Date().toISOString(),
    }));
    if (linkRows.length) {
      await supabase.from("campanha_leads").insert(linkRows);
    }

    // Atualizar status da campanha
    await supabase.from("campanhas").update({ status: "enviado" }).eq("id", campanha_id);

    // Atualizar status dos leads "novo" -> "em_contato"
    const leadIds = recipients.map((l) => l.id);
    if (leadIds.length) {
      await supabase
        .from("leads")
        .update({ status: "em_contato" })
        .in("id", leadIds)
        .eq("status", "novo");
    }

    return new Response(
      JSON.stringify({ sent, failed, total: recipients.length, skipped: leads.length - recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-campaign error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
