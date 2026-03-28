export const ROLES = ["DPS", "Debuff", "Control", "Support", "Sustain"] as const;

export const ROLE_ICONS: Record<string, string> = {
  DPS: "🗡️",
  Debuff: "❄️",
  Control: "⚡",
  Support: "⚠️",
  Sustain: "🛡️",
};

export const TIER_COLORS: Record<string, string> = {
  T0: "bg-red-500/20 border-red-500 text-red-400",
  "T0.5": "bg-orange-500/20 border-orange-500 text-orange-400",
  T1: "bg-yellow-500/20 border-yellow-500 text-yellow-400",
  "T1.5": "bg-green-500/20 border-green-500 text-green-400",
  T2: "bg-blue-500/20 border-blue-500 text-blue-400",
  T3: "bg-muted/50 border-muted-foreground/30 text-muted-foreground",
};

export const TIER_BG: Record<string, string> = {
  T0: "bg-red-500/10",
  "T0.5": "bg-orange-500/10",
  T1: "bg-yellow-500/10",
  "T1.5": "bg-green-500/10",
  T2: "bg-blue-500/10",
  T3: "bg-muted/20",
};

export const TIER_BANNER: Record<string, string> = {
  T0: "bg-red-500/80 text-white",
  "T0.5": "bg-orange-500/80 text-white",
  T1: "bg-yellow-500/80 text-black",
  "T1.5": "bg-green-500/80 text-white",
  T2: "bg-blue-500/80 text-white",
  T3: "bg-muted text-muted-foreground",
};

export const RARITY_LABELS: Record<number, string> = { 3: "Rare", 4: "Epic", 5: "Legendary" };

export const TIERS = ["T0", "T0.5", "T1", "T1.5", "T2", "T3"] as const;
