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
    const { url, bucket } = await req.json();
    if (!url || !bucket) {
      return new Response(JSON.stringify({ error: "url and bucket are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already hosted on our storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (url.startsWith(supabaseUrl)) {
      return new Response(JSON.stringify({ publicUrl: url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the external image
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${imgRes.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imgRes.headers.get("content-type") || "image/png";
    const imageData = new Uint8Array(await imgRes.arrayBuffer());

    // Determine file extension
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
    };
    const ext = extMap[contentType] || "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    // Upload to storage
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageData, { contentType, upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return new Response(JSON.stringify({ publicUrl: publicData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
