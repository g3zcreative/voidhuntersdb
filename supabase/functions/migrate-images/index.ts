import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_SOURCES = [
  { table: "heroes", col: "image_url", bucket: "hero-images" },
  { table: "skills", col: "image_url", bucket: "images" },
  { table: "items", col: "image_url", bucket: "images" },
  { table: "weapons", col: "image_url", bucket: "images" },
  { table: "imprints", col: "image_url", bucket: "images" },
  { table: "mechanics", col: "icon_url", bucket: "icons" },
  { table: "factions", col: "icon_url", bucket: "icons" },
  { table: "news_articles", col: "image_url", bucket: "news-images" },
  { table: "guides", col: "image_url", bucket: "guide-images" },
];

const extMap: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
  "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const tableFilter: string | null = body.table || null;
  const limit: number = body.limit || 10;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const results: { table: string; id: string; col: string; old: string; new?: string; err?: string }[] = [];
  const sources = tableFilter ? IMAGE_SOURCES.filter(s => s.table === tableFilter) : IMAGE_SOURCES;
  let processed = 0;

  for (const source of sources) {
    if (processed >= limit) break;

    const { data: rows, error } = await supabase
      .from(source.table)
      .select(`id, ${source.col}`)
      .not(source.col, "is", null)
      .not(source.col, "like", `${supabaseUrl}%`)
      .like(source.col, "http%")
      .limit(limit - processed);

    if (error) {
      results.push({ table: source.table, id: "", col: source.col, old: "", err: error.message });
      continue;
    }

    for (const row of rows || []) {
      const url = row[source.col] as string;
      if (!url) continue;

      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) {
          results.push({ table: source.table, id: row.id, col: source.col, old: url, err: `HTTP ${imgRes.status}` });
          processed++;
          continue;
        }

        const contentType = imgRes.headers.get("content-type") || "image/png";
        const imageData = new Uint8Array(await imgRes.arrayBuffer());
        const ext = extMap[contentType.split(";")[0].trim()] || "png";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(source.bucket)
          .upload(fileName, imageData, { contentType: contentType.split(";")[0].trim(), upsert: false });

        if (upErr) {
          results.push({ table: source.table, id: row.id, col: source.col, old: url, err: upErr.message });
          processed++;
          continue;
        }

        const { data: pub } = supabase.storage.from(source.bucket).getPublicUrl(fileName);

        const { error: updErr } = await supabase
          .from(source.table)
          .update({ [source.col]: pub.publicUrl })
          .eq("id", row.id);

        if (updErr) {
          results.push({ table: source.table, id: row.id, col: source.col, old: url, err: updErr.message });
        } else {
          results.push({ table: source.table, id: row.id, col: source.col, old: url, new: pub.publicUrl });
        }
      } catch (e) {
        results.push({ table: source.table, id: row.id, col: source.col, old: url, err: e.message });
      }
      processed++;
    }
  }

  const migrated = results.filter(r => r.new).length;
  const failed = results.filter(r => r.err).length;
  const remaining = await countRemaining(supabase, supabaseUrl);

  return new Response(JSON.stringify({ migrated, failed, remaining, details: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function countRemaining(supabase: any, supabaseUrl: string): Promise<number> {
  let total = 0;
  for (const s of IMAGE_SOURCES) {
    const { count } = await supabase
      .from(s.table)
      .select("id", { count: "exact", head: true })
      .not(s.col, "is", null)
      .not(s.col, "like", `${supabaseUrl}%`)
      .like(s.col, "http%");
    total += count || 0;
  }
  return total;
}

const IMAGE_SOURCES_CONST = IMAGE_SOURCES;
