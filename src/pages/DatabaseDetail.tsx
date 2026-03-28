import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSchemaRegistry,
  isAutoField,
  fieldTypeToInputType,
  type SchemaField,
} from "@/hooks/useSchemaRegistry";
import { formatTableLabel } from "@/lib/format-label";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Database, Swords, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillInfoBox } from "@/components/SkillInfoBox";
import { EffectHighlightedText } from "@/components/EffectHighlightedText";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { RARITY_LABELS } from "@/lib/tier-list-constants";

/* ── FK helpers ─────────────────────────────────────── */

function fkTableName(fieldName: string) {
  const base = fieldName.slice(0, -3);
  if (base.endsWith("s") || base.endsWith("sh") || base.endsWith("ch") || base.endsWith("x") || base.endsWith("z")) return base + "es";
  if (base.endsWith("y") && !["a","e","i","o","u"].includes(base[base.length - 2])) return base.slice(0, -1) + "ies";
  return base + "s";
}

function useFkLookup(fieldName: string, id: string | null) {
  const table = fkTableName(fieldName);
  return useQuery({
    queryKey: ["fk-lookup", table, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
  });
}

function FkValue({ fieldName, id }: { fieldName: string; id: string }) {
  const { data } = useFkLookup(fieldName, id);
  if (!data) return <span className="text-muted-foreground">Loading...</span>;
  return (
    <Link
      to={`/database/${fkTableName(fieldName)}/${data.slug || data.id}`}
      className="text-primary hover:underline"
    >
      {data.name || data.title || data.slug || "Unknown"}
    </Link>
  );
}

function FieldDisplay({ field, value }: { field: SchemaField; value: any }) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (field.name.endsWith("_id") && field.type.toLowerCase() === "uuid") {
    return <FkValue fieldName={field.name} id={value} />;
  }

  const inputType = fieldTypeToInputType(field.type);

  switch (inputType) {
    case "boolean":
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    case "number":
      return <span className="font-mono">{value}</span>;
    case "datetime":
      return <span>{new Date(value).toLocaleDateString()}</span>;
    case "json": {
      let obj: Record<string, any> | null = null;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        obj = value;
      } else if (typeof value === "string") {
        try { obj = JSON.parse(value); } catch { /* ignore */ }
      }

      if (obj && Object.keys(obj).length > 0) {
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(obj).map(([k, v]) => (
              <div key={k} className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{k}</p>
                <p className="font-display text-lg font-bold text-foreground">{String(v)}</p>
              </div>
            ))}
          </div>
        );
      }

      return (
        <pre className="text-xs font-mono bg-secondary rounded-md p-3 overflow-x-auto max-h-48">
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    default: {
      const strVal = String(value);
      if (strVal.length > 20) {
        return (
          <span className="whitespace-pre-wrap">
            <EffectHighlightedText text={strVal} />
          </span>
        );
      }
      return <span className="whitespace-pre-wrap">{strVal}</span>;
    }
  }
}

/* ── Hunter detail view ──────────────────────────────── */

function HunterDetailView({
  item,
  m2mData,
}: {
  item: Record<string, any>;
  m2mData: Record<string, Array<Record<string, any>>>;
}) {
  const hunterId = item.id;
  const tags = m2mData.tags || [];

  // Fetch skills for this hunter
  const { data: skills } = useQuery({
    queryKey: ["hunter-skills", hunterId],
    enabled: !!hunterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills" as any)
        .select("*")
        .eq("hunter_id", hunterId)
        .order("sort_order" as any);
      if (error) throw error;
      return (data || []) as Record<string, any>[];
    },
  });

  return (
    <div>
      {/* Top row: Image | Header + Stats + Skills on a shared grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        {/* Image — fixed width, top-aligned */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="aspect-[4/5] rounded-lg overflow-hidden border border-border bg-secondary">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                <Shield className="h-16 w-16" />
              </div>
            )}
          </div>
        </div>

        {/* Right side — everything aligns to a consistent internal grid */}
        <div className="min-w-0 space-y-0">
          {/* Rarity label */}
          {item.rarity != null && (
            <p className={`text-[11px] font-bold uppercase tracking-[0.15em] leading-none mb-1.5 ${
              item.rarity === 5 ? "text-[hsl(45,100%,55%)]" :
              item.rarity === 4 ? "text-[hsl(265,90%,65%)]" :
              "text-[hsl(210,100%,55%)]"
            }`}>
              {RARITY_LABELS[item.rarity] || `${item.rarity}★`}
            </p>
          )}

          {/* Name */}
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-tight">
            {item.name}
          </h1>

          {/* Subtitle */}
          {item.subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{item.subtitle}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {tags.map((t: any) => (
                <Link key={t.id} to={`/database/hunters?tag=${t.id}`}>
                  <Badge variant="secondary" className="text-[11px] hover:bg-primary/20 transition-colors cursor-pointer">
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Stats + Skills — aligned grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4 mt-4">
            {/* Stats column */}
            {(() => {
              const stats = [
                { label: "Level", value: item.level },
                { label: "Power", value: item.power },
                { label: "Attack", value: item.attack },
                { label: "Defense", value: item.defense },
                { label: "Health", value: item.health },
                { label: "Speed", value: item.speed },
              ].filter((s) => s.value != null);
              if (stats.length === 0) return null;
              return (
                <div className="self-start">
                  <table className="text-sm">
                    <tbody>
                      {stats.map((s) => (
                        <tr key={s.label}>
                          <td className="py-[5px] pr-5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-right whitespace-nowrap">{s.label}</td>
                          <td className="py-[5px] font-display font-bold text-foreground tabular-nums">{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Skills grid */}
            {skills && skills.length > 0 && (
              <div className="min-w-0">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 items-start">
                  {skills.map((skill) => (
                    <SkillInfoBox key={skill.id} skill={skill as any} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap mt-4 max-w-prose">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Skill detail view ──────────────────────────────── */

function SkillDetailView({ item }: { item: Record<string, any> }) {
  // Fetch parent hunter
  const { data: hunter } = useQuery({
    queryKey: ["skill-hunter", item.hunter_id],
    enabled: !!item.hunter_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hunters" as any)
        .select("id, name, slug, image_url")
        .eq("id", item.hunter_id)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
  });

  return (
    <div className="space-y-8">
      {/* Parent hunter link */}
      {hunter && (
        <Link
          to={`/database/hunters/${hunter.slug || hunter.id}`}
          className="inline-flex items-center gap-3 bg-secondary rounded-lg px-4 py-3 hover:bg-muted transition-colors group"
        >
          {hunter.image_url && (
            <img src={hunter.image_url} alt={hunter.name} className="h-10 w-10 rounded-md object-cover border border-border" />
          )}
          <div>
            <p className="text-xs text-muted-foreground">Hunter</p>
            <p className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
              {hunter.name}
            </p>
          </div>
        </Link>
      )}

      {/* Game-style skill card */}
      <SkillInfoBox skill={item as any} />
    </div>
  );
}

/* ── Generic detail view (fallback) ──────────────────── */

function GenericDetailView({
  table,
  item,
  m2mData,
  m2mRelations,
}: {
  table: { label: string; fields: SchemaField[] };
  item: Record<string, any>;
  m2mData: Record<string, Array<Record<string, any>>>;
  m2mRelations: Array<{ junctionTable: string; relatedTable: string }>;
}) {
  const m2mTableNames = m2mRelations.map((r) => r.relatedTable);

  const displayFields = table.fields.filter(
    (f) =>
      !isAutoField(f) &&
      f.name !== "image_url" &&
      f.name !== "icon" &&
      f.name !== "name" &&
      f.name !== "title" &&
      f.name !== "slug" &&
      !m2mTableNames.includes(f.name)
  );

  const statFields = displayFields.filter(
    (f) => fieldTypeToInputType(f.type) === "number" && !f.name.endsWith("_id")
  );
  const infoFields = displayFields.filter((f) => !statFields.includes(f));

  const itemName = item.name || item.title || "Unnamed";

  return (
    <>
      {/* Hero area */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {table.fields.some((f) => f.name === "image_url") && (
          <div className="w-full md:w-72 shrink-0">
            <div className="aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
              {item.image_url ? (
                <img src={item.image_url} alt={itemName} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                  <Database className="h-16 w-16" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {itemName}
          </h1>
          {item.subtitle && (
            <p className="text-lg text-muted-foreground mb-4">{item.subtitle}</p>
          )}

          {m2mRelations.map((rel) => {
            const related = m2mData[rel.relatedTable];
            if (!related || related.length === 0) return null;
            return (
              <div key={rel.junctionTable} className="flex flex-wrap gap-2 mb-4">
                {related.map((r) => (
                  <Badge key={r.id} variant="secondary">
                    {r.name || r.title || r.slug}
                  </Badge>
                ))}
              </div>
            );
          })}

          {statFields.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {statFields.map((f) => (
                <div key={f.name} className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {f.name.replace(/_/g, " ")}
                  </p>
                  <p className="font-display text-xl font-bold text-foreground">
                    {item[f.name] != null ? item[f.name] : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <div className="space-y-6">
        {infoFields.map((field) => {
          const value = item[field.name];
          const label = field.name.replace(/_id$/, "").replace(/_/g, " ");
          const inputType = fieldTypeToInputType(field.type);
          const isLong =
            inputType === "textarea" ||
            inputType === "json" ||
            (typeof value === "string" && value.length > 200);

          return (
            <div key={field.name} className={isLong ? "" : "grid grid-cols-3 gap-4 items-start"}>
              <p className="text-sm font-medium text-muted-foreground capitalize col-span-1 pt-0.5">
                {label}
              </p>
              <div className={isLong ? "mt-1" : "col-span-2"}>
                <FieldDisplay field={field} value={value} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Main page ───────────────────────────────────────── */

export default function DatabaseDetail() {
  const { tableName, slug } = useParams<{ tableName: string; slug: string }>();
  const { getTable, getManyToMany, loading: registryLoading } = useSchemaRegistry();
  const location = useLocation();
  const navigate = useNavigate();

  const table = tableName ? getTable(tableName) : undefined;
  const m2mRelations = tableName ? getManyToMany(tableName) : [];

  const { data: item, isLoading } = useQuery({
    queryKey: ["database-detail", tableName, slug],
    enabled: !!tableName && !!table && !!slug,
    queryFn: async () => {
      let query = supabase.from(tableName as any).select("*").eq("slug", slug!);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) return data as Record<string, any>;

      const { data: d2, error: e2 } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("id", slug!)
        .single();
      if (e2) throw e2;
      return d2 as Record<string, any>;
    },
  });

  const itemId = item?.id;
  const m2mQuery = useQuery({
    queryKey: ["m2m-detail-all", tableName, itemId, m2mRelations.map((r) => r.junctionTable).join(",")],
    enabled: !!itemId && m2mRelations.length > 0,
    queryFn: async () => {
      const results: Record<string, Array<Record<string, any>>> = {};
      for (const rel of m2mRelations) {
        const { data: junctions, error: jErr } = await supabase
          .from(rel.junctionTable as any)
          .select("*")
          .eq(rel.junctionFkToSelf, itemId!);
        if (jErr) throw jErr;
        if (!junctions || junctions.length === 0) {
          results[rel.relatedTable] = [];
          continue;
        }
        const relatedIds = (junctions as any[]).map((j) => j[rel.junctionFkToRelated]);
        const { data: related, error: rErr } = await supabase
          .from(rel.relatedTable as any)
          .select("*")
          .in("id", relatedIds);
        if (rErr) throw rErr;
        results[rel.relatedTable] = (related || []) as Array<Record<string, any>>;
      }
      return results;
    },
  });
  const m2mData = m2mQuery.data || {};

  // Redirect logic: check redirects table when item not found
  const { data: redirect } = useQuery({
    queryKey: ["redirect-check", location.pathname],
    enabled: !isLoading && !registryLoading && !item,
    queryFn: async () => {
      const { data } = await supabase
        .from("redirects")
        .select("to_path")
        .eq("from_path", location.pathname)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (redirect?.to_path) {
      navigate(redirect.to_path, { replace: true });
    }
  }, [redirect, navigate]);

  if (registryLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-10 max-w-4xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!table || !item) {
    if (redirect?.to_path) return null; // redirecting
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h1 className="font-display text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-muted-foreground mb-4">
            This item doesn't exist in "{tableName}".
          </p>
          <Button variant="outline" asChild>
            <Link to={`/database/${tableName}`}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const displayLabel = formatTableLabel(table.label);
  const itemName = item.name || item.title || "Unnamed";
  const isHunter = tableName === "hunters";
  const isSkill = tableName === "skills";

  return (
    <Layout>
      <SEO
        rawTitle={`${itemName} — ${displayLabel} | VoidHuntersDB`}
        description={item.description || `View details for ${itemName} in the Void Hunters database.`}
        url={`/database/${tableName}/${slug}`}
      />

      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to={`/database/${tableName}`} className="hover:text-foreground transition-colors">{displayLabel}</Link>
          <span>/</span>
          <span className="text-foreground truncate">{itemName}</span>
        </div>

        {/* Table-specific views */}
        {isHunter ? (
          <HunterDetailView item={item} m2mData={m2mData} />
        ) : isSkill ? (
          <SkillDetailView item={item} />
        ) : (
          <GenericDetailView
            table={table}
            item={item}
            m2mData={m2mData}
            m2mRelations={m2mRelations}
          />
        )}

        {/* Metadata */}
        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground space-y-1">
          {item.created_at && <p>Added: {new Date(item.created_at).toLocaleDateString()}</p>}
          {item.updated_at && <p>Updated: {new Date(item.updated_at).toLocaleDateString()}</p>}
        </div>
      </div>
    </Layout>
  );
}
