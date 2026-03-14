const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping boss page:", formattedUrl);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: formattedUrl, formats: ["html", "markdown"], onlyMainContent: true }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(JSON.stringify({ error: "Failed to scrape URL: " + (scrapeData.error || scrapeRes.status) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const pageHtml = scrapeData.data?.html || scrapeData.html || "";
    if (!pageMarkdown && !pageHtml) {
      return new Response(JSON.stringify({ error: "No content found at that URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract image URLs from HTML for better accuracy
    const imageUrls: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/g;
    let match;
    while ((match = imgRegex.exec(pageHtml)) !== null) {
      imageUrls.push(`${match[2]}: ${match[1]}`);
    }

    const contentForAI = `${pageMarkdown}\n\n--- IMAGE URLS FROM HTML ---\n${imageUrls.join("\n")}`;

    console.log("Extracting boss data with AI...");
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

Extract structured boss data from the scraped Raven Pyros boss page content. The page contains information about a Godforge boss.

Map the data to these fields:
- name: The boss's display name (e.g. "Golden Guardian")
- subtitle: The boss's title shown under the name (e.g. "Treasure Protector")
- slug: URL-friendly lowercase version with hyphens (e.g. "golden-guardian")
- description: A 1-2 sentence summary. If not explicitly on the page, write one based on the boss's abilities.
- image_url: The boss portrait image URL from the page. Look for the main portrait image (usually contains "Portrait" or "HUD" in the filename). Use the EXACT URL from the page.
- difficulty: One of "Normal", "Hard", "Nightmare", "Legendary". Default to "Normal" if not specified.
- location: The boss's location if mentioned.
- lore: Any lore/story text if present.
- skills: Array of skill objects extracted from the skills section. Each skill has:
  - name: Skill name (e.g. "Midas Touch")
  - skill_type: One of "Basic", "Core", "Ultimate", "Passive". Map from the label shown next to the skill icon.
  - description: The full ability description text. Keep [Effect Name] formatting for buffs/debuffs.
  - image_url: The skill icon URL from the page. Use the EXACT URL from the scraped content.
  - damage_type: If the skill mentions damage scaling like "(300% ATK)", extract it as a string.

Return your response by calling the create_boss function.`,
          },
          { role: "user", content: contentForAI },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_boss",
              description: "Create a boss entry with extracted data from the page.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  subtitle: { type: "string" },
                  slug: { type: "string" },
                  description: { type: "string" },
                  image_url: { type: "string" },
                  difficulty: { type: "string" },
                  location: { type: "string" },
                  lore: { type: "string" },
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        skill_type: { type: "string" },
                        description: { type: "string" },
                        image_url: { type: "string" },
                        damage_type: { type: "string" },
                      },
                      required: ["name", "skill_type", "description"],
                    },
                  },
                },
                required: ["name", "slug", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_boss" } },
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

    const boss = JSON.parse(toolCall.function.arguments);
    console.log("Extracted boss:", boss.name, "with", boss.skills?.length || 0, "skills");

    return new Response(JSON.stringify(boss), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-boss error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
