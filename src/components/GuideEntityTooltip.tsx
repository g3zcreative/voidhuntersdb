import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EffectHighlightedText } from "@/components/EffectHighlightedText";

interface EntityInfo {
  type: string;
  slug: string;
}

interface EntityData {
  name: string;
  description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  rarity?: number | null;
  type?: string | null;
  subtitle?: string | null;
}

async function fetchEntity(type: string, slug: string): Promise<EntityData | null> {
  let query;
  switch (type) {
    case "hero":
      query = supabase.from("hunters").select("name, description, image_url, rarity, subtitle").eq("slug", slug).maybeSingle();
      break;
    case "skill":
      query = supabase.from("skills").select("name, description, icon, type").eq("slug", slug).maybeSingle();
      break;
    case "boss-skill":
      query = supabase.from("boss_skills").select("name, description, type").eq("slug", slug).maybeSingle();
      break;
    case "boss":
      query = supabase.from("bosses").select("name, description, image_url").eq("slug", slug).maybeSingle();
      break;
    case "mechanic":
      query = supabase.from("effects").select("name, description, icon, type").eq("slug", slug).maybeSingle();
      break;
    default:
      return null;
  }
  const { data } = await query;
  return data as EntityData | null;
}

function useEntityData(entity: EntityInfo | null) {
  return useQuery({
    queryKey: ["entity-tooltip", entity?.type, entity?.slug],
    queryFn: () => fetchEntity(entity!.type, entity!.slug),
    enabled: !!entity,
    staleTime: 5 * 60 * 1000,
  });
}

function EntityCard({ entity, data, onClose }: { entity: EntityInfo; data: EntityData; onClose: () => void }) {
  const image = data.image_url || data.icon;
  const typeLabel = entity.type === "boss-skill" ? "Boss Skill" : entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {image && (
          <div className="h-12 w-12 shrink-0 rounded-lg border border-border overflow-hidden bg-muted">
            <img src={image} alt={data.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-bold text-foreground">{data.name}</h4>
          {data.subtitle && <p className="text-xs text-muted-foreground">{data.subtitle}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{typeLabel}</Badge>
            {data.rarity && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {"★".repeat(data.rarity)}
              </Badge>
            )}
            {data.type && entity.type !== "hero" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{data.type}</Badge>
            )}
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {data.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          <EffectHighlightedText text={data.description} />
        </p>
      )}
      <a
        href={`/database/${entity.type === "hero" ? "heroes" : entity.type === "boss-skill" ? "boss-skills" : entity.type + "s"}/${entity.slug}`}
        className="inline-block text-xs text-primary hover:underline"
      >
        View full details →
      </a>
    </div>
  );
}

export function GuideEntityTooltip({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const isMobile = useIsMobile();
  const [activeEntity, setActiveEntity] = useState<EntityInfo | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: entityData, isLoading } = useEntityData(activeEntity);

  const close = useCallback(() => {
    setActiveEntity(null);
    setPopoverPos(null);
  }, []);

  // Click handler via event delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(".entity-link");
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();

      const type = link.dataset.entity;
      const slug = link.dataset.slug;
      if (!type || !slug) return;

      // If same entity clicked, toggle off
      if (activeEntity?.type === type && activeEntity?.slug === slug) {
        close();
        return;
      }

      setActiveEntity({ type, slug });

      if (!isMobile) {
        const rect = link.getBoundingClientRect();
        setPopoverPos({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef, isMobile, activeEntity, close]);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!popoverPos || isMobile) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popoverPos, isMobile, close]);

  // Desktop popover
  if (!isMobile && activeEntity && popoverPos) {
    return (
      <div
        ref={popoverRef}
        className="fixed z-50 w-72 rounded-lg border border-border bg-popover p-3 shadow-2xl animate-in fade-in-0 zoom-in-95"
        style={{
          left: `${Math.min(popoverPos.x, window.innerWidth - 304)}px`,
          top: `${popoverPos.y - 8}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : entityData ? (
          <EntityCard entity={activeEntity} data={entityData} onClose={close} />
        ) : (
          <p className="text-xs text-muted-foreground py-2">Entity not found.</p>
        )}
      </div>
    );
  }

  // Mobile drawer
  if (isMobile && activeEntity) {
    return (
      <Drawer open onOpenChange={(open) => !open && close()}>
        <DrawerContent className="px-4 pb-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : entityData ? (
            <EntityCard entity={activeEntity} data={entityData} onClose={close} />
          ) : (
            <p className="text-xs text-muted-foreground py-4">Entity not found.</p>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return null;
}
