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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Not admin");

    const body = await req.json();
    const tableName = body.table || "hunters";
    const column = body.column || "image_url";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Find rows with external URLs
    const { data: rows, error: fetchErr } = await supabase
      .from(tableName)
      .select(`id, ${column}`)
      .not(column, "is", null);

    if (fetchErr) throw fetchErr;

    const externalRows = (rows || []).filter(
      (r: any) => r[column] && r[column].startsWith("http") && !r[column].includes(supabaseUrl)
    );

    if (externalRows.length === 0) {
      return new Response(JSON.stringify({ migrated: 0, message: "No external URLs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const row of externalRows) {
      const url = row[column];
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "png";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const arrayBuffer = await blob.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
          .from("images")
          .upload(path, arrayBuffer, { contentType: blob.type || "image/png" });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
        const newUrl = urlData.publicUrl;

        const { error: updateErr } = await supabase
          .from(tableName)
          .update({ [column]: newUrl })
          .eq("id", row.id);
        if (updateErr) throw updateErr;

        results.push({ id: row.id, status: "ok", newUrl });
      } catch (err: any) {
        results.push({ id: row.id, status: "error", error: err.message, originalUrl: url });
      }
    }

    return new Response(
      JSON.stringify({ migrated: results.filter((r) => r.status === "ok").length, total: externalRows.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
