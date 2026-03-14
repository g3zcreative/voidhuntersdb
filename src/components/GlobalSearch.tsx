import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sword, Shield, User, Zap, BookOpen, Newspaper, Cog, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  type: "hero" | "weapon" | "imprint" | "skill" | "mechanic" | "guide" | "news";
  href: string;
  subtitle?: string;
}

const typeConfig: Record<SearchResult["type"], { icon: React.ReactNode; label: string }> = {
  hero: { icon: <User className="h-4 w-4" />, label: "Hero" },
  weapon: { icon: <Sword className="h-4 w-4" />, label: "Weapon" },
  imprint: { icon: <Shield className="h-4 w-4" />, label: "Imprint" },
  skill: { icon: <Zap className="h-4 w-4" />, label: "Skill" },
  mechanic: { icon: <Cog className="h-4 w-4" />, label: "Mechanic" },
  guide: { icon: <BookOpen className="h-4 w-4" />, label: "Guide" },
  news: { icon: <Newspaper className="h-4 w-4" />, label: "News" },
};

export function GlobalSearch({ className, mobile }: { className?: string; mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const pattern = `%${q}%`;

    const [heroes, weapons, imprints, skills, mechanics, guides, news] = await Promise.all([
      supabase.from("heroes").select("id, name, slug").ilike("name", pattern).limit(5),
      supabase.from("weapons").select("id, name, slug, rarity").ilike("name", pattern).limit(5),
      supabase.from("imprints").select("id, name, slug").ilike("name", pattern).limit(5),
      supabase.from("skills").select("id, name, slug, skill_type").ilike("name", pattern).limit(5),
      supabase.from("mechanics").select("id, name, slug, mechanic_type").ilike("name", pattern).limit(5),
      supabase.from("guides").select("id, title, slug, category").ilike("title", pattern).eq("published", true).limit(5),
      supabase.from("news_articles").select("id, title, slug, category").ilike("title", pattern).eq("published", true).limit(5),
    ]);

    const mapped: SearchResult[] = [
      ...(heroes.data?.map((h) => ({ id: h.id, name: h.name, type: "hero" as const, href: `/database/heroes/${h.slug}` })) || []),
      ...(weapons.data?.map((w) => ({ id: w.id, name: w.name, type: "weapon" as const, href: `/database/weapons/${w.slug}`, subtitle: w.rarity })) || []),
      ...(imprints.data?.map((i) => ({ id: i.id, name: i.name, type: "imprint" as const, href: `/database/imprints/${i.slug}` })) || []),
      ...(skills.data?.map((s) => ({ id: s.id, name: s.name, type: "skill" as const, href: `/database/skills/${s.slug}`, subtitle: s.skill_type })) || []),
      ...(mechanics.data?.map((m) => ({ id: m.id, name: m.name, type: "mechanic" as const, href: `/database/mechanics/${m.slug}`, subtitle: m.mechanic_type })) || []),
      ...(guides.data?.map((g) => ({ id: g.id, name: g.title, type: "guide" as const, href: `/guides/${g.slug}`, subtitle: g.category })) || []),
      ...(news.data?.map((n) => ({ id: n.id, name: n.title, type: "news" as const, href: `/news/${n.slug}`, subtitle: n.category })) || []),
    ];

    setResults(mapped);
    setSelectedIndex(-1);
    setOpen(mapped.length > 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectResult = (result: SearchResult) => {
    navigate(result.href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder={mobile ? "Search..." : "Search Godforge Hub..."}
        className="pl-9 pr-8 bg-secondary border-border h-9 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                  {typeConfig[type as SearchResult["type"]].label}s
                </div>
                {items.map((result) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={result.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                        selectedIndex === idx && "bg-accent"
                      )}
                      onClick={() => selectResult(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {typeConfig[result.type].icon}
                      </span>
                      <span className="truncate font-medium">{result.name}</span>
                      {result.subtitle && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">{result.subtitle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
