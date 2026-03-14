import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate via x-api-secret header
  const secret = req.headers.get("x-api-secret");
  const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (!secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const {
      author,
      author_role,
      source = "Discord",
      title,
      content,
      region,
      channel_name,
      message_url,
      discord_message_id,
      image_url,
      timestamp,
      is_edited,
    } = body;

    if (!author || !content) {
      return new Response(
        JSON.stringify({ error: "author and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const row = {
      author,
      author_role: author_role || null,
      source,
      title: title || null,
      content,
      region: region || null,
      channel_name: channel_name || null,
      message_url: message_url || null,
      discord_message_id: discord_message_id || null,
      image_url: image_url || null,
      posted_at: timestamp || new Date().toISOString(),
      is_edited: is_edited ?? false,
    };

    let result;

    if (discord_message_id) {
      // Upsert: insert or update if discord_message_id already exists
      const { data, error } = await supabase
        .from("official_posts")
        .upsert(row, { onConflict: "discord_message_id" })
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Plain insert if no discord_message_id
      const { data, error } = await supabase
        .from("official_posts")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, post: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
