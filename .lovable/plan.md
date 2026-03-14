

## Custom Markup for Embedding Game Entity Links in Guides

### Concept

Inspired by Wowhead's markup (e.g. `[item=1234]`, `[spell=5678]`), we define a simple bracket syntax that authors write inside standard Markdown content. Before rendering, a preprocessing step transforms these tokens into interactive links with tooltips and icons.

### Proposed Syntax

```text
[hero:sun-wukong]       → links to /database/heroes/sun-wukong
[skill:phoenix-strike]  → links to /database/skills/phoenix-strike  (future)
[item:iron-sword]       → links to /database/items/iron-sword       (future)
[material:fire-crystal] → links to /database/materials/fire-crystal (future)
```

Authors write these directly in the Markdown editor. The slug after the colon matches the entity's `slug` column in the database.

### Architecture

```text
Guide Markdown content (stored in DB)
  │
  ▼
preprocessMarkup(content)          ← new utility function
  │  Regex: /\[(hero|skill|item|material):([a-z0-9-]+)\]/g
  │  Replaces with custom HTML: <a> with data attributes + inline icon
  ▼
MDEditor.Markdown renders HTML     ← already used in GuideDetail
  │  needs: rehypeRaw plugin to allow inline HTML
  ▼
CSS styles for .entity-link         ← styled inline links with hover effects
```

### Implementation Steps

1. **Create `src/lib/guide-markup.ts`** — a pure function `preprocessMarkup(content: string): string`
   - Uses regex to find all `[type:slug]` tokens
   - Replaces each with an HTML anchor: `<a href="/database/{type}s/{slug}" class="entity-link entity-link--{type}" data-entity="{type}" data-slug="{slug}">{Display Name}</a>`
   - For display name: capitalize and de-slugify (e.g. `sun-wukong` → `Sun Wukong`). A future enhancement could batch-fetch names from the DB, but starting with slug-derived names keeps it simple and synchronous.

2. **Update `GuideDetail.tsx`** — pipe `guide.content` through `preprocessMarkup()` before passing to `MDEditor.Markdown`
   - Add `rehype-raw` plugin so the injected HTML anchors render correctly (MDEditor.Markdown supports `rehypePlugins` prop)

3. **Add entity link styles to `src/index.css`** — color-coded underlined links
   - `.entity-link` base: inline, underline, font-medium
   - `.entity-link--hero`: primary/gold color
   - `.entity-link--skill`: purple color
   - `.entity-link--item`: green color
   - `.entity-link--material`: amber color
   - Hover: brighten + show a subtle glow

4. **Wire up client-side navigation** — since these are standard `<a href>` tags pointing to internal routes, React Router will handle them naturally with full page transitions. For SPA navigation, we can optionally add a click interceptor component wrapping the markdown output, or simply rely on `<a>` tags (works fine for content pages).

5. **Add a "Markup Reference" section to AdminDocs** — document the syntax for content authors so they know how to use `[hero:slug]` etc.

### Technical Details

- **Regex pattern**: `/\[(hero|skill|item|material):([a-z0-9-]+)\]/g`
- **rehype-raw**: New dependency needed (`rehype-raw`) to allow raw HTML in Markdown output. MDEditor.Markdown accepts `rehypePlugins={[rehypeRaw]}`.
- **No DB queries needed at render time** — display names are derived from slugs. This keeps the preprocessor synchronous and avoids waterfall fetches.
- **Editor preview**: The admin MDEditor could also use the same preprocessor for live preview, but that's a follow-up enhancement.

### Example

Author writes:
```markdown
To beat this boss, equip [hero:sun-wukong] with [item:iron-sword] and use [skill:phoenix-strike] for maximum damage.
```

Renders as:
> To beat this boss, equip **Sun Wukong** with **Iron Sword** and use **Phoenix Strike** for maximum damage.

Where each name is a colored, clickable link to the respective database page.

