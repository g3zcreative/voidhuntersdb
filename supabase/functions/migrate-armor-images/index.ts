import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: sets, error } = await supabase
      .from("armor_sets")
      .select("id, slug, image_url")
      .not("image_url", "is", null);

    if (error) throw error;

    const results: { slug: string; status: string; url?: string }[] = [];

    for (const set of sets || []) {
      // Skip if already hosted locally
      if (set.image_url.startsWith(supabaseUrl)) {
        results.push({ slug: set.slug, status: "skipped" });
        continue;
      }

      try {
        const imgRes = await fetch(set.image_url);
        if (!imgRes.ok) {
          results.push({ slug: set.slug, status: `fetch_failed:${imgRes.status}` });
          continue;
        }

        const contentType = imgRes.headers.get("content-type") || "image/png";
        const imageData = new Uint8Array(await imgRes.arrayBuffer());
        const extMap: Record<string, string> = {
          "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
          "image/gif": "gif", "image/svg+xml": "svg",
        };
        const ext = extMap[contentType] || "png";
        const fileName = `armor-sets/${set.slug}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("icons")
          .upload(fileName, imageData, { contentType, upsert: true });

        if (uploadError) {
          results.push({ slug: set.slug, status: `upload_failed:${uploadError.message}` });
          continue;
        }

        const { data: publicData } = supabase.storage.from("icons").getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from("armor_sets")
          .update({ image_url: publicData.publicUrl })
          .eq("id", set.id);

        if (updateError) {
          results.push({ slug: set.slug, status: `update_failed:${updateError.message}` });
          continue;
        }

        results.push({ slug: set.slug, status: "ok", url: publicData.publicUrl });
      } catch (e) {
        results.push({ slug: set.slug, status: `error:${e.message}` });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
