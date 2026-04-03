

## Create Official Post from Discord Link (Manual Paste + AI)

Since we don't have a Discord bot token, the flow will be: admin pastes the Discord link and the message content, then AI structures it into a complete official post.

### UX Flow

Similar to how AdminGuides has a "From Video URL" creation mode, AdminOfficialPosts will get a "From Discord" creation mode:

1. Admin clicks "New" and sees a picker: **"From Discord Message"** or **"Blank"**
2. Choosing "From Discord Message" opens a dialog with:
   - **Discord Message URL** (text input) — parsed to extract `discord_message_id` and reconstruct `message_url`
   - **Message Content** (textarea) — admin pastes the raw message text
   - **Author Name** (text input, optional) — admin can type who posted it
   - **Author Role** (text input, optional)
   - **Channel Name** (text input, optional)
   - A **"Generate Post"** button
3. An edge function (`generate-official-post`) receives the pasted content + metadata and uses Lovable AI to:
   - Generate a cleaned-up `title` from the content
   - Format the `content` as clean markdown
   - Extract any image URLs from the pasted text
   - Return structured JSON matching the `official_posts` schema
4. The generated data pre-fills the AdminCrudPage create form for review before saving

### Technical Changes

**1. New edge function: `supabase/functions/generate-official-post/index.ts`**
- Accepts: `{ content, author, author_role, channel_name, message_url, discord_message_id }`
- Uses Lovable AI (gemini-3-flash-preview) with tool calling to extract structured output: `{ title, content (markdown), image_url }`
- Returns the complete post object ready to populate the form

**2. Update `src/pages/admin/AdminOfficialPosts.tsx`**
- Add state management and dialog UI (mirroring AdminGuides pattern)
- Mode picker dialog: "From Discord Message" | "Blank"
- Discord input dialog: URL + content textarea + optional author fields
- Parse Discord URL to extract `discord_message_id` (last segment) and set `message_url`
- On generate: call edge function, set defaults, trigger create via `triggerCreate`

### Discord URL Parsing

From `https://discord.com/channels/1451.../1451.../1489...`:
- `discord_message_id` = last path segment (`1489520003052208138`)
- `message_url` = the full URL
- `channel_name` can be left for admin to fill or derived from context

