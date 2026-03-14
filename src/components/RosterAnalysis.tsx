import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart3, PieChart as PieIcon, Triangle } from "lucide-react";

interface Hero {
  id: string;
  name: string;
  rarity: number;
  faction_name: string;
  archetype_name: string;
  affinity_id?: string | null;
}

interface AffinityInfo {
  id: string;
  name: string;
  slug: string;
  strength_id?: string | null;
  weakness_id?: string | null;
  icon_url?: string | null;
}

interface RosterAnalysisProps {
  heroes: Hero[];
  affinities?: AffinityInfo[];
}

const CHART_COLORS = [
  "hsl(259 100% 64%)",   // primary purple
  "hsl(210 80% 55%)",    // blue
  "hsl(15 85% 55%)",     // ember/orange
  "hsl(160 60% 45%)",    // teal
  "hsl(45 90% 55%)",     // gold
  "hsl(340 70% 55%)",    // rose
  "hsl(190 70% 50%)",    // cyan
  "hsl(280 60% 55%)",    // violet
  "hsl(100 50% 45%)",    // green
  "hsl(30 80% 50%)",     // warm orange
];

const RARITY_COLORS: Record<number, string> = {
  5: "hsl(45 90% 55%)",
  4: "hsl(280 60% 55%)",
  3: "hsl(210 80% 55%)",
  2: "hsl(160 60% 45%)",
  1: "hsl(215 12% 55%)",
};

const RARITY_LABELS: Record<number, string> = {
  5: "★★★★★",
  4: "★★★★",
  3: "★★★",
  2: "★★",
  1: "★",
};

const AFFINITY_COLORS: Record<string, string> = {
  Strength: "hsl(0 72% 51%)",
  Wisdom: "hsl(210 80% 55%)",
  Cunning: "hsl(130 60% 45%)",
  Eternal: "hsl(280 60% 55%)",
};

function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  arr.forEach((item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-primary">{payload[0].value} heroes</p>
    </div>
  );
}

function DistributionBar({
  data,
  title,
  subtitle,
}: {
  data: { name: string; count: number }[];
  title: string;
  subtitle?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const min = Math.min(...data.map((d) => d.count));
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(215 12% 55%)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={50}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {sorted.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={entry.count === min && data.length > 2 ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Insight callout */}
      {data.length > 2 && (
        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
          <span className="text-foreground font-medium">{sorted[0].name}</span> leads with{" "}
          <span className="text-primary font-medium">{sorted[0].count}</span> heroes, while{" "}
          <span className="text-foreground font-medium">{sorted[sorted.length - 1].name}</span> has
          only <span className="text-primary font-medium">{sorted[sorted.length - 1].count}</span>.
        </div>
      )}
    </div>
  );
}

function RarityBreakdown({ heroes }: { heroes: Hero[] }) {
  // Group by rarity, then show per-faction and per-archetype
  const [groupBy, setGroupBy] = useState<"faction" | "archetype">("faction");

  const grouped = useMemo(() => {
    const groups: Record<string, Record<number, number>> = {};
    heroes.forEach((h) => {
      const key = groupBy === "faction" ? h.faction_name : h.archetype_name;
      if (!groups[key]) groups[key] = {};
      groups[key][h.rarity] = (groups[key][h.rarity] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, rarities]) => ({ name, rarities }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [heroes, groupBy]);

  const allRarities = [...new Set(heroes.map((h) => h.rarity))].sort((a, b) => b - a);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Rarity Breakdown</h4>
          <p className="text-xs text-muted-foreground">Heroes per rarity, grouped by {groupBy}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setGroupBy("faction")}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              groupBy === "faction"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Faction
          </button>
          <button
            onClick={() => setGroupBy("archetype")}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              groupBy === "archetype"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Archetype
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {allRarities.map((r) => (
          <div key={r} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: RARITY_COLORS[r] || RARITY_COLORS[1] }}
            />
            <span className="text-muted-foreground">{RARITY_LABELS[r] || r}</span>
          </div>
        ))}
      </div>

      {/* Stacked bars */}
      <div className="space-y-1.5">
        {grouped.map((g) => {
          const total = Object.values(g.rarities).reduce((s, v) => s + v, 0);
          return (
            <div key={g.name} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 truncate shrink-0 text-right">
                {g.name}
              </span>
              <div className="flex-1 flex h-5 rounded overflow-hidden bg-secondary/30">
                {allRarities.map((r) => {
                  const count = g.rarities[r] || 0;
                  if (count === 0) return null;
                  const pct = (count / total) * 100;
                  return (
                    <div
                      key={r}
                      className="h-full flex items-center justify-center text-[9px] font-medium text-background transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: RARITY_COLORS[r] || RARITY_COLORS[1],
                        minWidth: count > 0 ? "16px" : 0,
                      }}
                      title={`${RARITY_LABELS[r]}: ${count}`}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AffinityMatchupChart({ affinities, heroes }: { affinities: AffinityInfo[]; heroes: Hero[] }) {
  // Build the triangle relationship
  const affinityMap = useMemo(() => {
    const map: Record<string, AffinityInfo> = {};
    affinities.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [affinities]);

  // Count heroes per affinity
  const affinityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    affinities.forEach((a) => {
      counts[a.name] = 0;
    });
    heroes.forEach((h) => {
      if (h.affinity_id && affinityMap[h.affinity_id]) {
        counts[affinityMap[h.affinity_id].name] = (counts[affinityMap[h.affinity_id].name] || 0) + 1;
      }
    });
    return counts;
  }, [heroes, affinities, affinityMap]);

  // Core triangle: Strength > Wisdom > Cunning > Strength
  const triangleAffinities = affinities.filter((a) => a.slug !== "eternal");
  const eternal = affinities.find((a) => a.slug === "eternal");

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Affinity Matchup Triangle</h4>
        <p className="text-xs text-muted-foreground">
          Counter relationships — plan your pulls around type advantage
        </p>
      </div>

      {/* Triangle visualization */}
      <div className="relative mx-auto" style={{ width: 280, height: 260 }}>
        <svg viewBox="0 0 280 260" className="w-full h-full">
          {/* Triangle lines */}
          <polygon
            points="140,30 40,220 240,220"
            fill="none"
            stroke="hsl(228 10% 25%)"
            strokeWidth="1.5"
          />
          {/* Arrows showing dominance */}
          {/* Strength → Wisdom (right side going down) */}
          <line x1="195" y1="120" x2="175" y2="160" stroke={AFFINITY_COLORS.Strength} strokeWidth="2" markerEnd="url(#arrowRed)" opacity="0.7" />
          {/* Wisdom → Cunning (bottom going left) */}
          <line x1="170" y1="220" x2="110" y2="220" stroke={AFFINITY_COLORS.Wisdom} strokeWidth="2" markerEnd="url(#arrowBlue)" opacity="0.7" />
          {/* Cunning → Strength (left side going up) */}
          <line x1="85" y1="160" x2="105" y2="120" stroke={AFFINITY_COLORS.Cunning} strokeWidth="2" markerEnd="url(#arrowGreen)" opacity="0.7" />
          
          {/* Arrow markers */}
          <defs>
            <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={AFFINITY_COLORS.Strength} />
            </marker>
            <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={AFFINITY_COLORS.Wisdom} />
            </marker>
            <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={AFFINITY_COLORS.Cunning} />
            </marker>
          </defs>
        </svg>

        {/* Node labels positioned over the SVG */}
        {triangleAffinities.map((aff, i) => {
          // Position: top, bottom-left, bottom-right based on typical triangle layout
          const positions = [
            { top: 0, left: "50%", transform: "translateX(-50%)" },       // Strength (top)
            { bottom: 0, left: 0 },                                       // Cunning (bottom-left)
            { bottom: 0, right: 0 },                                      // Wisdom (bottom-right)
          ];
          // Map by slug for consistent positioning
          const posMap: Record<string, number> = { strength: 0, cunning: 1, wisdom: 2 };
          const posIndex = posMap[aff.slug] ?? i;
          const pos = positions[posIndex] || positions[0];

          return (
            <div
              key={aff.id}
              className="absolute flex flex-col items-center"
              style={pos as any}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                style={{
                  backgroundColor: AFFINITY_COLORS[aff.name] || "hsl(228 10% 25%)",
                  color: "white",
                }}
              >
                {aff.icon_url ? (
                  <img src={aff.icon_url} alt={aff.name} className="h-6 w-6" />
                ) : (
                  aff.name[0]
                )}
              </div>
              <span className="text-xs font-medium text-foreground mt-1">{aff.name}</span>
              <span className="text-[10px] text-primary font-medium">
                {affinityCounts[aff.name] || 0} heroes
              </span>
            </div>
          );
        })}
      </div>

      {/* Strength/Weakness guide */}
      <div className="space-y-1.5">
        {triangleAffinities.map((aff) => {
          const strong = aff.strength_id ? affinityMap[aff.strength_id] : null;
          const weak = aff.weakness_id ? affinityMap[aff.weakness_id] : null;
          return (
            <div
              key={aff.id}
              className="flex items-center gap-2 text-xs bg-secondary/30 rounded px-3 py-1.5"
            >
              <span
                className="font-semibold w-16"
                style={{ color: AFFINITY_COLORS[aff.name] || undefined }}
              >
                {aff.name}
              </span>
              {strong && (
                <span className="text-muted-foreground">
                  beats{" "}
                  <span style={{ color: AFFINITY_COLORS[strong.name] }} className="font-medium">
                    {strong.name}
                  </span>
                </span>
              )}
              {weak && (
                <span className="text-muted-foreground ml-2">
                  · weak to{" "}
                  <span style={{ color: AFFINITY_COLORS[weak.name] }} className="font-medium">
                    {weak.name}
                  </span>
                </span>
              )}
            </div>
          );
        })}
        {eternal && (
          <div className="flex items-center gap-2 text-xs bg-secondary/30 rounded px-3 py-1.5">
            <span className="font-semibold w-16" style={{ color: AFFINITY_COLORS.Eternal }}>
              {eternal.name}
            </span>
            <span className="text-muted-foreground">
              Neutral — 10% chance of Strong Hit (+30% dmg), immune to Weak Hits
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RosterAnalysis({ heroes, affinities = [] }: RosterAnalysisProps) {
  const factionData = useMemo(() => {
    const counts = countBy(heroes, (h) => h.faction_name);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [heroes]);

  const archetypeData = useMemo(() => {
    const counts = countBy(heroes, (h) => h.archetype_name);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [heroes]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Roster Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pre-release roster insights — understand hero distribution before you pull
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="distribution" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="distribution" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Distribution
            </TabsTrigger>
            <TabsTrigger value="rarity" className="text-xs gap-1.5">
              <PieIcon className="h-3.5 w-3.5" /> Rarity
            </TabsTrigger>
            <TabsTrigger value="affinity" className="text-xs gap-1.5">
              <Triangle className="h-3.5 w-3.5" /> Affinities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <DistributionBar
                data={factionData}
                title="By Faction (Realm)"
                subtitle="See which pantheons have the most heroes"
              />
              <DistributionBar
                data={archetypeData}
                title="By Archetype (Class)"
                subtitle="Spot role scarcity in the roster"
              />
            </div>
          </TabsContent>

          <TabsContent value="rarity">
            <RarityBreakdown heroes={heroes} />
          </TabsContent>

          <TabsContent value="affinity">
            {affinities.length > 0 ? (
              <AffinityMatchupChart affinities={affinities} heroes={heroes} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Affinity data not available.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
