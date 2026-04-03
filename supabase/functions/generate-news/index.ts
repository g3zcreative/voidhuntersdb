import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, url, category, videoUrl } = await req.json();

    if (!prompt && !url && !videoUrl) {
      return new Response(JSON.stringify({ error: "Either prompt, url, or videoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const categoryHint = category ? ` The article category is "${category}".` : "";

    // Determine mode and build messages
    let systemPrompt: string;
    let userMessage: any; // string or multimodal array

    if (videoUrl) {
      // Video mode — scrape video page for context, then generate article
      let formattedVideoUrl = videoUrl.trim();
      if (!formattedVideoUrl.startsWith("http://") && !formattedVideoUrl.startsWith("https://")) {
        formattedVideoUrl = `https://${formattedVideoUrl}`;
      }

      console.log("Processing video URL:", formattedVideoUrl);

      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ error: "Firecrawl is not configured. Connect it in Settings." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sourceContent = "";
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: formattedVideoUrl, formats: ["markdown"], onlyMainContent: true, timeout: 120000 }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok) {
          sourceContent = scrapeData.data?.markdown || scrapeData.markdown || "";
        } else {
          console.error("Firecrawl error:", scrapeData);
        }
      } catch (scrapeError) {
        console.error("Firecrawl request failed:", scrapeError);
      }

      if (!sourceContent && !prompt?.trim()) {
        return new Response(JSON.stringify({ error: "Could not extract content from this video URL. Add some context notes and try again." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contextHint = prompt ? `\n\nAdditional context from the author: ${prompt}` : "";

      systemPrompt = `You are a gaming news writer for VoidHuntersDB, a community site for a gacha RPG game called Void Hunters.${categoryHint}

Using the provided source context from a YouTube video page, write a comprehensive news article summarizing its content for the VoidHuntersDB community. Focus on game-related announcements, updates, tips, or information discussed in the video. Rephrase and restructure the content into a well-written article — do NOT copy verbatim.${contextHint}

Return your response by calling the create_article function. The content should be well-structured markdown with headers, and the slug should be a URL-friendly lowercase version of the title. Keep the excerpt under 200 characters.`;

      userMessage = `Video URL: ${formattedVideoUrl}\n\nScraped Video Page Context:\n${sourceContent || "(Unavailable)"}\n\nAuthor Notes:\n${prompt?.trim() || "(No additional notes provided)"}`;
    } else if (url) {
      // URL scrape mode
      let sourceContent = "";
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ error: "Firecrawl is not configured. Connect it in Settings." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      console.log("Scraping URL:", formattedUrl);
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

      sourceContent = scrapeData.data?.markdown || scrapeData.markdown || "";
      if (!sourceContent) {
        return new Response(JSON.stringify({ error: "No content found at that URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      systemPrompt = `You are a gaming news writer for GodforgeHub, a community site for a gacha RPG game called Godforge.${categoryHint}

Summarize and rewrite the following scraped web content into a news article for a gaming community site (GodforgeHub). Do NOT copy verbatim — rephrase and restructure.

Return your response by calling the create_article function. The content should be well-structured markdown with headers, and the slug should be a URL-friendly lowercase version of the title. Keep the excerpt under 200 characters.`;

      userMessage = sourceContent;
    } else {
      // Prompt mode
      systemPrompt = `You are a gaming news writer for GodforgeHub, a community site for a gacha RPG game called Godforge.${categoryHint}

Write a news article for a gaming community site (GodforgeHub) based on the following bullet points or notes.

Return your response by calling the create_article function. The content should be well-structured markdown with headers, and the slug should be a URL-friendly lowercase version of the title. Keep the excerpt under 200 characters.`;

      userMessage = prompt;
    }

    console.log("Calling Lovable AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_article",
              description: "Create a news article draft with title, slug, excerpt, and markdown content.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Article headline" },
                  slug: { type: "string", description: "URL-friendly slug" },
                  excerpt: { type: "string", description: "Short summary under 200 chars" },
                  content: { type: "string", description: "Full article in markdown" },
                },
                required: ["title", "slug", "excerpt", "content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_article" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
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

    const article = JSON.parse(toolCall.function.arguments);
    console.log("Generated article:", article.title);

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-news error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
