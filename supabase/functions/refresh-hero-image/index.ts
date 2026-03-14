import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify admin
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hero_id, slug } = await req.json();
    if (!hero_id || !slug) {
      return new Response(JSON.stringify({ error: "hero_id and slug are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get hero name from DB to construct the image URL
    const { data: heroData } = await adminClient.from("heroes").select("name").eq("id", hero_id).single();
    if (!heroData?.name) {
      return new Response(JSON.stringify({ error: "Hero not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct direct image URL: /heroes/assets/hero/CO_Character_{Name}_main.webp
    // Spaces in names become underscores
    const nameForUrl = heroData.name.replace(/\s+/g, "_");
    const imgUrl = `https://godforge.gg/heroes/assets/hero/CO_Character_${nameForUrl}_main.webp`;
    console.log(`Downloading hero image: ${imgUrl}`);

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `Image download failed: ${imgRes.status} from ${imgUrl}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = (imgRes.headers.get("content-type") || "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      return new Response(JSON.stringify({ error: `Unexpected content type '${contentType}' from ${imgUrl}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    
    const imageData = new Uint8Array(await imgRes.arrayBuffer());
    const ext = contentType === "image/png" ? "png" : "webp";
    const fileName = `${hero_id}.${ext}`;

    console.log(`Uploading as ${fileName} (${contentType}, ${imageData.length} bytes)`);

    // Delete old files and upload new one
    await adminClient.storage.from("hero-images").remove([`${hero_id}.jpg`, `${hero_id}.png`, `${hero_id}.webp`]);
    const { error: upErr } = await adminClient.storage.from("hero-images").upload(fileName, imageData, { contentType, upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = adminClient.storage.from("hero-images").getPublicUrl(fileName);
    const { error: updErr } = await adminClient.from("heroes").update({ image_url: pub.publicUrl }).eq("id", hero_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, image_url: pub.publicUrl, format: ext }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
