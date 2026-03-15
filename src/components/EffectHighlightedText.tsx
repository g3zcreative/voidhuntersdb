import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

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

function useEffects() {
  return useQuery({
    queryKey: ["effects"],
    queryFn: async () => {
      const { data } = await supabase.from("effects").select("*");
      return (data ?? []) as EffectData[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function BuffPopoverCard({ buff }: { buff: EffectData }) {
  const isBuff = buff.type === "buff";
  const affectedStats =
    buff.affected_stats && typeof buff.affected_stats === "object"
      ? Object.entries(buff.affected_stats)
      : [];

  return (
    <div className="w-72 space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className={`h-10 w-10 shrink-0 rounded-full border-2 overflow-hidden shadow-md ${
            isBuff
              ? "border-[hsl(170,80%,40%)] shadow-[0_0_8px_hsl(170,80%,40%/0.3)]"
              : "border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)]"
          }`}
        >
          {buff.icon ? (
            <img src={buff.icon} alt={buff.name} className="h-full w-full object-contain" />
          ) : (
            <div
              className={`h-full w-full flex items-center justify-center text-xs font-bold ${
                isBuff ? "bg-[hsl(170,80%,15%)] text-[hsl(170,80%,50%)]" : "bg-destructive/20 text-destructive"
              }`}
            >
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
        <p className="text-xs leading-relaxed text-muted-foreground break-words">{buff.description}</p>
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
 * Renders text with auto-detected effect names highlighted as clickable popovers
 * and numbers/percentages in primary color. Effect icons are shown inline.
 */
export function EffectHighlightedText({ text }: { text: string }) {
  const { data: buffs } = useEffects();

  const buffMap = new Map<string, EffectData>();
  const patterns: string[] = [];

  if (buffs && buffs.length > 0) {
    const escaped = buffs
      .map((b) => {
        buffMap.set(b.name.toLowerCase(), b);
        return b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .sort((a, b) => b.length - a.length);
    patterns.push(escaped.join("|"));
  }
  patterns.push("\\d+%|\\d+(?:\\.\\d+)?");

  const combinedRegex = new RegExp(`(${patterns.join("|")})`, "gi");
  const parts = text.split(combinedRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        const matchedBuff = buffMap.get(part.toLowerCase());
        if (matchedBuff) {
          const isBuff = matchedBuff.type === "buff";
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 font-semibold cursor-pointer underline decoration-dotted underline-offset-2 transition-colors hover:brightness-125 ${
                    isBuff ? "text-[hsl(170,80%,50%)]" : "text-destructive"
                  }`}
                >
                  {matchedBuff.icon && (
                    <img
                      src={matchedBuff.icon}
                      alt=""
                      className="inline-block h-4 w-4 object-contain rounded-sm"
                    />
                  )}
                  {part}
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="p-3 bg-card border-border shadow-2xl">
                <BuffPopoverCard buff={matchedBuff} />
              </PopoverContent>
            </Popover>
          );
        }

        if (/^\d+%$/.test(part) || /^\d+(?:\.\d+)?$/.test(part)) {
          return (
            <span key={i} className="font-bold text-[hsl(var(--primary))]">
              {part}
            </span>
          );
        }

        return part;
      })}
    </>
  );
}

export { useEffects, type EffectData };
