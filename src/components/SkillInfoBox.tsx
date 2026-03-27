import { Badge } from "@/components/ui/badge";
import { EffectHighlightedText } from "@/components/EffectHighlightedText";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcMinMult, calcMaxMult, getEfficiencyRating, RATING_COLORS, hasHitData, type SkillHitData } from "@/lib/skill-efficiency";

interface SkillEffect {
  [key: string]: any;
}

interface SkillData {
  id?: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  type?: string | null;
  max_level?: number | null;
  effects?: SkillEffect | null;
  sort_order?: string | null;
  // Efficiency fields
  target_type?: string | null;
  hit1_percent?: number | null;
  hit1_count?: number | null;
  hit1_book_bonus?: number | null;
  hit2_percent?: number | null;
  hit2_count?: number | null;
  hit2_book_bonus?: number | null;
  cooldown?: number | null;
  max_cd?: number | null;
  skill_tags?: string | null;
}

/**
 * Renders a skill in the in-game tooltip style:
 * icon + name (Lv.X), subtitle, type badges, description, level progression.
 * Auto-detects buff/debuff names in text and renders clickable highlights.
 */
export function SkillInfoBox({ skill }: { skill: SkillData }) {
  const maxLvl = skill.max_level ?? 5;
  const displayCooldown = skill.max_cd ?? skill.cooldown;

  // Build max-level description by replacing base ATK% with book-bonus-included values
  const maxLevelDescription = (() => {
    if (!skill.description) return null;
    let desc = skill.description;
    const replacements: { basePercent: number; maxPercent: number }[] = [];
    if (skill.hit1_percent && skill.hit1_book_bonus != null) {
      replacements.push({
        basePercent: Math.round(skill.hit1_percent * 100),
        maxPercent: Math.round((skill.hit1_percent + skill.hit1_book_bonus) * 100),
      });
    }
    if (skill.hit2_percent && skill.hit2_book_bonus != null) {
      replacements.push({
        basePercent: Math.round(skill.hit2_percent * 100),
        maxPercent: Math.round(skill.hit2_percent * (1 + skill.hit2_book_bonus) * 100),
      });
    }
    for (const r of replacements) {
      if (r.basePercent !== r.maxPercent) {
        desc = desc.replace(`${r.basePercent}%`, `${r.maxPercent}%`);
      }
    }
    return desc;
  })();

  // Fetch awakenings for this skill
  const { data: awakenings } = useQuery({
    queryKey: ["skill-awakenings", skill.id],
    enabled: !!skill.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awakenings")
        .select("*")
        .eq("skill_id", skill.id!)
        .order("awakening_level");
      if (error) throw error;
      return (data || []) as Array<{ id: string; awakening_level: number | null; effect: string | null }>;
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

  return (
    <div className="relative rounded-lg overflow-hidden border border-[hsl(35,60%,30%)] bg-gradient-to-b from-[hsl(228,15%,12%)] to-[hsl(228,15%,8%)] shadow-xl max-w-md w-full flex flex-col">
      {/* Subtle golden top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(40,70%,45%)] to-transparent" />

      {/* Header: Icon + Name + Type */}
      <div className="p-4 pb-3 flex items-start gap-3">
        {skill.icon && (
          <div className="h-14 w-14 shrink-0 rounded-full border-2 border-[hsl(35,60%,40%)] bg-secondary overflow-hidden shadow-[0_0_12px_hsl(35,60%,30%/0.4)]">
            <img src={skill.icon} alt={skill.name} className="h-full w-full object-contain" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground uppercase leading-tight">
              {skill.name}
              {maxLvl > 1 && (
                <span className="text-muted-foreground text-sm font-normal normal-case ml-1.5">(Lv.{maxLvl})</span>
              )}
            </h3>
            {skill.type && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {skill.type.split(/[,/]+/).map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 border-border text-muted-foreground font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {skill.sort_order && <p className="text-xs text-muted-foreground">{skill.sort_order}</p>}
          {displayCooldown != null && (
            <p className="text-xs text-muted-foreground mt-0.5">Cooldown: <span className="text-foreground font-medium">{displayCooldown}</span></p>
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Damage Efficiency */}
      {hasHitData(skill as SkillHitData) && (() => {
        const d = skill as SkillHitData;
        const min = calcMinMult(d);
        const max = calcMaxMult(d);
        const rating = getEfficiencyRating(d);
        const colors = rating ? RATING_COLORS[rating] : null;
        return (
          <div className="px-4 py-2.5 flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Base: <strong className="text-foreground">{min.toFixed(1)}x</strong></span>
            <span className="text-muted-foreground">Max: <strong className="text-foreground">{max.toFixed(1)}x</strong></span>
            {rating && colors && (
              <span className={`ml-auto px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${colors.bg} ${colors.text} ${colors.border}`}>
                {rating}
              </span>
            )}
            {skill.target_type && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                {skill.target_type}
              </Badge>
            )}
          </div>
        );
      })()}

      {/* Description */}
      {(maxLevelDescription || skill.description) && (
        <div className="px-4 py-3 text-sm leading-relaxed text-secondary-foreground whitespace-pre-line">
          <EffectHighlightedText text={maxLevelDescription || skill.description!} />
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
                <span className="text-secondary-foreground">
                  <EffectHighlightedText text={le.text} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Awakening bonuses */}
      {awakenings && awakenings.length > 0 && (
        <>
          <div className="mx-4 h-px bg-border" />
          <div className="px-4 py-3 space-y-2">
            {awakenings.map((awk) => (
              <div key={awk.id} className="flex gap-2 text-xs leading-relaxed items-start">
                <span className="shrink-0 text-[hsl(40,70%,50%)] tracking-tight" title={`Awakening ${awk.awakening_level ?? 1}`}>
                  {"★".repeat(awk.awakening_level ?? 1)}
                </span>
                <span className="text-secondary-foreground">
                  {awk.effect ? <EffectHighlightedText text={awk.effect} /> : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
