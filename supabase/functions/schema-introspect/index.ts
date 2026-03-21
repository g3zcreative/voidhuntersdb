import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tables managed by Supabase or the platform — never touch these
const SYSTEM_TABLES = new Set([
  "user_roles",
  "profiles",
  "page_views",
  "feedback",
  "site_settings",
  "site_changelog",
  "seo_templates",
  "entity_definitions",
  "news_articles",
  "news_comments",
  "official_posts",
  "guides",
  "authors",
  "roadmap_items",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for includeSystem query param
  const url = new URL(req.url);
  const includeSystem = url.searchParams.get("includeSystem") === "true";
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });
    const token = authHeader!.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read information_schema
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Get all public tables
    const { data: tables, error: tablesError } = await adminClient
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_type", "BASE TABLE");

    // Fallback: use pg_catalog via RPC if information_schema isn't accessible
    // We'll use a direct postgres query approach via the REST API
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: "DB URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use postgres directly for reliable introspection
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      // Get tables
      const dbTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      // Get columns for all public tables
      const dbColumns = await sql`
        SELECT 
          table_name,
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

      // Get primary keys
      const dbPks = await sql`
        SELECT 
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      `;

      // Get foreign keys
      const dbFks = await sql`
        SELECT
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `;

      // Get RLS status
      const dbRls = await sql`
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
      `;

      // Build structured response
      const pkSet = new Set(dbPks.map((pk: any) => `${pk.table_name}.${pk.column_name}`));
      const rlsMap = new Map(dbRls.map((r: any) => [r.tablename, r.rowsecurity]));

      const tableMap: Record<string, any> = {};
      for (const t of dbTables) {
        const name = t.table_name;
        if (!includeSystem && SYSTEM_TABLES.has(name)) continue;
        tableMap[name] = {
          name,
          rlsEnabled: rlsMap.get(name) ?? false,
          columns: [],
        };
      }

      for (const col of dbColumns) {
        if (!tableMap[col.table_name]) continue;
        // Map udt_name to friendly type
        let type = col.udt_name;
        if (type === "int4") type = "integer";
        if (type === "int8") type = "bigint";
        if (type === "float8") type = "numeric";
        if (type === "bool") type = "boolean";
        if (type === "timestamptz" || type === "timestamp") type = col.udt_name;

        tableMap[col.table_name].columns.push({
          name: col.column_name,
          type,
          nullable: col.is_nullable === "YES",
          isPrimaryKey: pkSet.has(`${col.table_name}.${col.column_name}`),
          defaultValue: col.column_default ?? "",
        });
      }

      const foreignKeys = dbFks
        .filter((fk: any) => tableMap[fk.source_table] || tableMap[fk.target_table])
        .map((fk: any) => ({
          constraintName: fk.constraint_name,
          sourceTable: fk.source_table,
          sourceColumn: fk.source_column,
          targetTable: fk.target_table,
          targetColumn: fk.target_column,
        }));

      return new Response(
        JSON.stringify({
          tables: Object.values(tableMap),
          foreignKeys,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } finally {
      await sql.end();
    }
  } catch (err) {
    console.error("Introspect error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
