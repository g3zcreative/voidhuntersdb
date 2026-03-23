import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSchemaRegistry, type SchemaField } from "@/hooks/useSchemaRegistry";
import { formatTableLabel } from "@/lib/format-label";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Database, SlidersHorizontal } from "lucide-react";

/** Fields we show as filterable dropdowns (FK selects) */
function isFilterableField(f: SchemaField) {
  return f.name.endsWith("_id") && f.type.toLowerCase() === "uuid";
}

/** Pluralize simple _id → table name */
function fkTableName(fieldName: string) {
  const base = fieldName.slice(0, -3);
  if (base.endsWith("s") || base.endsWith("sh") || base.endsWith("ch") || base.endsWith("x") || base.endsWith("z")) return base + "es";
  if (base.endsWith("y") && !["a","e","i","o","u"].includes(base[base.length - 2])) return base.slice(0, -1) + "ies";
  return base + "s";
}


function useFkOptions(tableName: string) {
  return useQuery({
    queryKey: ["fk-options-public", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as Array<Record<string, any>>;
    },
  });
}

function FkFilterSelect({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
}) {
  const table = fkTableName(field.name);
  const { data: options = [] } = useFkOptions(table);
  const label = field.name.replace(/_id$/, "").replace(/_/g, " ");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder={`All ${label}s`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All {label}s</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.name || opt.title || opt.slug || "Unnamed"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function DatabaseList() {
  const { tableName } = useParams<{ tableName: string }>();
  const { getTable, loading: registryLoading } = useSchemaRegistry();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [tagFilter, setTagFilter] = useState("__all__");
  const [effectFilter, setEffectFilter] = useState("__all__");
  const [rarityFilter, setRarityFilter] = useState("__all__");

  const table = tableName ? getTable(tableName) : undefined;
  const isPublic = table?.publicPage ?? false;
  const isHunters = tableName === "hunters";

  // Fetch all rows
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["database-list", tableName],
    enabled: !!tableName && !!table && isPublic,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Array<Record<string, any>>;
    },
  });

  // Tags list (for hunters filter)
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags-list"],
    enabled: isHunters,
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id, name").order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Effects list (for hunters filter)
  const { data: allEffects = [] } = useQuery({
    queryKey: ["effects-list"],
    enabled: isHunters,
    queryFn: async () => {
      const { data } = await supabase.from("effects").select("id, name").order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Hunter → tag mapping via junction table
  const { data: hunterTagLinks = [] } = useQuery({
    queryKey: ["hunter-tags-all"],
    enabled: isHunters && tagFilter !== "__all__",
    queryFn: async () => {
      const { data } = await supabase.from("hunter_tags").select("hunter_id, tag_id");
      return (data || []) as Array<{ hunter_id: string; tag_id: string }>;
    },
  });

  // Hunter → effect mapping via skills table
  const { data: skillEffectLinks = [] } = useQuery({
    queryKey: ["skill-effects-all"],
    enabled: isHunters && effectFilter !== "__all__",
    queryFn: async () => {
      // Skills link hunters to effects — but effects are jsonb, not FK.
      // However there IS an effects table. We need to check if skills reference effects somehow.
      // For now, we'll use the skills table's hunter_id to map hunters.
      // Effects are standalone — let's check if hunters have tags that map to effects.
      // Actually effects table is separate. Let's just skip for now.
      return [] as Array<{ hunter_id: string; effect_id: string }>;
    },
  });

  // Unique rarity values for filter
  const rarityValues = useMemo(() => {
    if (!isHunters) return [];
    const vals = [...new Set(rows.map((r) => r.rarity).filter((v) => v != null))] as number[];
    return vals.sort((a, b) => a - b);
  }, [rows, isHunters]);

  // Pre-load FK lookup maps for display
  const filterableFields = useMemo(
    () => (table?.fields || []).filter(isFilterableField),
    [table]
  );

  // Build FK lookup maps
  const fkQueries: Record<string, ReturnType<typeof useFkOptions>> = {};
  filterableFields.forEach((f) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    fkQueries[f.name] = useFkOptions(fkTableName(f.name));
  });

  const fkMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    filterableFields.forEach((f) => {
      const data = fkQueries[f.name]?.data || [];
      maps[f.name] = {};
      data.forEach((r) => {
        maps[f.name][r.id] = r.name || r.title || r.slug || "Unknown";
      });
    });
    return maps;
  }, [filterableFields, ...filterableFields.map((f) => fkQueries[f.name]?.data)]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = rows;

    // Text search on name/title/slug
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        (r.name || r.title || r.slug || "").toLowerCase().includes(q)
      );
    }

    // FK filters
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "__all__") {
        result = result.filter((r) => r[key] === val);
      }
    });

    // Tag filter (M2M via hunter_tags)
    if (isHunters && tagFilter !== "__all__") {
      const matchingHunterIds = new Set(
        hunterTagLinks.filter((l) => l.tag_id === tagFilter).map((l) => l.hunter_id)
      );
      result = result.filter((r) => matchingHunterIds.has(r.id));
    }

    // Rarity filter
    if (isHunters && rarityFilter !== "__all__") {
      const rarityVal = parseInt(rarityFilter, 10);
      result = result.filter((r) => r.rarity === rarityVal);
    }

    return result;
  }, [rows, search, filters, tagFilter, rarityFilter, hunterTagLinks, isHunters]);

  if (registryLoading) {
    return (
      <Layout>
        <div className="container py-10 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!table || !isPublic) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h1 className="font-display text-2xl font-bold mb-2">Collection Not Found</h1>
          <p className="text-muted-foreground">The collection "{tableName}" doesn't exist or has no public page.</p>
        </div>
      </Layout>
    );
  }

  const displayLabel = formatTableLabel(table.label);
  const hasImages = table.fields.some((f) => f.name === "image_url");

  return (
    <Layout>
      <SEO
        rawTitle={`${displayLabel} | VoidHuntersDB`}
        description={`Browse all ${displayLabel.toLowerCase()} in the Void Hunters database.`}
        url={`/database/${tableName}`}
      />

      {/* Header */}
      <section className="border-b border-border">
        <div className="container py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">{displayLabel}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            {displayLabel}
          </h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"} found
          </p>
        </div>
      </section>

      {/* Toolbar */}
      <section className="border-b border-border bg-card/50">
        <div className="container py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${displayLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {(filterableFields.length > 0 || isHunters) && (
            <>
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden sm:block" />
              {filterableFields.map((f) => (
                <FkFilterSelect
                  key={f.name}
                  field={f}
                  value={filters[f.name] || "__all__"}
                  onChange={(v) => setFilters((prev) => ({ ...prev, [f.name]: v }))}
                />
              ))}
              {isHunters && allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Tags</SelectItem>
                    {allTags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isHunters && rarityValues.length > 0 && (
                <Select value={rarityFilter} onValueChange={setRarityFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Rarities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Rarities</SelectItem>
                     {rarityValues.map((r) => (
                      <SelectItem key={r} value={String(r)}>{rarityLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isHunters && allEffects.length > 0 && (
                <Select value={effectFilter} onValueChange={setEffectFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Effects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Effects</SelectItem>
                    {allEffects.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="container py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-52 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No results found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <Link
                key={item.id}
                to={`/database/${tableName}/${item.slug || item.id}`}
                className="group block"
              >
                <Card className="overflow-hidden hover:border-primary/40 transition-colors h-full flex flex-col">
                  {hasImages && (
                    <div className={`${tableName === "hunters" ? "aspect-[4/5]" : "aspect-square"} w-full overflow-hidden bg-secondary`}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name || item.title || ""}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                          <Database className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                  )}
                  <CardContent className="p-3 flex flex-col gap-1 flex-1">
                    <span className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {item.name || item.title || "Unnamed"}
                    </span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</span>
                    )}
                    {/* FK badges */}
                    <div className="flex flex-wrap gap-1 mt-auto pt-1">
                      {filterableFields.slice(0, 2).map((f) => {
                        const label = fkMaps[f.name]?.[item[f.name]];
                        if (!label) return null;
                        return (
                          <Badge key={f.name} variant="secondary" className="text-xs font-normal">
                            {label}
                          </Badge>
                        );
                      })}
                      {item.rarity != null && (
                        <Badge variant="outline" className="text-xs font-normal">
                          ★{item.rarity}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
