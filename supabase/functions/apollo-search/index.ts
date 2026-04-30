import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchBody {
  person_titles?: string[];
  person_seniorities?: string[];
  q_organization_keyword_tags?: string[];
  organization_industries?: string[];
  person_locations?: string[];
  organization_num_employees_ranges?: string[];
  page?: number;
  per_page?: number;
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
        JSON.stringify({ error: "Chave Apollo.io não configurada. Adicione em Configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: SearchBody = await req.json().catch(() => ({}));

    const payload: Record<string, unknown> = {
      page: body.page ?? 1,
      per_page: Math.min(body.per_page ?? 25, 100),
    };
    if (body.person_titles?.length) payload.person_titles = body.person_titles;
    if (body.person_seniorities?.length) payload.person_seniorities = body.person_seniorities;
    if (body.q_organization_keyword_tags?.length)
      payload.q_organization_keyword_tags = body.q_organization_keyword_tags;
    if (body.organization_industries?.length)
      payload.organization_industries = body.organization_industries;
    if (body.person_locations?.length) payload.person_locations = body.person_locations;
    if (body.organization_num_employees_ranges?.length)
      payload.organization_num_employees_ranges = body.organization_num_employees_ranges;

    const apolloRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
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
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!apolloRes.ok) {
      return new Response(
        JSON.stringify({
          error: json?.error || json?.message || `Apollo retornou status ${apolloRes.status}`,
        }),
        { status: apolloRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const people = (json.people ?? json.contacts ?? []).map((p: any) => ({
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
    }));

    return new Response(
      JSON.stringify({
        people,
        total: json.pagination?.total_entries ?? people.length,
        page: json.pagination?.page ?? payload.page,
        per_page: json.pagination?.per_page ?? payload.per_page,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("apollo-search error", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
