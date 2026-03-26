import { useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, Database, SlidersHorizontal, Tag, X } from "lucide-react";

/** Fields we show as filterable dropdowns (FK selects) */
function isFilterableField(f: SchemaField) {
  return f.name.endsWith("_id") && f.type.toLowerCase() === "uuid";
}

/** Pluralize simple _id → table name */
function fkTableName(fieldName: string) {
  const base = fieldName.slice(0, -3);
  if (base.endsWith("s") || base.endsWith("sh") || base.endsWith("ch") || base.endsWith("x") || base.endsWith("z"))
    return base + "es";
  if (base.endsWith("y") && !["a", "e", "i", "o", "u"].includes(base[base.length - 2]))
    return base.slice(0, -1) + "ies";
  return base + "s";
}

/** Optimize image URLs for thumbnails via Supabase render endpoint */
function thumbnailUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("/storage/v1/object/public/")) {
    return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=400&resize=contain";
  }
  return url;
}

/** Columns needed for list cards per table */
const HUNTER_LIST_COLUMNS = "id, name, slug, subtitle, image_url, rarity";
const DEFAULT_LIST_COLUMNS = "id, name, slug, subtitle, image_url, title";

function FkFilterSelect({
  field,
  value,
  onChange,
  options,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
  options: Array<Record<string, any>>;
}) {
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
  const [searchParams] = useSearchParams();
  const { getTable, loading: registryLoading } = useSchemaRegistry();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const initial = searchParams.get("tag");
    return initial ? [initial] : [];
  });
  const [effectFilter, setEffectFilter] = useState("__all__");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState("__all__");

  const table = tableName ? getTable(tableName) : undefined;
  const isPublic = table?.publicPage ?? false;
  const isHunters = tableName === "hunters";

  // Pre-compute filterable fields (stable once table is loaded)
  const filterableFields = useMemo(() => (table?.fields || []).filter((f) => isFilterableField(f) && f.name !== "skill_id"), [table]);

  // Stable sorted list of FK table names for batch query
  const fkTableNames = useMemo(
    () => [...new Set(filterableFields.map((f) => fkTableName(f.name)))].sort(),
    [filterableFields]
  );

  // Fetch all rows — select only needed columns
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["database-list", tableName],
    enabled: !!tableName && !!table && isPublic,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const columns = isHunters ? HUNTER_LIST_COLUMNS : DEFAULT_LIST_COLUMNS;
      const { data, error } = await supabase
        .from(tableName as any)
        .select(columns)
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
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id, name").order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Effects list (for hunters filter)
  const { data: allEffects = [] } = useQuery({
    queryKey: ["effects-list"],
    enabled: isHunters,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("effects").select("id, name").order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // All hunter_tags for computing per-hunter match counts
  const { data: allHunterTags = [] } = useQuery({
    queryKey: ["all-hunter-tags"],
    enabled: isHunters,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("hunter_tags")
        .select("hunter_id, tag_id");
      return (data || []) as Array<{ hunter_id: string; tag_id: string }>;
    },
  });

  // Per-hunter: how many of selectedTags match
  const hunterTagMatchCount = useMemo(() => {
    const counts: Record<string, number> = {};
    if (selectedTags.length === 0) return counts;
    const selectedSet = new Set(selectedTags);
    allHunterTags.forEach((ht) => {
      if (selectedSet.has(ht.tag_id)) {
        counts[ht.hunter_id] = (counts[ht.hunter_id] || 0) + 1;
      }
    });
    return counts;
  }, [allHunterTags, selectedTags]);

  // Batch FK lookup — single query fetches all FK tables at once
  const { data: fkBatchData } = useQuery({
    queryKey: ["fk-batch", ...fkTableNames],
    enabled: fkTableNames.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const results: Record<string, Array<Record<string, any>>> = {};
      const fetches = fkTableNames.map(async (tbl) => {
        const { data } = await supabase
          .from(tbl as any)
          .select("id, name, title, slug")
          .order("name", { ascending: true })
          .limit(500);
        results[tbl] = (data || []) as Array<Record<string, any>>;
      });
      await Promise.all(fetches);
      return results;
    },
  });

  // Build FK lookup maps from batch data
  const fkMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    if (!fkBatchData) return maps;
    filterableFields.forEach((f) => {
      const tbl = fkTableName(f.name);
      const data = fkBatchData[tbl] || [];
      maps[f.name] = {};
      data.forEach((r) => {
        maps[f.name][r.id] = r.name || r.title || r.slug || "Unknown";
      });
    });
    return maps;
  }, [filterableFields, fkBatchData]);

  // FK options for filter dropdowns (derived from batch data)
  const fkOptions = useMemo(() => {
    const opts: Record<string, Array<Record<string, any>>> = {};
    if (!fkBatchData) return opts;
    filterableFields.forEach((f) => {
      opts[f.name] = fkBatchData[fkTableName(f.name)] || [];
    });
    return opts;
  }, [filterableFields, fkBatchData]);

  // Unique rarity values for filter
  const rarityValues = useMemo(() => {
    if (!isHunters) return [];
    const vals = [...new Set(rows.map((r) => r.rarity).filter((v) => v != null))] as number[];
    return vals.sort((a, b) => a - b);
  }, [rows, isHunters]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = rows;

    // Text search on name/title/slug
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => (r.name || r.title || r.slug || "").toLowerCase().includes(q));
    }

    // FK filters
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "__all__") {
        result = result.filter((r) => r[key] === val);
      }
    });

    // Tag filter — show hunters matching ANY selected tag
    if (isHunters && selectedTags.length > 0) {
      result = result.filter((r) => (hunterTagMatchCount[r.id] || 0) > 0);
    }

    // Rarity filter
    if (isHunters && rarityFilter !== "__all__") {
      const rarityVal = parseInt(rarityFilter, 10);
      result = result.filter((r) => r.rarity === rarityVal);
    }

    // Sort by match count descending when tags selected
    if (isHunters && selectedTags.length > 0) {
      result = [...result].sort((a, b) => (hunterTagMatchCount[b.id] || 0) - (hunterTagMatchCount[a.id] || 0));
    }

    return result;
  }, [rows, search, filters, selectedTags, rarityFilter, hunterTagMatchCount, isHunters]);

  if (registryLoading) {
    return (
      <Layout>
        <div className="container py-10 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
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
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-foreground">{displayLabel}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Void Hunters</h1>
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
                  options={fkOptions[f.name] || []}
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
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
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
                    {rarityValues.map((r) => {
                      const label = ({ 3: "Rare", 4: "Epic", 5: "Legendary" } as Record<number, string>)[r] || `★${r}`;
                      return (
                        <SelectItem key={r} value={String(r)}>
                          {label}
                        </SelectItem>
                      );
                    })}
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
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No results found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <Link key={item.id} to={`/database/${tableName}/${item.slug || item.id}`} className="group block">
                <Card className="overflow-hidden hover:border-primary/40 transition-colors h-full flex flex-col">
                  {hasImages && (
                    <div
                      className={`${tableName === "hunters" ? "aspect-[4/5]" : "aspect-square"} w-full overflow-hidden bg-secondary`}
                    >
                      {item.image_url ? (
                        <img
                          src={thumbnailUrl(item.image_url) || item.image_url}
                          alt={item.name || item.title || ""}
                          loading="lazy"
                          width={400}
                          height={tableName === "hunters" ? 500 : 400}
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm leading-snug text-white line-clamp-1">
                        {item.name || item.title || "Unnamed"}
                      </span>
                      {item.rarity != null && (() => {
                        const rarityMap: Record<number, { label: string; color: string }> = {
                          3: { label: "Rare", color: "#1E90FF" },
                          4: { label: "Epic", color: "#9b59b6" },
                          5: { label: "Legendary", color: "#FFD700" },
                        };
                        const r = rarityMap[item.rarity];
                        if (!r) return null;
                        return (
                          <span className="text-xs font-medium shrink-0" style={{ color: r.color }}>
                            {r.label}
                          </span>
                        );
                      })()}
                    </div>
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
