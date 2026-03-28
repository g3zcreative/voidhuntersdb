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
  type: string | null;
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

/** Color mapping by effect type */
function getEffectColors(type: string | null): { text: string; border: string; bg: string; iconFallbackBg: string; iconFallbackText: string; symbol: string } {
  const t = (type || "").toLowerCase();
  if (t === "buff") return {
    text: "text-[hsl(210,90%,60%)]",
    border: "border-[hsl(210,90%,50%)]",
    bg: "bg-[hsl(210,90%,15%)]",
    iconFallbackBg: "bg-[hsl(210,90%,15%)]",
    iconFallbackText: "text-[hsl(210,90%,60%)]",
    symbol: "↑",
  };
  if (t === "debuff") return {
    text: "text-destructive",
    border: "border-destructive",
    bg: "bg-destructive/20",
    iconFallbackBg: "bg-destructive/20",
    iconFallbackText: "text-destructive",
    symbol: "↓",
  };
  if (t === "healing") return {
    text: "text-[hsl(145,70%,50%)]",
    border: "border-[hsl(145,70%,40%)]",
    bg: "bg-[hsl(145,70%,15%)]",
    iconFallbackBg: "bg-[hsl(145,70%,15%)]",
    iconFallbackText: "text-[hsl(145,70%,50%)]",
    symbol: "+",
  };
  // Status, Combat Mechanics, or anything else → sky blue
  return {
    text: "text-[hsl(195,90%,60%)]",
    border: "border-[hsl(195,90%,50%)]",
    bg: "bg-[hsl(195,90%,15%)]",
    iconFallbackBg: "bg-[hsl(195,90%,15%)]",
    iconFallbackText: "text-[hsl(195,90%,60%)]",
    symbol: "◆",
  };
}

function BuffPopoverCard({ buff }: { buff: EffectData }) {
  const colors = getEffectColors(buff.type);

  return (
    <div className="w-72 space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className={`h-10 w-10 shrink-0 rounded-full border-2 overflow-hidden shadow-md ${colors.border} shadow-[0_0_8px_hsl(0,0%,0%/0.3)]`}
        >
          {buff.icon ? (
            <img src={buff.icon} alt={buff.name} className="h-full w-full object-contain" />
          ) : (
            <div className={`h-full w-full flex items-center justify-center text-xs font-bold ${colors.iconFallbackBg} ${colors.iconFallbackText}`}>
              {colors.symbol}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-display text-sm font-bold text-foreground">{buff.name}</h4>
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 ${colors.border} ${colors.text}`}
          >
            {(buff.type || "effect").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {buff.description && (
        <p className="text-xs leading-relaxed text-muted-foreground break-words">{buff.description}</p>
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
          const colors = getEffectColors(matchedBuff.type);
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 font-semibold cursor-pointer underline decoration-dotted underline-offset-2 transition-colors hover:brightness-125 ${colors.text}`}
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
