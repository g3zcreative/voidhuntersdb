import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Strip the hero sidebar listing from the markdown */
function stripSidebar(md: string): string {
  const heroHeaderMatch = md.match(/\n## (Legendary|Epic|Rare|Uncommon|Common)\s*\n\n# /);
  if (heroHeaderMatch && heroHeaderMatch.index !== undefined) {
    return md.slice(heroHeaderMatch.index);
  }
  const backToIndex = md.indexOf("[Back to Index]");
  if (backToIndex !== -1) return md.slice(backToIndex);
  return md;
}

/** Deep compare two JSON values, returns true if different */
function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
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

    // 1. Fetch current hero + skills + imprints
    const { data: currentHero } = await adminClient
      .from("heroes").select("*").eq("id", hero_id).single();
    const { data: currentSkills } = await adminClient
      .from("skills").select("*").eq("hero_id", hero_id);
    const { data: currentImprints } = await adminClient
      .from("imprints").select("*").eq("source_hero_id", hero_id);

    if (!currentHero) {
      return new Response(JSON.stringify({ error: "Hero not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Scrape the hero page
    let factionSlug = (faction_name || element || "").toLowerCase();
    if (!factionSlug && currentHero?.faction_id) {
      const { data: factionRow } = await adminClient.from("factions").select("name").eq("id", currentHero.faction_id).maybeSingle();
      factionSlug = (factionRow?.name || "").toLowerCase();
    }
    const url = `https://godforge.gg/heroes/${factionSlug}/${slug}`;
    console.log("Syncing:", url);

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

    const pageContent = stripSidebar(rawContent);
    const heroName = currentHero.name || slug;

    // 3. AI extraction (same prompt as backfill-hero)
    console.log("Extracting with AI for sync...");
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

PAGE STRUCTURE (in order):
1. Rarity label then "# HeroName" then "- Subtitle -"
2. Realm icon + realm name
3. Archetype (class_type), Affinity, Allegiance
4. Imprint Bonus text
5. Hero Summary (short description)
6. "Full Hero Information" section with:
7. Lore/Story section
8. Scaled Stats table (HP, ATK, DEF, SPD, INIT, C.RATE, C.DMG, RES, ACC)
9. Abilities section with each skill
10. Divinity Generator
11. Imprint Bonus (repeated)
12. Leader Bonus with scope
13. Ascension Bonuses (tiers 1-6)
14. Awakening Bonuses (tiers I-V)

STATS FORMAT: "15,361" for HP — extract as integer 15361. Percentages like "10%" extract as 10.

ABILITIES FORMAT: Each ability has:
- Name (### heading)
- Effect icons and names
- Description text with scaling like "260%ATK"
- Skill type: "Basic", "Core", "Ultimate", or "Passive"
- Awakening badge with roman numeral (I-V) and bonus text
- Ultimate skills show "Initial Divinity" and "Ultimate Cost" numbers

ASCENSION FORMAT: "1★ Health +7%..." — tier as 1, bonus as "Health +7%..."
AWAKENING FORMAT: "I Ignore Resistance +10" — tier as 1, bonus as "Ignore Resistance +10"

Extract ONLY the data present on the page. Do NOT invent or hallucinate any data.`,
          },
          { role: "user", content: pageContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "sync_hero",
            description: "Extract hero data for sync comparison.",
            parameters: {
              type: "object",
              properties: {
                subtitle: { type: "string" },
                description: { type: "string" },
                lore: { type: "string" },
                affinity: { type: "string" },
                allegiance: { type: "string" },
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
                      scaling_formula: { type: "string" },
                      effects: { type: "array", items: { type: "string" } },
                      awakening_level: { type: "number" },
                      awakening_bonus: { type: "string" },
                      ultimate_cost: { type: "number" },
                      initial_divinity: { type: "number" },
                    },
                    required: ["name", "skill_type"],
                  },
                },
                imprint_passive: { type: "string" },
              },
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "sync_hero" } },
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
    console.log("Extracted sync data for:", heroName, "skills:", extracted.skills?.length || 0);

    // 4. Generate diffs — compare extracted vs current, insert into sync_diffs
    const batchId = `sync-${hero_id}-${Date.now()}`;
    const diffs: Array<{
      hero_id: string;
      hero_name: string;
      field: string;
      entity_type: string;
      entity_id: string | null;
      current_value: string | null;
      incoming_value: string | null;
      status: string;
      batch_id: string;
    }> = [];

    const addDiff = (field: string, entityType: string, entityId: string | null, current: unknown, incoming: unknown) => {
      if (isDifferent(current, incoming)) {
        diffs.push({
          hero_id,
          hero_name: heroName,
          field,
          entity_type: entityType,
          entity_id: entityId,
          current_value: current != null ? JSON.stringify(current) : null,
          incoming_value: incoming != null ? JSON.stringify(incoming) : null,
          status: "pending",
          batch_id: batchId,
        });
      }
    };

    // Hero-level fields
    const heroFields: Array<{ key: string; extract: string }> = [
      { key: "subtitle", extract: "subtitle" },
      { key: "description", extract: "description" },
      { key: "lore", extract: "lore" },
      { key: "affinity", extract: "affinity" },
      { key: "allegiance", extract: "allegiance" },
      { key: "divinity_generator", extract: "divinity_generator" },
    ];

    for (const f of heroFields) {
      if (extracted[f.extract] !== undefined) {
        addDiff(f.key, "hero", null, currentHero[f.key as keyof typeof currentHero], extracted[f.extract]);
      }
    }

    // Stats — compare individual stat keys
    if (extracted.stats) {
      const currentStats = (currentHero.stats || {}) as Record<string, unknown>;
      const incomingStats = extracted.stats as Record<string, unknown>;
      for (const statKey of Object.keys(incomingStats)) {
        if (isDifferent(currentStats[statKey], incomingStats[statKey])) {
          addDiff(`stats.${statKey}`, "hero", null, currentStats[statKey] ?? null, incomingStats[statKey]);
        }
      }
    }

    // Leader bonus
    if (extracted.leader_bonus) {
      addDiff("leader_bonus", "hero", null, currentHero.leader_bonus, extracted.leader_bonus);
    }

    // Ascension & awakening bonuses
    if (extracted.ascension_bonuses) {
      addDiff("ascension_bonuses", "hero", null, currentHero.ascension_bonuses, extracted.ascension_bonuses);
    }
    if (extracted.awakening_bonuses) {
      addDiff("awakening_bonuses", "hero", null, currentHero.awakening_bonuses, extracted.awakening_bonuses);
    }

    // Skills — match by name
    const extractedSkills = extracted.skills || [];
    const existingSkillsMap = new Map(
      (currentSkills || []).map((s: any) => [s.name.toLowerCase().trim(), s])
    );

    for (const es of extractedSkills) {
      const key = es.name.toLowerCase().trim();
      const existing = existingSkillsMap.get(key);

      if (existing) {
        // Compare skill fields
        const skillFields = [
          { key: "description", extract: "description" },
          { key: "skill_type", extract: "skill_type" },
          { key: "scaling_formula", extract: "scaling_formula" },
          { key: "effects", extract: "effects" },
          { key: "awakening_level", extract: "awakening_level" },
          { key: "awakening_bonus", extract: "awakening_bonus" },
          { key: "ultimate_cost", extract: "ultimate_cost" },
          { key: "initial_divinity", extract: "initial_divinity" },
        ];
        for (const sf of skillFields) {
          if (es[sf.extract] !== undefined) {
            addDiff(`skill:${es.name}.${sf.key}`, "skill", existing.id, existing[sf.key], es[sf.extract]);
          }
        }
      } else {
        // New skill not in DB
        addDiff(`skill:${es.name}`, "skill", null, null, es);
      }
    }

    // Imprint
    if (extracted.imprint_passive) {
      const existingImprint = (currentImprints || [])[0];
      if (existingImprint) {
        addDiff("imprint_passive", "imprint", existingImprint.id, existingImprint.passive, extracted.imprint_passive);
      } else {
        addDiff("imprint_passive", "imprint", null, null, extracted.imprint_passive);
      }
    }

    // 5. Insert diffs (only if there are any)
    if (diffs.length > 0) {
      // Clear any existing pending diffs for this hero first
      await adminClient.from("sync_diffs").delete().eq("hero_id", hero_id).eq("status", "pending");

      const { error: insertError } = await adminClient.from("sync_diffs").insert(diffs);
      if (insertError) {
        console.error("Failed to insert diffs:", insertError.message);
        return new Response(JSON.stringify({ error: `Failed to save diffs: ${insertError.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Sync complete for ${heroName}: ${diffs.length} diffs found`);

    return new Response(JSON.stringify({
      success: true,
      hero_name: heroName,
      slug,
      diffs_found: diffs.length,
      batch_id: batchId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-hero error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
