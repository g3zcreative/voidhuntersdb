import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SkillEffect {
  [key: string]: any;
}

interface SkillData {
  name: string;
  description?: string | null;
  icon?: string | null;
  type?: string | null;
  max_level?: number | null;
  effects?: SkillEffect | null;
  sort_order?: string | null;
}

interface EffectData {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  type: string;
  affected_stats: Record<string, any> | null;
  scaling_info: string | null;
}

function BuffPopoverCard({ buff }: { buff: BuffData }) {
  const isBuff = buff.type === "buff";
  const affectedStats = buff.affected_stats && typeof buff.affected_stats === "object"
    ? Object.entries(buff.affected_stats)
    : [];

  return (
    <div className="w-72 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={`h-10 w-10 shrink-0 rounded-full border-2 overflow-hidden shadow-md ${
          isBuff
            ? "border-[hsl(170,80%,40%)] shadow-[0_0_8px_hsl(170,80%,40%/0.3)]"
            : "border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)]"
        }`}>
          {buff.icon ? (
            <img src={buff.icon} alt={buff.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full flex items-center justify-center text-xs font-bold ${
              isBuff ? "bg-[hsl(170,80%,15%)] text-[hsl(170,80%,50%)]" : "bg-destructive/20 text-destructive"
            }`}>
              {isBuff ? "↑" : "↓"}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-display text-sm font-bold text-foreground">{buff.name}</h4>
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 ${
              isBuff
                ? "border-[hsl(170,80%,40%)] text-[hsl(170,80%,50%)]"
                : "border-destructive text-destructive"
            }`}
          >
            {buff.type.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {buff.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{buff.description}</p>
      )}

      {/* Affected Stats */}
      {affectedStats.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Affected Stats</p>
          <div className="grid grid-cols-2 gap-1">
            {affectedStats.map(([stat, value]) => (
              <div key={stat} className="flex items-center justify-between bg-secondary/50 rounded px-2 py-1">
                <span className="text-[11px] text-muted-foreground capitalize">{stat.replace(/_/g, " ")}</span>
                <span className={`text-[11px] font-semibold ${isBuff ? "text-[hsl(170,80%,50%)]" : "text-destructive"}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scaling Info */}
      {buff.scaling_info && (
        <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
          {buff.scaling_info}
        </p>
      )}
    </div>
  );
}

/**
 * Renders a skill in the in-game tooltip style:
 * icon + name (Lv.X), subtitle, type badges, description, level progression.
 * Auto-detects buff/debuff names in text and renders clickable highlights.
 */
export function SkillInfoBox({ skill }: { skill: SkillData }) {
  const maxLvl = skill.max_level ?? 5;

  const { data: buffs } = useQuery({
    queryKey: ["buffs"],
    queryFn: async () => {
      const { data } = await supabase.from("buffs").select("*");
      return (data ?? []) as BuffData[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Parse effects object: expects keys like "lv2", "lv3" etc
  let levelEffects: { level: number; text: string }[] = [];
  if (skill.effects && typeof skill.effects === "object" && !Array.isArray(skill.effects)) {
    const entries = Object.entries(skill.effects);
    const lvEntries = entries
      .filter(([k]) => /^lv\d+$/i.test(k))
      .map(([k, v]) => ({ level: parseInt(k.replace(/^lv/i, "")), text: String(v) }))
      .sort((a, b) => a.level - b.level);
    if (lvEntries.length > 0) {
      levelEffects = lvEntries;
    }
  }

  // Build a regex from buff names for auto-detection
  const buffMap = new Map<string, BuffData>();
  const buffRegex = buffs && buffs.length > 0
    ? new RegExp(
        `(${buffs
          .map((b) => {
            buffMap.set(b.name.toLowerCase(), b);
            return b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          })
          .sort((a, b) => b.length - a.length) // longest first
          .join("|")})`,
        "gi"
      )
    : null;

  // Highlight numbers, percentages, and buff/debuff names
  function renderHighlighted(text: string) {
    // First split by buff names if available, then by numbers
    const numberPattern = /(\d+%|\d+(?:\.\d+)?)/g;
    
    // Combine patterns
    const patterns: string[] = [];
    if (buffRegex) {
      patterns.push(
        buffs!
          .map((b) => b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .sort((a, b) => b.length - a.length)
          .join("|")
      );
    }
    // Also match generic keywords not in buffs table as fallback
    patterns.push("\\d+%|\\d+(?:\\.\\d+)?");

    const combinedRegex = new RegExp(`(${patterns.join("|")})`, "gi");
    const parts = text.split(combinedRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Check if this part matches a buff/debuff
      const matchedBuff = buffMap.get(part.toLowerCase());
      if (matchedBuff) {
        const isBuff = matchedBuff.type === "buff";
        return (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`font-semibold cursor-pointer underline decoration-dotted underline-offset-2 transition-colors hover:brightness-125 ${
                  isBuff
                    ? "text-[hsl(170,80%,50%)]"
                    : "text-destructive"
                }`}
              >
                {part}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              className="p-3 bg-card border-border shadow-2xl"
            >
              <BuffPopoverCard buff={matchedBuff} />
            </PopoverContent>
          </Popover>
        );
      }

      // Highlight numbers/percentages
      if (/^\d+%$/.test(part) || /^\d+(?:\.\d+)?$/.test(part)) {
        return (
          <span key={i} className="font-bold text-[hsl(var(--primary))]">
            {part}
          </span>
        );
      }

      return part;
    });
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-[hsl(35,60%,30%)] bg-gradient-to-b from-[hsl(228,15%,12%)] to-[hsl(228,15%,8%)] shadow-xl max-w-md w-full">
      {/* Subtle golden top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(40,70%,45%)] to-transparent" />

      {/* Header: Icon + Name */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-full border-2 border-[hsl(35,60%,40%)] bg-secondary overflow-hidden shadow-[0_0_12px_hsl(35,60%,30%/0.4)]">
          {skill.icon ? (
            <img src={skill.icon} alt={skill.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">?</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground uppercase leading-tight">
            {skill.name}
            {maxLvl > 1 && (
              <span className="text-muted-foreground text-sm font-normal normal-case ml-1.5">(Lv.{maxLvl})</span>
            )}
          </h3>
          {skill.sort_order && <p className="text-xs text-muted-foreground">{skill.sort_order}</p>}
        </div>
      </div>

      {/* Type badges */}
      {skill.type && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {skill.type.split(/[,/]+/).map((t) => t.trim()).filter(Boolean).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 border-border text-muted-foreground font-medium">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mx-4 h-px bg-border" />

      {/* Description */}
      {skill.description && (
        <div className="px-4 py-3 text-sm leading-relaxed text-secondary-foreground">
          {renderHighlighted(skill.description)}
        </div>
      )}

      {/* Level progression */}
      {levelEffects.length > 0 && (
        <>
          <div className="mx-4 h-px bg-border" />
          <div className="px-4 py-3 space-y-1.5">
            {levelEffects.map((le) => (
              <div key={le.level} className="flex gap-2 text-xs leading-relaxed">
                <span className="text-muted-foreground shrink-0 w-8">Lv. {le.level}</span>
                <span className="text-secondary-foreground">{renderHighlighted(le.text)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
