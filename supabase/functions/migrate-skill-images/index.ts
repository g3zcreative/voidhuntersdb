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

    const { data: skills, error } = await supabase
      .from("skills")
      .select("id, name, image_url")
      .like("image_url", "%godforge%")
      .limit(20);

    if (error) throw error;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: "No external skill images to migrate", migrated: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; name: string; status: string; newUrl?: string }[] = [];
    const bucket = "icons";

    for (const skill of skills) {
      try {
        const imgRes = await fetch(skill.image_url);
        if (!imgRes.ok) {
          results.push({ id: skill.id, name: skill.name, status: `fetch failed: ${imgRes.status}` });
          continue;
        }

        const contentType = imgRes.headers.get("content-type") || "image/webp";
        const imageData = new Uint8Array(await imgRes.arrayBuffer());

        const extMap: Record<string, string> = {
          "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
        };
        const ext = extMap[contentType] || "webp";
        const fileName = `skill-${skill.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, imageData, { contentType, upsert: true });

        if (uploadError) {
          results.push({ id: skill.id, name: skill.name, status: `upload failed: ${uploadError.message}` });
          continue;
        }

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from("skills")
          .update({ image_url: publicData.publicUrl })
          .eq("id", skill.id);

        if (updateError) {
          results.push({ id: skill.id, name: skill.name, status: `db update failed: ${updateError.message}` });
          continue;
        }

        results.push({ id: skill.id, name: skill.name, status: "success", newUrl: publicData.publicUrl });
      } catch (e) {
        results.push({ id: skill.id, name: skill.name, status: `error: ${e.message}` });
      }
    }

    // Count remaining
    const { count } = await supabase
      .from("skills")
      .select("id", { count: "exact", head: true })
      .like("image_url", "%godforge%");

    const migrated = results.filter(r => r.status === "success").length;
    return new Response(JSON.stringify({ migrated, total: skills.length, remaining: count || 0, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
