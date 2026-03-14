import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Format hero name for skill icon URLs.
 * Rules: Remove spaces + PascalCase, remove apostrophes, remove hyphens (don't capitalize second part).
 * e.g. "Sun Wukong" -> "SunWukong", "Chang'e" -> "Change", "Shub-Lugal" -> "Shublugal"
 */
function formatHeroNameForIcon(name: string): string {
  return name
    .replace(/'/g, "")
    .replace(/-(\w)/g, (_m, c) => c.toLowerCase())
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** Strip the hero sidebar listing from the markdown to avoid confusing the AI */
function stripSidebar(md: string): string {
  // The actual hero data starts at the second "## Epic/Legendary/Rare/etc" heading
  // or at the first "# HeroName" heading after the sidebar
  const heroHeaderMatch = md.match(/\n## (Legendary|Epic|Rare|Uncommon|Common)\s*\n\n# /);
  if (heroHeaderMatch && heroHeaderMatch.index !== undefined) {
    return md.slice(heroHeaderMatch.index);
  }
  // Fallback: find "Back to Index" link which marks end of sidebar
  const backToIndex = md.indexOf("[Back to Index]");
  if (backToIndex !== -1) {
    return md.slice(backToIndex);
  }
  return md;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hero_id, slug, faction_name, element } = await req.json();
    if (!hero_id || !slug) {
      return new Response(JSON.stringify({ error: "hero_id and slug are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Fetch current hero + skills + imprints for version snapshot
    const { data: currentHero } = await adminClient
      .from("heroes").select("*").eq("id", hero_id).single();
    const { data: currentSkills } = await adminClient
      .from("skills").select("*").eq("hero_id", hero_id);
    const { data: currentImprints } = await adminClient
      .from("imprints").select("*").eq("source_hero_id", hero_id);

    // 2. Scrape the hero page — URL format: /heroes/{faction}/{slug}
    // Resolve faction name: prefer explicit param, then look up from FK, fallback to legacy element
    let factionSlug = (faction_name || element || "").toLowerCase();
    if (!factionSlug && currentHero?.faction_id) {
      const { data: factionRow } = await adminClient.from("factions").select("name").eq("id", currentHero.faction_id).maybeSingle();
      factionSlug = (factionRow?.name || "").toLowerCase();
    }
    const url = `https://godforge.gg/heroes/${factionSlug}/${slug}`;
    console.log("Backfilling:", url);

    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      return new Response(JSON.stringify({ error: `Scrape failed: ${scrapeData.error || scrapeRes.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    if (!rawContent) {
      return new Response(JSON.stringify({ error: "No content found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip the sidebar hero listing to prevent AI from confusing heroes
    const pageContent = stripSidebar(rawContent);
    console.log("Content length after stripping sidebar:", pageContent.length);

    // 3. AI extraction with targeted prompt
    console.log("Extracting with AI...");
    const heroName = currentHero?.name || slug;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are extracting data for the hero "${heroName}" from their godforge.gg page.

CRITICAL RULES:
- You are extracting data for "${heroName}" ONLY. Ignore any other hero names on the page.
- The page may contain a sidebar listing other heroes — IGNORE IT completely.
- The hero's detail section starts with a heading like "# ${heroName}" followed by their subtitle.

PAGE STRUCTURE (in order):
1. Rarity label (e.g. "## Epic") then "# HeroName" then "- Subtitle -"
2. Realm icon + realm name (e.g. "Olympus")
3. Archetype (class_type), Affinity, Allegiance
4. Imprint Bonus text
5. Hero Summary (short description)
6. "Full Hero Information" — the detailed section repeats the above then adds:
7. Lore/Story section
8. Scaled Stats table (HP, ATK, DEF, SPD, INIT, C.RATE, C.DMG, RES, ACC)
9. Abilities section with each skill
10. Divinity Generator
11. Imprint Bonus (repeated)
12. Leader Bonus with scope
13. Ascension Bonuses (tiers 1-6)
14. Awakening Bonuses (tiers I-V)

STATS FORMAT: Stats show as "15,361" for HP — extract as integer 15361. Percentages like "10%" extract as 10.

ABILITIES FORMAT: Each ability has:
- Name (### heading)
- Effect icons and names (e.g. "Bleed", "ATK Up II")
- Description text with scaling like "260%ATK"
- Skill type label at the end: "Basic", "Core", "Ultimate", or "Passive"
- Awakening badge with roman numeral (I-V) and bonus text
- Ultimate skills show "Initial Divinity" and "Ultimate Cost" numbers

ASCENSION FORMAT: "1★ Health +7%, Attack +7%, Defense +7%" — extract tier as 1, bonus as "Health +7%, Attack +7%, Defense +7%"

AWAKENING FORMAT: "I Ignore Resistance +10" — extract tier as 1, bonus as "Ignore Resistance +10"

Extract ONLY the data present on the page. Do NOT invent or hallucinate any data.`,
          },
          { role: "user", content: pageContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "backfill_hero",
            description: "Backfill hero with extracted data from the page.",
            parameters: {
              type: "object",
              properties: {
                subtitle: { type: "string", description: "Hero epithet without dashes" },
                description: { type: "string", description: "Hero Summary text" },
                lore: { type: "string", description: "Story/lore text" },
                affinity: { type: "string", description: "Affinity type: Strength, Cunning, Wisdom, or Eternal" },
                allegiance: { type: "string", description: "Moral alignment: Chaos or Order" },
                stats: {
                  type: "object",
                  properties: {
                    hp: { type: "number" }, atk: { type: "number" }, def: { type: "number" },
                    spd: { type: "number" }, init: { type: "number" },
                    crit_rate: { type: "number" }, crit_dmg: { type: "number" },
                    res: { type: "number" }, acc: { type: "number" },
                  },
                },
                leader_bonus: {
                  type: "object",
                  properties: { text: { type: "string" }, scope: { type: "string" } },
                },
                divinity_generator: { type: "string" },
                ascension_bonuses: {
                  type: "array",
                  items: { type: "object", properties: { tier: { type: "number" }, bonus: { type: "string" } }, required: ["tier", "bonus"] },
                },
                awakening_bonuses: {
                  type: "array",
                  items: { type: "object", properties: { tier: { type: "number" }, bonus: { type: "string" } }, required: ["tier", "bonus"] },
                },
                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      skill_type: { type: "string", enum: ["Basic", "Core", "Ultimate", "Passive"] },
                      description: { type: "string" },
                      scaling_formula: { type: "string", description: "e.g. 260%ATK" },
                      effects: { type: "array", items: { type: "string" }, description: "Buff/debuff names like Bleed, ATK Up II" },
                      awakening_level: { type: "number", description: "Roman numeral converted: I=1, II=2, III=3, IV=4, V=5" },
                      awakening_bonus: { type: "string" },
                      ultimate_cost: { type: "number", description: "For Ultimate skills only" },
                      initial_divinity: { type: "number", description: "For Ultimate skills only" },
                    },
                    required: ["name", "skill_type"],
                  },
                },
                imprint_passive: { type: "string", description: "The Imprint Bonus text" },
              },
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "backfill_hero" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", retryable: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted backfill data for:", slug, "skills:", extracted.skills?.length || 0);

    // 4. Save version snapshot BEFORE updating
    const { data: lastVersion } = await adminClient
      .from("hero_versions")
      .select("version_number")
      .eq("hero_id", hero_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (lastVersion?.version_number || 0) + 1;

    await adminClient.from("hero_versions").insert({
      hero_id,
      version_number: nextVersion,
      snapshot: currentHero || {},
      skills_snapshot: currentSkills || [],
      imprints_snapshot: currentImprints || [],
      change_source: "backfill",
      changed_by: user.id,
    });

    // 5. Resolve FK IDs from reference tables
    const resolveId = async (table: string, name: string) => {
      if (!name) return null;
      const { data } = await adminClient.from(table).select("id").ilike("name", name).maybeSingle();
      return data?.id || null;
    };

    const [affinityId, allegianceId] = await Promise.all([
      resolveId("affinities", extracted.affinity),
      resolveId("allegiances", extracted.allegiance),
    ]);

    // 6. Update hero — NEVER overwrite identity fields (name, slug, image_url, rarity, element, class_type)
    const heroUpdate: Record<string, unknown> = {};
    if (extracted.subtitle) heroUpdate.subtitle = extracted.subtitle;
    if (extracted.affinity) heroUpdate.affinity = extracted.affinity;
    if (extracted.allegiance) heroUpdate.allegiance = extracted.allegiance;
    if (affinityId) heroUpdate.affinity_id = affinityId;
    if (allegianceId) heroUpdate.allegiance_id = allegianceId;
    if (extracted.description) heroUpdate.description = extracted.description;
    if (extracted.lore) heroUpdate.lore = extracted.lore;
    if (extracted.stats) heroUpdate.stats = extracted.stats;
    if (extracted.leader_bonus) heroUpdate.leader_bonus = extracted.leader_bonus;
    if (extracted.divinity_generator) heroUpdate.divinity_generator = extracted.divinity_generator;
    if (extracted.ascension_bonuses) heroUpdate.ascension_bonuses = extracted.ascension_bonuses;
    if (extracted.awakening_bonuses) heroUpdate.awakening_bonuses = extracted.awakening_bonuses;

    if (Object.keys(heroUpdate).length > 0) {
      const { error: heroError } = await adminClient
        .from("heroes").update(heroUpdate).eq("id", hero_id);
      if (heroError) {
        console.error("Hero update error:", heroError.message);
        return new Response(JSON.stringify({ error: `Hero update failed: ${heroError.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 6. Fetch all mechanics for markup conversion
    const { data: allMechanics } = await adminClient
      .from("mechanics").select("name, slug").order("name");
    
    // Build a map of mechanic name (lowercase) -> slug, sorted longest-first to avoid partial matches
    const mechanicEntries = (allMechanics || [])
      .sort((a: any, b: any) => b.name.length - a.name.length);
    
    /** Replace mechanic names in text with [mechanic:slug] markup */
    function applyMechanicMarkup(text: string): string {
      if (!text) return text;
      let result = text;
      for (const m of mechanicEntries) {
        // Match the mechanic name with optional roman numeral suffix, 
        // but skip if already inside [mechanic:...] markup
        const escaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match [Name], plain Name, or Name I/II/III/IV/V variants
        // Skip if preceded by "mechanic:" (already marked up)
        const pattern = new RegExp(
          `(?<!\\[mechanic:[^\\]]*)\\[?${escaped}(\\s+[IVX]+)?\\]?(?![^\\[]*\\])`,
          "gi"
        );
        result = result.replace(pattern, (match) => {
          const trimmed = match.replace(/^\[|\]$/g, "").trim();
          // Check if there's a roman numeral suffix BEYOND what's already in the mechanic name
          const nameUpper = m.name.toUpperCase();
          const trimmedUpper = trimmed.toUpperCase();
          // If the matched text is just the mechanic name (case-insensitive), use slug directly
          if (trimmedUpper === nameUpper) {
            return `[mechanic:${m.slug}]`;
          }
          // Only if there's an extra numeral not part of the name, append it
          const romanMatch = trimmed.match(/^(.+?)\s+([IVX]+)$/i);
          if (romanMatch) {
            const baseSlug = m.slug;
            const numeral = romanMatch[2].toLowerCase();
            return `[mechanic:${baseSlug}-${numeral}]`;
          }
          return `[mechanic:${m.slug}]`;
        });
      }
      return result;
    }

    // 7. Update existing skills (by name match), insert new ones
    const extractedSkills = extracted.skills || [];
    let skillsUpdated = 0;
    let skillsInserted = 0;

    if (extractedSkills.length > 0) {
      const { data: existingSkills } = await adminClient
        .from("skills").select("id, name").eq("hero_id", hero_id);

      const existingMap = new Map(
        (existingSkills || []).map((s: any) => [s.name.toLowerCase().trim(), s.id])
      );

      for (const es of extractedSkills) {
        const key = es.name.toLowerCase().trim();
        const existingId = existingMap.get(key);

        // Apply mechanic markup to description
        const processedDescription = applyMechanicMarkup(es.description || "");

        // Generate skill icon URL programmatically
        const iconName = formatHeroNameForIcon(heroName);
        const skillIconUrl = es.skill_type
          ? `https://godforge.gg/heroes/assets/ability/ICON_${iconName}_${es.skill_type}.webp`
          : null;

        const skillData: Record<string, unknown> = {
          skill_type: es.skill_type || "Active",
          description: processedDescription || null,
          scaling_formula: es.scaling_formula || null,
          effects: es.effects || [],
          awakening_level: es.awakening_level || null,
          awakening_bonus: es.awakening_bonus || null,
          ultimate_cost: es.ultimate_cost || null,
          initial_divinity: es.initial_divinity || null,
          image_url: skillIconUrl,
        };

        if (existingId) {
          const { error } = await adminClient.from("skills").update(skillData).eq("id", existingId);
          if (!error) skillsUpdated++;
        } else {
          const skillSlug = es.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const { error } = await adminClient.from("skills").insert({
            ...skillData,
            hero_id,
            name: es.name,
            slug: `${slug}-${skillSlug}`,
          });
          if (!error) skillsInserted++;
          else console.error("Skill insert error:", error.message);
        }
      }
    }

    // 7. Update/create imprint
    let imprintResult = "skipped";
    if (extracted.imprint_passive) {
      const { data: existingImprint } = await adminClient
        .from("imprints")
        .select("id")
        .eq("source_hero_id", hero_id)
        .maybeSingle();

      // Use passive skill icon for imprint image, falling back to hero image
      const passiveSkill = extractedSkills.find((s: any) => s.skill_type === "Passive");
      const { data: passiveSkillRow } = !passiveSkill ? { data: null } : await adminClient
        .from("skills")
        .select("image_url")
        .eq("hero_id", hero_id)
        .eq("skill_type", "Passive")
        .maybeSingle();
      const imprintImage = passiveSkillRow?.image_url || currentHero?.image_url || null;

      const imprintData = {
        name: heroName,
        passive: extracted.imprint_passive,
        rarity: currentHero?.rarity || 3,
        source_hero_id: hero_id,
        image_url: imprintImage,
      };

      if (existingImprint) {
        const { error } = await adminClient.from("imprints").update({ passive: extracted.imprint_passive, image_url: imprintImage }).eq("id", existingImprint.id);
        imprintResult = error ? `error: ${error.message}` : "updated";
      } else {
        const imprintSlug = slug;
        const { error } = await adminClient.from("imprints").insert({
          ...imprintData,
          slug: imprintSlug,
        });
        imprintResult = error ? `error: ${error.message}` : "created";
      }
    }

    return new Response(JSON.stringify({
      success: true,
      slug,
      version: nextVersion,
      skillsUpdated,
      skillsInserted,
      imprintResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-hero error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
