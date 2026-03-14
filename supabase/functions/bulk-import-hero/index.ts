import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Format hero name for skill icon URLs.
 * Rules: Remove spaces + PascalCase, remove apostrophes, remove hyphens (don't capitalize second part).
 */
function formatHeroNameForIcon(name: string): string {
  return name
    .replace(/'/g, "")
    .replace(/-(\w)/g, (_m, c) => c.toLowerCase())
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify admin
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Check if hero already exists by slug
    const slug = url.trim().split("/").pop() || "";
    const { data: existing } = await adminClient
      .from("heroes")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, name: existing.name, message: "Already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    console.log("Scraping:", formattedUrl);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: formattedUrl, formats: ["markdown"], onlyMainContent: true }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      return new Response(JSON.stringify({ error: `Scrape failed: ${scrapeData.error || scrapeRes.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    if (!pageContent) {
      return new Response(JSON.stringify({ error: "No content found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI extract
    console.log("Extracting with AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant for GodforgeHub, a community database site for the game Godforge.

Extract structured hero data from the scraped godforge.gg hero page content.

IMPORTANT: On the godforge.gg hero page, the hero info section typically shows these attributes in order:
  Archetype (class) | Realm/Pantheon | Allegiance
with Affinity shown separately.

Map the data to these fields:
- name: The hero's display name (e.g. "Sun Wukong", "Amaterasu")
- subtitle: The hero's title/epithet shown under the name (e.g. "Monkey King"). Do NOT include dashes.
- slug: URL-friendly lowercase version with hyphens (e.g. "sun-wukong")
- rarity: Numeric value — legendary=5, epic=4, rare=3, uncommon=2, common=1
- element: The hero's REALM/PANTHEON — the faction or world they belong to. Valid values: "Tian", "Aaru", "Olympus", "Asgard", "Izumo", "Avalon", "Ekur", "Omeyocan", "Vyraj". This is NOT the affinity.
- class_type: The hero's ARCHETYPE/CLASS. Valid values: "Slayer", "Defender", "Sentinel", "Invoker", "Warden"
- affinity: The hero's AFFINITY TYPE. Valid values: "Strength", "Cunning", "Wisdom", "Eternal". This is NOT the realm.
- allegiance: The hero's ALLEGIANCE — their moral alignment. Valid values: "Chaos", "Order"
- description: The hero summary text (1-2 sentences)
- lore: The Story/Lore text if present
- image_url: The hero's main portrait image URL (large hero image, not small icons)
- stats: JSON object with base stats. Keys: hp, atk, def, spd, init, crit_rate, crit_dmg, res, acc. Numeric values.
- leader_bonus: JSON object with "text" (e.g. "20% DEF") and "scope" (e.g. "All Battles")
- divinity_generator: The divinity generation text
- ascension_bonuses: Array of objects with "tier" (number 1-6) and "bonus" (text)
- awakening_bonuses: Array of objects with "tier" (number 1-5) and "bonus" (text)
- skills: Array of skill objects with: name, skill_type (Basic/Core/Ultimate/Passive), description, image_url, scaling_formula, effects (array of buff/debuff names), awakening_level, awakening_bonus, ultimate_cost, initial_divinity
- imprint_passive: The Imprint Bonus text shown on the hero page

Return your response by calling the create_hero function.`,
          },
          { role: "user", content: pageContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_hero",
              description: "Create a hero entry with extracted data.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  subtitle: { type: "string" },
                  slug: { type: "string" },
                  rarity: { type: "number" },
                  element: { type: "string", description: "Realm/pantheon (e.g. Tian, Aaru, Olympus, Asgard, Izumo, Avalon, Ekur, Omeyocan, Vyraj) - NOT the affinity" },
                  class_type: { type: "string", description: "Archetype/class (e.g. Slayer, Defender, Sentinel, Invoker, Warden)" },
                  affinity: { type: "string", description: "Affinity type: Strength, Cunning, Wisdom, or Eternal - NOT the realm" },
                  allegiance: { type: "string", description: "Moral alignment: Chaos or Order" },
                  realm: { type: "string" },
                  description: { type: "string" },
                  lore: { type: "string" },
                  image_url: { type: "string" },
                  stats: {
                    type: "object",
                    properties: {
                      hp: { type: "number" }, atk: { type: "number" }, def: { type: "number" },
                      spd: { type: "number" }, init: { type: "number" }, crit_rate: { type: "number" },
                      crit_dmg: { type: "number" }, res: { type: "number" }, acc: { type: "number" },
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
                        name: { type: "string" }, skill_type: { type: "string" }, description: { type: "string" },
                        image_url: { type: "string" }, scaling_formula: { type: "string" },
                        effects: { type: "array", items: { type: "string" } },
                        awakening_level: { type: "number" }, awakening_bonus: { type: "string" },
                        ultimate_cost: { type: "number" }, initial_divinity: { type: "number" },
                      },
                      required: ["name", "skill_type", "description"],
                    },
                  },
                },
                required: ["name", "slug", "rarity", "element", "class_type", "description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_hero" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", retryable: true }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hero = JSON.parse(toolCall.function.arguments);
    console.log("Extracted:", hero.name);

    // Resolve FK IDs from reference tables
    const resolveId = async (table: string, name: string) => {
      if (!name) return null;
      const { data } = await adminClient.from(table).select("id").ilike("name", name).maybeSingle();
      return data?.id || null;
    };

    const [factionId, archetypeId, affinityId, allegianceId] = await Promise.all([
      resolveId("factions", hero.element),
      resolveId("archetypes", hero.class_type),
      resolveId("affinities", hero.affinity),
      resolveId("allegiances", hero.allegiance),
    ]);

    // Insert hero
    const heroRow = {
      name: hero.name || slug,
      subtitle: hero.subtitle || null,
      slug: hero.slug || slug,
      rarity: hero.rarity ?? 3,
      affinity: hero.affinity || null,
      allegiance: hero.allegiance || null,
      faction_id: factionId,
      archetype_id: archetypeId,
      affinity_id: affinityId,
      allegiance_id: allegianceId,
      description: hero.description || null,
      lore: hero.lore || null,
      image_url: hero.image_url || null,
      stats: hero.stats || {},
      leader_bonus: hero.leader_bonus || {},
      divinity_generator: hero.divinity_generator || null,
      ascension_bonuses: hero.ascension_bonuses || [],
      awakening_bonuses: hero.awakening_bonuses || [],
    };

    const { data: insertedHero, error: heroError } = await adminClient
      .from("heroes")
      .insert(heroRow)
      .select("id, name")
      .single();

    if (heroError) {
      return new Response(JSON.stringify({ error: `DB insert failed: ${heroError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert skills with programmatic icon URLs
    const skills = hero.skills || [];
    let skillCount = 0;
    const iconName = formatHeroNameForIcon(hero.name || slug);
    if (skills.length > 0) {
      const skillRows = skills.map((s: any) => {
        const skillIconUrl = s.skill_type
          ? `https://godforge.gg/heroes/assets/ability/ICON_${iconName}_${s.skill_type}.webp`
          : null;
        return {
          hero_id: insertedHero.id,
          name: s.name,
          slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          skill_type: s.skill_type || "Active",
          description: s.description || "",
          image_url: skillIconUrl,
          scaling_formula: s.scaling_formula || null,
          effects: s.effects || [],
          awakening_level: s.awakening_level || null,
          awakening_bonus: s.awakening_bonus || null,
          ultimate_cost: s.ultimate_cost || null,
          initial_divinity: s.initial_divinity || null,
        };
      });

      const { error: skillError } = await adminClient.from("skills").insert(skillRows);
      if (skillError) {
        console.error("Skills insert error:", skillError.message);
      } else {
        skillCount = skillRows.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      name: insertedHero.name,
      id: insertedHero.id,
      skillCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-import-hero error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
