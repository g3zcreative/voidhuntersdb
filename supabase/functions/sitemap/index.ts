import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://godforgehub.com";

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
    { loc: "/database/heroes", priority: "0.8", changefreq: "weekly" },
    { loc: "/database/skills", priority: "0.8", changefreq: "weekly" },
    { loc: "/database/imprints", priority: "0.8", changefreq: "weekly" },
    { loc: "/database/weapons", priority: "0.8", changefreq: "weekly" },
    { loc: "/database/armor-sets", priority: "0.8", changefreq: "weekly" },
    { loc: "/database/mechanics", priority: "0.8", changefreq: "weekly" },
    { loc: "/bosses", priority: "0.8", changefreq: "weekly" },
    { loc: "/guides", priority: "0.8", changefreq: "weekly" },
    { loc: "/community", priority: "0.7", changefreq: "monthly" },
    { loc: "/tools", priority: "0.5", changefreq: "monthly" },
    { loc: "/changelog", priority: "0.4", changefreq: "weekly" },
    { loc: "/roadmap", priority: "0.4", changefreq: "monthly" },
  ];

  for (const p of staticPages) {
    urls.push(`<url><loc>${SITE_URL}${p.loc}</loc><priority>${p.priority}</priority><changefreq>${p.changefreq}</changefreq></url>`);
  }

  // Dynamic content from DB
  const configs: { table: string; prefix: string; priority: string; filter?: Record<string, unknown>; limit?: number }[] = [
    { table: "heroes", prefix: "/database/heroes", priority: "0.7" },
    { table: "skills", prefix: "/database/skills", priority: "0.6" },
    { table: "imprints", prefix: "/database/imprints", priority: "0.6" },
    { table: "mechanics", prefix: "/database/mechanics", priority: "0.6" },
    { table: "weapons", prefix: "/database/weapons", priority: "0.6" },
    { table: "armor_sets", prefix: "/database/armor-sets", priority: "0.5" },
    { table: "bosses", prefix: "/bosses", priority: "0.7" },
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
