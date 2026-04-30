import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EnrichBody {
  apollo_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  organization_name?: string;
  domain?: string;
  email?: string;
  linkedin_url?: string;
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { data: cfg } = await supabase
      .from("configuracoes")
      .select("apollo_key")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const apolloKey = cfg?.apollo_key?.trim();
    if (!apolloKey) {
      return new Response(
        JSON.stringify({ error: "Chave Apollo.io não configurada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: EnrichBody = await req.json().catch(() => ({}));

    const payload: Record<string, unknown> = {
      reveal_personal_emails: !!body.reveal_personal_emails,
      reveal_phone_number: !!body.reveal_phone_number,
    };
    if (body.apollo_id) payload.id = body.apollo_id;
    if (body.first_name) payload.first_name = body.first_name;
    if (body.last_name) payload.last_name = body.last_name;
    if (body.name) payload.name = body.name;
    if (body.organization_name) payload.organization_name = body.organization_name;
    if (body.domain) payload.domain = body.domain;
    if (body.email) payload.email = body.email;
    if (body.linkedin_url) payload.linkedin_url = body.linkedin_url;

    const apolloRes = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        accept: "application/json",
        "x-api-key": apolloKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await apolloRes.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!apolloRes.ok) {
      return new Response(
        JSON.stringify({
          error: json?.error || json?.message || `Apollo retornou status ${apolloRes.status}`,
        }),
        { status: apolloRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const p = json.person ?? json.matches?.[0] ?? null;
    const person = p ? {
      id: p.id,
      nome: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || "",
      cargo: p.title ?? null,
      empresa: p.organization?.name ?? p.account?.name ?? null,
      setor: p.organization?.industry ?? null,
      cidade: [p.city, p.country].filter(Boolean).join(", ") || null,
      senioridade: p.seniority ?? null,
      email: p.email && p.email !== "email_not_unlocked@domain.com" ? p.email : null,
      telefone: p.phone_numbers?.[0]?.sanitized_number ?? null,
      linkedin_url: p.linkedin_url ?? null,
      photo_url: p.photo_url ?? null,
    } : null;

    return new Response(
      JSON.stringify({ person }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("apollo-enrich error", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
