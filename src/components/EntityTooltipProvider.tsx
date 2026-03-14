import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { preprocessMarkup } from "@/lib/guide-markup";

interface TooltipData {
  name: string;
  description?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  extra?: string;
  rarity?: number;
}

const cache = new Map<string, TooltipData | null>();
const mechanicTypeCache = new Map<string, string>();
const heroRarityCache = new Map<string, number>();
let mechanicTypesLoaded = false;
let heroRaritiesLoaded = false;

async function preloadMechanicTypes() {
  if (mechanicTypesLoaded) return;
  mechanicTypesLoaded = true;
  try {
    const { data } = await supabase.from("mechanics").select("slug, mechanic_type");
    if (data) data.forEach((m) => mechanicTypeCache.set(m.slug, m.mechanic_type.toLowerCase()));
  } catch {}
}

async function preloadHeroRarities() {
  if (heroRaritiesLoaded) return;
  heroRaritiesLoaded = true;
  try {
    const { data } = await supabase.from("heroes").select("slug, rarity");
    if (data) data.forEach((h) => heroRarityCache.set(h.slug, h.rarity));
  } catch {}
}

function colorMechanicLinks(container: HTMLElement) {
  const links = container.querySelectorAll<HTMLElement>(".entity-link--mechanic");
  links.forEach((el) => {
    const slug = el.dataset.slug;
    if (!slug) return;
    const subtype = mechanicTypeCache.get(slug);
    if (subtype && !el.classList.contains(`entity-link--mechanic-${subtype}`)) {
      el.classList.add(`entity-link--mechanic-${subtype}`);
    }
  });
}

function colorHeroLinks(container: HTMLElement) {
  const links = container.querySelectorAll<HTMLElement>(".entity-link--hero");
  links.forEach((el) => {
    const slug = el.dataset.slug;
    if (!slug) return;
    const rarity = heroRarityCache.get(slug);
    if (rarity && !el.classList.contains(`entity-link--hero-r${rarity}`)) {
      el.classList.add(`entity-link--hero-r${rarity}`);
    }
  });
}

async function fetchEntity(type: string, slug: string): Promise<TooltipData | null> {
  const key = `${type}:${slug}`;
  if (cache.has(key)) return cache.get(key)!;

  let result: TooltipData | null = null;

  try {
    if (type === "mechanic") {
      const { data } = await supabase.from("mechanics").select("name, description, icon_url, mechanic_type").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, icon_url: data.icon_url, extra: data.mechanic_type };
    } else if (type === "hero") {
      const { data } = await supabase.from("heroes").select("name, description, image_url, rarity, factions(name), archetypes(name)").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, image_url: data.image_url, extra: `${(data as any).factions?.name || "?"} · ${(data as any).archetypes?.name || "?"} · ${"★".repeat(data.rarity)}`, rarity: data.rarity };
    } else if (type === "skill") {
      const { data } = await supabase.from("skills").select("name, description, image_url, skill_type, cooldown").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, image_url: data.image_url, extra: `${data.skill_type}${data.cooldown ? ` · ${data.cooldown}s CD` : ""}` };
    } else if (type === "item") {
      const { data } = await supabase.from("items").select("name, description, image_url, item_type, rarity").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, image_url: data.image_url, extra: `${data.item_type} · ${"★".repeat(data.rarity)}` };
    } else if (type === "boss-skill") {
      const { data } = await supabase.from("boss_skills").select("name, description, image_url, skill_type, cooldown, bosses(name)").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, image_url: data.image_url, extra: `${(data as any).bosses?.name || "?"} · ${data.skill_type}${data.cooldown ? ` · ${data.cooldown}s CD` : ""}` };
    } else if (type === "boss") {
      const { data } = await supabase.from("bosses").select("name, description, image_url, difficulty, location").eq("slug", slug).maybeSingle();
      if (data) result = { name: data.name, description: data.description, image_url: data.image_url, extra: [data.difficulty, data.location].filter(Boolean).join(" · ") || undefined };
    }
  } catch {
    // fail silently
  }

  cache.set(key, result);
  return result;
}

const heroRarityColors: Record<number, string> = {
  5: "hsl(30 100% 55%)",
  4: "hsl(270 70% 65%)",
  3: "hsl(210 80% 60%)",
  2: "hsl(140 60% 50%)",
  1: "hsl(0 0% 55%)",
};

const typeColors: Record<string, string> = {
  hero: "hsl(0 0% 65%)",
  skill: "hsl(270 70% 65%)",
  item: "hsl(150 60% 50%)",
  mechanic: "hsl(15 85% 55%)",
  "boss-skill": "hsl(0 70% 60%)",
  boss: "hsl(15 85% 55%)",
};

function getTooltipTitleColor(type: string, data: TooltipData): string {
  if (type === "hero" && data.rarity) {
    return heroRarityColors[data.rarity] || typeColors.hero;
  }
  return typeColors[type] || "inherit";
}

export function EntityTooltipProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ data: TooltipData; type: string; rect: DOMRect } | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = useCallback(async (el: HTMLElement) => {
    clearTimeout(hideTimeout.current);
    const type = el.dataset.entity;
    const slug = el.dataset.slug;
    if (!type || !slug) return;

    const rect = el.getBoundingClientRect();
    const data = await fetchEntity(type, slug);
    if (!data) return;

    // Apply mechanic subtype class for coloring
    if (type === "mechanic" && data.extra) {
      const subtype = data.extra.toLowerCase();
      el.classList.add(`entity-link--mechanic-${subtype}`);
    }

    setTooltip({ data, type, rect });
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setTooltip(null), 150);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimeout.current);
  }, []);

  // Preload entity types and color links (deferred to idle time)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const load = () => {
      Promise.all([preloadMechanicTypes(), preloadHeroRarities()]).then(() => {
        colorMechanicLinks(container);
        colorHeroLinks(container);
        const observer = new MutationObserver(() => {
          colorMechanicLinks(container);
          colorHeroLinks(container);
        });
        observer.observe(container, { childList: true, subtree: true });
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(load);
    } else {
      setTimeout(load, 200);
    }
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onEnter = (e: Event) => {
      const target = (e.target as HTMLElement).closest?.(".entity-link") as HTMLElement | null;
      if (target) show(target);
    };
    const onLeave = (e: Event) => {
      const target = (e.target as HTMLElement).closest?.(".entity-link") as HTMLElement | null;
      if (target) scheduleHide();
    };

    container.addEventListener("mouseenter", onEnter, true);
    container.addEventListener("mouseleave", onLeave, true);

    return () => {
      container.removeEventListener("mouseenter", onEnter, true);
      container.removeEventListener("mouseleave", onLeave, true);
      clearTimeout(hideTimeout.current);
    };
  }, [show, scheduleHide]);

  // Calculate position
  let style: React.CSSProperties = {};
  if (tooltip) {
    const { rect } = tooltip;
    const tooltipWidth = 280;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    const top = rect.top - 8;

    style = {
      position: "fixed",
      left,
      top,
      transform: "translateY(-100%)",
      width: tooltipWidth,
      zIndex: 9999,
    };
  }

  return (
    <div ref={containerRef}>
      {children}
      {tooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            style={style}
            className="entity-tooltip"
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <div className="flex items-start gap-3">
              {(tooltip.data.icon_url || tooltip.data.image_url) && (
                <img
                  src={tooltip.data.icon_url || tooltip.data.image_url || ""}
                  alt=""
                  className="h-9 w-9 rounded object-contain flex-shrink-0 mt-0.5"
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="font-display font-semibold text-sm leading-tight"
                  style={{ color: getTooltipTitleColor(tooltip.type, tooltip.data) }}
                >
                  {tooltip.data.name}
                </p>
                {tooltip.data.extra && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tooltip.data.extra}</p>
                )}
                {tooltip.data.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(tooltip.data.description) }} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
