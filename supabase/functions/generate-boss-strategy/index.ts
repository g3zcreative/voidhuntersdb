const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { video_url, boss_id, boss_name } = await req.json();

    if (!video_url) {
      return new Response(JSON.stringify({ error: "Video URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const videoId = extractYouTubeId(video_url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch video page to get title and description
    console.log("Fetching YouTube video info for:", videoId);
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    let videoTitle = "";
    let videoAuthor = "";
    try {
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        videoTitle = oembedData.title || "";
        videoAuthor = oembedData.author_name || "";
      } else {
        await oembedRes.text();
      }
    } catch {
      // Continue without oembed data
    }

    // Try to get transcript/captions via a public endpoint
    let transcript = "";
    try {
      // Use youtubetranscript.com API (no key needed)
      const transcriptRes = await fetch(`https://yt.lemnoslife.com/noKey/captions?videoId=${videoId}&lang=en`);
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        if (transcriptData?.captions?.[0]?.text) {
          transcript = transcriptData.captions.map((c: any) => c.text).join(" ");
        }
      } else {
        await transcriptRes.text();
      }
    } catch {
      // Transcript unavailable, continue with just title
    }

    const bossContext = boss_name ? `This strategy is for the boss "${boss_name}".` : "";
    const transcriptContext = transcript
      ? `Here is the transcript from the video:\n\n${transcript.slice(0, 8000)}`
      : "No transcript was available. Generate the strategy based on the video title and common game knowledge.";

    console.log("Generating strategy with AI...", { videoTitle, hasTranscript: !!transcript });

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
            content: `You are a strategy guide writer for GodforgeHub, a community database site for the game Godforge.

Given a YouTube video about a Godforge boss fight, create a structured strategy guide. ${bossContext}

The guide should be practical and actionable, written in markdown format with clear sections.`,
          },
          {
            role: "user",
            content: `Video Title: "${videoTitle}"
Author: ${videoAuthor}
YouTube URL: https://www.youtube.com/watch?v=${videoId}

${transcriptContext}

Create a boss strategy guide based on this video. Return it via the create_strategy function.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_strategy",
              description: "Create a boss strategy guide from a video.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A concise strategy title (e.g. 'Taking Down the Golden Guardian')" },
                  content: { type: "string", description: "Full markdown guide content with sections like Overview, Team Composition, Strategy, Tips & Tricks" },
                  recommended_heroes: {
                    type: "array",
                    description: "Hero names mentioned as recommended in the video",
                    items: { type: "string" },
                  },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_strategy" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
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

    const strategy = JSON.parse(toolCall.function.arguments);
    strategy.video_url = `https://www.youtube.com/watch?v=${videoId}`;
    strategy.video_title = videoTitle;
    strategy.video_author = videoAuthor;

    console.log("Generated strategy:", strategy.title);

    return new Response(JSON.stringify(strategy), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-boss-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
