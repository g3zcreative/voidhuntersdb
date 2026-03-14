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
    .replace(/'/g, "")           // Remove apostrophes: Chang'e -> Change
    .replace(/-(\w)/g, (_m, c) => c.toLowerCase()) // Remove hyphens, lowercase second part: Shub-Lugal -> Shublugal
    .split(/\s+/)                // Split by spaces
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)) // Capitalize first letter of each word
    .join("");                   // Join without spaces
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl is not configured. Connect it in Settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Scrape the hero page
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping hero page:", formattedUrl);
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
      console.error("Firecrawl error:", scrapeData);
      return new Response(JSON.stringify({ error: "Failed to scrape URL: " + (scrapeData.error || scrapeRes.status) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    if (!pageContent) {
      return new Response(JSON.stringify({ error: "No content found at that URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract structured hero data
    console.log("Extracting hero data with AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant for GodforgeHub, a community database site for the game Godforge.

Extract structured hero data from the scraped godforge.gg hero page content. The page contains information about a Godforge hero.

IMPORTANT: On the godforge.gg hero page, the hero info section typically shows these attributes in order:
  Archetype (class) | Realm/Pantheon | Allegiance
with Affinity shown separately.

Map the data to these fields:
- name: The hero's display name (e.g. "Sun Wukong", "Amaterasu")
- subtitle: The hero's title/epithet shown under the name (e.g. "Monkey King", "Sphinx of Riddles"). Do NOT include the dashes.
- slug: URL-friendly lowercase version with hyphens (e.g. "sun-wukong")
- rarity: Numeric value — legendary=5, epic=4, rare=3, uncommon=2, common=1
- element: The hero's REALM/PANTHEON — the faction or world they belong to. Valid values: "Tian", "Aaru", "Olympus", "Asgard", "Izumo", "Avalon", "Ekur", "Omeyocan", "Vyraj". This is NOT the affinity.
- class_type: The hero's ARCHETYPE/CLASS. Valid values: "Slayer", "Defender", "Sentinel", "Invoker", "Warden"
- affinity: The hero's AFFINITY TYPE. Valid values: "Strength", "Cunning", "Wisdom", "Eternal". This is NOT the realm.
- allegiance: The hero's ALLEGIANCE — their moral alignment. Valid values: "Chaos", "Order"
- description: The hero summary text (1-2 sentences)
- lore: The Story/Lore text from the page if present
- image_url: The hero's main portrait image URL. IMPORTANT: Do NOT use any placehold.co URLs. Instead, construct the URL as: https://godforge.gg/heroes/assets/hero/CO_Character_{Name}_main.webp where {Name} is the hero name with spaces replaced by underscores (e.g. CO_Character_Sun_Wukong_main.webp). If you cannot determine the name, leave image_url empty.
- stats: JSON object with base stats. Include keys: hp, atk, def, spd, init, crit_rate, crit_dmg, res, acc. Use numeric values.
- leader_bonus: JSON object with "text" (e.g. "20% DEF") and "scope" (e.g. "All Battles")
- divinity_generator: The divinity generation text (e.g. "Gain [50] Divinity when hit by an enemy. Gain [500] divinity when this hero gains a [Disable]")
- ascension_bonuses: Array of objects with "tier" (number 1-6) and "bonus" (text describing the bonus)
- awakening_bonuses: Array of objects with "tier" (number 1-5) and "bonus" (text describing the bonus)
- skills: Array of skill objects with: name, skill_type (Basic/Core/Ultimate/Passive), description (the full ability text), image_url (skill icon URL if found), scaling_formula (e.g. "175%DEF + 80%ATK"), effects (array of buff/debuff names like ["ATK Down II", "Intercept"]), awakening_level (integer tier that unlocks bonus, if any), awakening_bonus (text of the awakening bonus, if any), ultimate_cost (integer, for Ultimate skills only), initial_divinity (integer, for Ultimate skills only)
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
              description: "Create a hero entry with extracted data from the page.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  subtitle: { type: "string", description: "Hero title/epithet" },
                  slug: { type: "string" },
                  rarity: { type: "number" },
                   element: { type: "string", description: "Realm/pantheon (e.g. Tian, Aaru, Olympus, Asgard, Izumo, Avalon, Ekur, Omeyocan, Vyraj) - NOT the affinity" },
                   class_type: { type: "string", description: "Archetype/class (e.g. Slayer, Defender, Sentinel, Invoker, Warden)" },
                   affinity: { type: "string", description: "Affinity type: Strength, Cunning, Wisdom, or Eternal - NOT the realm" },
                   allegiance: { type: "string", description: "Moral alignment: Chaos or Order" },
                  description: { type: "string" },
                  lore: { type: "string", description: "Story/lore text" },
                  image_url: { type: "string" },
                  stats: {
                    type: "object",
                    properties: {
                      hp: { type: "number" },
                      atk: { type: "number" },
                      def: { type: "number" },
                      spd: { type: "number" },
                      init: { type: "number" },
                      crit_rate: { type: "number" },
                      crit_dmg: { type: "number" },
                      res: { type: "number" },
                      acc: { type: "number" },
                    },
                  },
                  leader_bonus: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      scope: { type: "string" },
                    },
                  },
                  divinity_generator: { type: "string" },
                  ascension_bonuses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tier: { type: "number" },
                        bonus: { type: "string" },
                      },
                      required: ["tier", "bonus"],
                    },
                  },
                  awakening_bonuses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tier: { type: "number" },
                        bonus: { type: "string" },
                      },
                      required: ["tier", "bonus"],
                    },
                  },
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        skill_type: { type: "string" },
                        description: { type: "string" },
                        image_url: { type: "string" },
                        scaling_formula: { type: "string" },
                        effects: { type: "array", items: { type: "string" } },
                        awakening_level: { type: "number" },
                        awakening_bonus: { type: "string" },
                        ultimate_cost: { type: "number" },
                        initial_divinity: { type: "number" },
                      },
                      required: ["name", "skill_type", "description"],
                    },
                  },
                  imprint_passive: { type: "string", description: "The Imprint Bonus text" },
                },
                required: ["name", "slug", "rarity", "element", "class_type", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_hero" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
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
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hero = JSON.parse(toolCall.function.arguments);
    console.log("Extracted hero:", hero.name);

    // Fix image_url: never use placehold.co, construct from name
    if (!hero.image_url || hero.image_url.includes("placehold.co")) {
      const nameForUrl = (hero.name || "").replace(/\s+/g, "_");
      hero.image_url = nameForUrl
        ? `https://godforge.gg/heroes/assets/hero/CO_Character_${nameForUrl}_main.webp`
        : null;
    }

    // Generate skill icon URLs programmatically
    if (hero.skills && hero.name) {
      const iconName = formatHeroNameForIcon(hero.name);
      for (const skill of hero.skills) {
        if (!skill.image_url && skill.skill_type) {
          skill.image_url = `https://godforge.gg/heroes/assets/ability/ICON_${iconName}_${skill.skill_type}.webp`;
        }
      }
    }

    return new Response(JSON.stringify(hero), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-hero error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
