import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed column types to prevent injection
const ALLOWED_TYPES = new Set([
  "uuid", "text", "integer", "bigint", "numeric", "boolean",
  "jsonb", "json", "timestamptz", "date", "timestamp",
  "varchar", "smallint", "real", "serial", "bigserial",
  "int4", "int8", "float8", "bool",
]);

// Validate identifier (table/column names) — alphanumeric + underscore only
function isValidIdentifier(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(name) && name.length <= 63;
}

// Sanitize default value — only allow safe expressions
function isSafeDefault(val: string): boolean {
  if (!val) return true;
  const safe = /^(gen_random_uuid\(\)|now\(\)|'[^']*'::[a-z_ ]+|true|false|[0-9]+(\.[0-9]+)?|NULL|'[^']*')$/i;
  return safe.test(val.trim());
}

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string;
}

interface TableDef {
  name: string;
  columns: ColumnDef[];
}

interface ForeignKeyDef {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName?: string;
}

interface DeployRequest {
  mode: "preview" | "execute";
  desiredTables: TableDef[];
  desiredForeignKeys: ForeignKeyDef[];
  currentTables: TableDef[];
  currentForeignKeys: ForeignKeyDef[];
}

function generateDiffSQL(req: DeployRequest): string[] {
  const statements: string[] = [];
  const currentMap = new Map(req.currentTables.map((t) => [t.name, t]));
  const desiredMap = new Map(req.desiredTables.map((t) => [t.name, t]));

  // 1. Drop removed foreign keys first
  const currentFkSet = new Set(req.currentForeignKeys.map((fk) => fk.constraintName).filter(Boolean));
  const desiredFkNames = new Set<string>();

  for (const fk of req.desiredForeignKeys) {
    const name = fk.constraintName || `fk_${fk.sourceTable}_${fk.sourceColumn}`;
    desiredFkNames.add(name);
  }

  for (const fk of req.currentForeignKeys) {
    if (fk.constraintName && !desiredFkNames.has(fk.constraintName)) {
      if (!isValidIdentifier(fk.sourceTable)) continue;
      statements.push(`ALTER TABLE public.${fk.sourceTable} DROP CONSTRAINT IF EXISTS ${fk.constraintName};`);
    }
  }

  // 2. Drop removed tables (CASCADE)
  for (const [name] of currentMap) {
    if (!desiredMap.has(name)) {
      if (!isValidIdentifier(name)) continue;
      statements.push(`DROP TABLE IF EXISTS public.${name} CASCADE;`);
    }
  }

  // 3. Create new tables
  for (const [name, table] of desiredMap) {
    if (currentMap.has(name)) continue;
    if (!isValidIdentifier(name)) continue;

    const colDefs = table.columns
      .filter((c) => isValidIdentifier(c.name) && ALLOWED_TYPES.has(c.type.toLowerCase()))
      .map((c) => {
        let col = `  ${c.name} ${c.type.toUpperCase()}`;
        if (!c.nullable) col += " NOT NULL";
        if (c.isPrimaryKey) col += " PRIMARY KEY";
        if (c.defaultValue && isSafeDefault(c.defaultValue)) col += ` DEFAULT ${c.defaultValue}`;
        return col;
      });

    statements.push(`CREATE TABLE public.${name} (\n${colDefs.join(",\n")}\n);`);
    statements.push(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;`);
    // Default admin-only policies
    statements.push(
      `CREATE POLICY "Admins can do everything on ${name}" ON public.${name} FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));`
    );
    statements.push(
      `CREATE POLICY "Public can read ${name}" ON public.${name} FOR SELECT TO anon, authenticated USING (true);`
    );
  }

  // 4. Alter existing tables (add/drop columns)
  for (const [name, desired] of desiredMap) {
    const current = currentMap.get(name);
    if (!current) continue;
    if (!isValidIdentifier(name)) continue;

    const currentCols = new Map(current.columns.map((c) => [c.name, c]));
    const desiredCols = new Map(desired.columns.map((c) => [c.name, c]));

    // Drop removed columns
    for (const [colName] of currentCols) {
      if (!desiredCols.has(colName)) {
        if (!isValidIdentifier(colName)) continue;
        statements.push(`ALTER TABLE public.${name} DROP COLUMN IF EXISTS ${colName} CASCADE;`);
      }
    }

    // Add new columns
    for (const [colName, col] of desiredCols) {
      if (currentCols.has(colName)) continue;
      if (!isValidIdentifier(colName) || !ALLOWED_TYPES.has(col.type.toLowerCase())) continue;

      let stmt = `ALTER TABLE public.${name} ADD COLUMN ${colName} ${col.type.toUpperCase()}`;
      if (!col.nullable) stmt += " NOT NULL";
      if (col.defaultValue && isSafeDefault(col.defaultValue)) stmt += ` DEFAULT ${col.defaultValue}`;
      stmt += ";";
      statements.push(stmt);
    }

    // Alter column nullability or type changes
    for (const [colName, col] of desiredCols) {
      const cur = currentCols.get(colName);
      if (!cur) continue;
      if (!isValidIdentifier(colName)) continue;

      if (cur.type.toLowerCase() !== col.type.toLowerCase() && ALLOWED_TYPES.has(col.type.toLowerCase())) {
        statements.push(
          `ALTER TABLE public.${name} ALTER COLUMN ${colName} TYPE ${col.type.toUpperCase()} USING ${colName}::${col.type.toUpperCase()};`
        );
      }
      if (cur.nullable !== col.nullable) {
        if (!col.nullable) {
          // Backfill existing nulls with a safe default before setting NOT NULL
          const backfillDefault = col.type.toLowerCase() === "uuid" ? "gen_random_uuid()"
            : col.type.toLowerCase() === "text" ? "''"
            : col.type.toLowerCase() === "boolean" ? "false"
            : col.type.toLowerCase() === "integer" || col.type.toLowerCase() === "smallint" || col.type.toLowerCase() === "bigint" ? "0"
            : col.type.toLowerCase() === "numeric" || col.type.toLowerCase() === "real" || col.type.toLowerCase() === "float8" ? "0"
            : col.type.toLowerCase() === "jsonb" || col.type.toLowerCase() === "json" ? "'{}'"
            : col.type.toLowerCase() === "timestamptz" || col.type.toLowerCase() === "timestamp" || col.type.toLowerCase() === "date" ? "now()"
            : "''";
          statements.push(
            `UPDATE public.${name} SET ${colName} = ${backfillDefault} WHERE ${colName} IS NULL;`
          );
        }
        statements.push(
          `ALTER TABLE public.${name} ALTER COLUMN ${colName} ${col.nullable ? "DROP NOT NULL" : "SET NOT NULL"};`
        );
      }
    }
  }

  // 5. Add new foreign keys
  for (const fk of req.desiredForeignKeys) {
    const name = fk.constraintName || `fk_${fk.sourceTable}_${fk.sourceColumn}`;
    if (currentFkSet.has(name)) continue;
    if (
      !isValidIdentifier(fk.sourceTable) ||
      !isValidIdentifier(fk.sourceColumn) ||
      !isValidIdentifier(fk.targetTable) ||
      !isValidIdentifier(fk.targetColumn)
    )
      continue;

    statements.push(
      `ALTER TABLE public.${fk.sourceTable} ADD CONSTRAINT ${name} FOREIGN KEY (${fk.sourceColumn}) REFERENCES public.${fk.targetTable}(${fk.targetColumn});`
    );
  }

  return statements;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DeployRequest = await req.json();
    const statements = generateDiffSQL(body);

    if (body.mode === "preview") {
      return new Response(
        JSON.stringify({ sql: statements.join("\n\n"), statements }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute mode
    if (statements.length === 0) {
      return new Response(
        JSON.stringify({ message: "No changes to apply", statements: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: "DB URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      // Execute all statements in a transaction
      await sql.begin(async (tx: any) => {
        for (const stmt of statements) {
          await tx.unsafe(stmt);
        }
      });

      return new Response(
        JSON.stringify({ message: "Schema deployed successfully", statements }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      await sql.end();
    }
  } catch (err) {
    console.error("Deploy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
