/**
 * Skill damage efficiency calculations and rating system.
 * All values are computed client-side from stored hit data.
 */

export interface SkillHitData {
  target_type?: string | null;
  hit1_percent?: number | null;
  hit1_count?: number | null;
  hit1_book_bonus?: number | null;
  hit2_percent?: number | null;
  hit2_count?: number | null;
  hit2_book_bonus?: number | null;
}

export type EfficiencyRating = "GOD-TIER" | "STRONG" | "AVERAGE" | "WEAK";

export function calcMinMult(d: SkillHitData): number {
  const h1 = (d.hit1_percent ?? 0) * (d.hit1_count ?? 0);
  const h2 = (d.hit2_percent ?? 0) * (d.hit2_count ?? 0);
  return h1 + h2;
}

export function calcMaxMult(d: SkillHitData): number {
  const h1 = ((d.hit1_percent ?? 0) + (d.hit1_book_bonus ?? 0)) * (d.hit1_count ?? 0);
  const h2 = ((d.hit2_percent ?? 0) + (d.hit2_book_bonus ?? 0)) * (d.hit2_count ?? 0);
  return h1 + h2;
}

export function getEfficiencyRating(d: SkillHitData): EfficiencyRating | null {
  if (!d.hit1_percent || !d.hit1_count) return null;
  const max = calcMaxMult(d);
  const t = (d.target_type ?? "").toUpperCase();

  if (t === "AOE") {
    if (max >= 2.5) return "GOD-TIER";
    if (max >= 2) return "STRONG";
    if (max >= 1.4) return "AVERAGE";
    return "WEAK";
  }
  // ST / RND / default
  if (max >= 4) return "GOD-TIER";
  if (max >= 3.3) return "STRONG";
  if (max >= 2.5) return "AVERAGE";
  return "WEAK";
}

export const RATING_COLORS: Record<EfficiencyRating, { bg: string; text: string; border: string }> = {
  "GOD-TIER": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  "STRONG":   { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  "AVERAGE":  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  "WEAK":     { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border" },
};

export function hasHitData(d: SkillHitData): boolean {
  return !!(d.hit1_percent && d.hit1_count);
}
