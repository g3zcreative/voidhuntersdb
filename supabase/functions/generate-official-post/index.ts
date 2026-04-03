const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, author, author_role, channel_name, message_url, discord_message_id } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a content editor for a gaming database website. You receive raw Discord message content from official game developers/community managers and must structure it into a clean official post.

Your job:
- Generate a concise, descriptive title summarizing the message (max 100 chars)
- Clean up the content into well-formatted markdown. Preserve all meaningful information. Fix formatting issues, remove Discord-specific artifacts (like <@mentions>, <#channels>), but keep emoji.
- If there are any image URLs in the content (e.g. CDN links, imgur, etc.), extract the first one as image_url.
- Return structured data via the tool call.`;

    const userMessage = `Here is the raw Discord message content:

${content}

${author ? `Author: ${author}` : ""}
${author_role ? `Author Role: ${author_role}` : ""}
${channel_name ? `Channel: ${channel_name}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "create_official_post",
              description: "Create a structured official post from Discord message content",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A concise title summarizing the post (max 100 chars)" },
                  content: { type: "string", description: "The cleaned-up message content in markdown format" },
                  image_url: { type: "string", description: "Extracted image URL from the content, if any" },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_official_post" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      title: result.title || null,
      content: result.content || content,
      image_url: result.image_url || null,
      author: author || null,
      author_role: author_role || null,
      channel_name: channel_name || null,
      message_url: message_url || null,
      discord_message_id: discord_message_id || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-official-post error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
