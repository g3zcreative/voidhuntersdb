import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://voidhuntersdb.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const urls: string[] = [];

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/news", priority: "0.9", changefreq: "daily" },
    { loc: "/database", priority: "0.8", changefreq: "weekly" },
    { loc: "/guides", priority: "0.8", changefreq: "weekly" },
    { loc: "/official-posts", priority: "0.7", changefreq: "daily" },
    { loc: "/changelog", priority: "0.4", changefreq: "weekly" },
    { loc: "/roadmap", priority: "0.4", changefreq: "monthly" },
  ];

  for (const p of staticPages) {
    urls.push(`<url><loc>${SITE_URL}${p.loc}</loc><priority>${p.priority}</priority><changefreq>${p.changefreq}</changefreq></url>`);
  }

  // Dynamic content from DB
  const configs: { table: string; prefix: string; priority: string; filter?: Record<string, unknown> }[] = [
    { table: "hunters", prefix: "/database/hunters", priority: "0.7" },
    { table: "tags", prefix: "/database/tags", priority: "0.6" },
    { table: "news_articles", prefix: "/news", priority: "0.7", filter: { published: true } },
    { table: "guides", prefix: "/guides", priority: "0.7", filter: { published: true } },
  ];

  for (const cfg of configs) {
    let query = supabase.from(cfg.table).select("slug, updated_at").order("slug").limit(5000);
    if (cfg.filter) {
      for (const [k, v] of Object.entries(cfg.filter)) {
        query = query.eq(k, v);
      }
    }
    const { data } = await query;
    for (const row of data || []) {
      const lastmod = row.updated_at ? `<lastmod>${row.updated_at.split("T")[0]}</lastmod>` : "";
      urls.push(`<url><loc>${SITE_URL}${cfg.prefix}/${row.slug}</loc>${lastmod}<priority>${cfg.priority}</priority></url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
