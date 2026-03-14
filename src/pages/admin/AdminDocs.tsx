import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function AdminDocs() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Admin Docs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Internal reference for content management conventions and best practices.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="changelog">
          <AccordionTrigger className="text-base font-semibold">
            Changelog &amp; Versioning
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              We use <strong className="text-foreground">Semantic Versioning</strong> (SemVer):{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">MAJOR.MINOR.PATCH</code>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">PATCH</strong> (e.g. 1.2.3 → 1.2.4) — Bug fixes, typo corrections, minor tweaks</li>
              <li><strong className="text-foreground">MINOR</strong> (e.g. 1.2.4 → 1.3.0) — New features, new pages, new content sections</li>
              <li><strong className="text-foreground">MAJOR</strong> (e.g. 1.3.0 → 2.0.0) — Large redesigns, breaking changes, major milestones</li>
            </ul>
            <p><strong className="text-foreground">Change types:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">feature</code> — A brand-new capability</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">improvement</code> — Enhancement to existing functionality</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">bugfix</code> — Something broken that was fixed</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">new</code> — New content (heroes, items, guides added)</li>
            </ul>
            <p><strong className="text-foreground">Tips:</strong> Write titles as short action phrases (e.g. "Added hero filtering" not "We have added the ability to filter heroes"). Descriptions can be longer.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="content">
          <AccordionTrigger className="text-base font-semibold">
            Writing News &amp; Guides
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">News articles:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use a clear, descriptive title — avoid clickbait</li>
              <li>The <strong className="text-foreground">excerpt</strong> appears in cards/lists — keep it under 160 characters</li>
              <li>Body content supports full Markdown (see cheat sheet below)</li>
              <li>Categories: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">update</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">guide</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">event</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">community</code></li>
            </ul>
            <p><strong className="text-foreground">Guides:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Target a specific topic (e.g. "Best builds for Warrior class")</li>
              <li>Include an author name for attribution</li>
              <li>Set <strong className="text-foreground">published</strong> to false while drafting, flip to true when ready</li>
            </ul>
            <p><strong className="text-foreground">Slugs:</strong> Use lowercase, hyphen-separated words. Example: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">best-warrior-builds-2026</code></p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="flags">
          <AccordionTrigger className="text-base font-semibold">
            Feature Flags Reference
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Feature flags control which public sections are visible. Toggle them in <strong className="text-foreground">Settings</strong>.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">database</code> — Heroes, items, skills, and mechanics database pages</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">guides</code> — Community guides section</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">tools</code> — Interactive tools (tier lists, team builder, calculators)</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">community</code> — Community hub page</li>
            </ul>
            <p>When a flag is <strong className="text-foreground">off</strong>, visitors see a "Coming Soon" placeholder.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="roadmap">
          <AccordionTrigger className="text-base font-semibold">
            Roadmap Statuses
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">planned</code> — Accepted idea, not yet started</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">in_progress</code> — Actively being worked on</li>
              <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">completed</code> — Done and live on the site</li>
            </ul>
            <p>Use <strong className="text-foreground">sort_order</strong> to control display order within each status column. Lower numbers appear first.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="markdown">
          <AccordionTrigger className="text-base font-semibold">
            Markdown Cheat Sheet
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="bg-muted rounded-md p-4 font-mono text-xs space-y-2">
              <p># Heading 1</p>
              <p>## Heading 2</p>
              <p>### Heading 3</p>
              <p className="mt-2">**bold text**</p>
              <p>*italic text*</p>
              <p>~~strikethrough~~</p>
              <p className="mt-2">- Bullet list item</p>
              <p>1. Numbered list item</p>
              <p className="mt-2">[Link text](https://example.com)</p>
              <p>![Alt text](https://example.com/image.png)</p>
              <p className="mt-2">`inline code`</p>
              <p>```</p>
              <p>code block</p>
              <p>```</p>
              <p className="mt-2">&gt; Blockquote</p>
              <p>---  (horizontal rule)</p>
            </div>
            <p><strong className="text-foreground">Image URLs:</strong> Use full URLs (e.g. from a CDN or public hosting). Relative paths won't work in Markdown content fields.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="entity-markup">
          <AccordionTrigger className="text-base font-semibold">
            Entity Markup Reference
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              You can embed <strong className="text-foreground">interactive entity links</strong> directly in guide Markdown using bracket syntax. These render as color-coded, clickable links to database pages.
            </p>
            <p><strong className="text-foreground">Syntax:</strong></p>
            <div className="bg-muted rounded-md p-4 font-mono text-xs space-y-1">
              <p>[hero:sun-wukong]</p>
              <p>[skill:phoenix-strike]</p>
              <p>[item:iron-sword]</p>
              <p>[mechanic:atk-up-i]</p>
            </div>
            <p><strong className="text-foreground">Rules:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The slug after the colon must match the entity's <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">slug</code> column in the database</li>
              <li>Use lowercase, hyphen-separated words only</li>
              <li>The display name is auto-generated from the slug (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">sun-wukong</code> → Sun Wukong)</li>
            </ul>
            <p><strong className="text-foreground">Color coding:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-[hsl(37,100%,55%)]">Heroes</span> — gold</li>
              <li><span className="text-[hsl(270,70%,65%)]">Skills</span> — purple</li>
              <li><span className="text-[hsl(150,60%,50%)]">Items</span> — green</li>
              <li><span className="text-[hsl(15,85%,55%)]">Mechanics</span> — amber</li>
            </ul>
            <p><strong className="text-foreground">Example:</strong></p>
            <div className="bg-muted rounded-md p-4 font-mono text-xs">
              <p>Equip [hero:sun-wukong] with [item:iron-sword] and use [skill:phoenix-strike] for maximum damage.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="writing-guides">
          <AccordionTrigger className="text-base font-semibold">
            How to Write Guides
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Guides are long-form content pieces that help players understand game mechanics, builds, and strategies. They are typically <strong className="text-foreground">generated from video URLs</strong> using the AI drafting tool in the admin panel.
            </p>
            <p><strong className="text-foreground">Workflow:</strong></p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to <strong className="text-foreground">Admin → Guides</strong> and click <strong className="text-foreground">New</strong></li>
              <li>Choose a <strong className="text-foreground">category</strong> (Beginner, Tier Lists, Team Building, Farming, Advanced)</li>
              <li>Fill in the <strong className="text-foreground">title</strong>, <strong className="text-foreground">slug</strong>, <strong className="text-foreground">author</strong>, and <strong className="text-foreground">excerpt</strong> (≤160 chars for card previews)</li>
              <li>Write or paste Markdown content in the <strong className="text-foreground">content</strong> field</li>
              <li>Set <strong className="text-foreground">published = false</strong> while drafting; flip to <strong className="text-foreground">true</strong> when ready</li>
            </ol>
            <p><strong className="text-foreground">Entity Markup:</strong></p>
            <p>
              Use bracket syntax to embed interactive database links inside guide content. These render as color-coded, clickable links with hover tooltips.
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-xs space-y-1">
              <p>[hero:sun-wukong] → <span className="text-[hsl(37,100%,55%)]">Sun Wukong</span></p>
              <p>[skill:phoenix-strike] → <span className="text-[hsl(270,70%,65%)]">Phoenix Strike</span></p>
              <p>[item:iron-sword] → <span className="text-[hsl(150,60%,50%)]">Iron Sword</span></p>
              <p>[mechanic:atk-up-ii] → <span className="text-[hsl(15,85%,55%)]">ATK Up II</span></p>
            </div>
            <p>
              Roman numerals (I–X) in slugs are automatically uppercased (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">atk-up-iii</code> → ATK Up III).
            </p>
            <p><strong className="text-foreground">Best practices:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use descriptive slugs: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">best-warrior-builds-2026</code></li>
              <li>Include entity markup links wherever you reference heroes, skills, items, or mechanics</li>
              <li>Break up long content with <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">##</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">###</code> headings</li>
              <li>Add images via full URLs: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">![alt](https://...)</code></li>
              <li>Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">published_at</code> to control the display date</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sitemap">
          <AccordionTrigger className="text-base font-semibold">
            Sitemap &amp; Google Search Console
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The sitemap is generated <strong className="text-foreground">dynamically</strong> by a backend function. It automatically includes all published news, heroes, items, and guides — no manual regeneration needed.
            </p>
            <p><strong className="text-foreground">Sitemap URL:</strong></p>
            <code className="block bg-muted px-3 py-2 rounded text-xs font-mono text-foreground break-all">
              https://yawfmtkrnewpdxjdypmc.supabase.co/functions/v1/sitemap
            </code>
            <p><strong className="text-foreground">How to submit to Google Search Console:</strong></p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to <strong className="text-foreground">Google Search Console</strong> and select the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">godforgehub.com</code> property</li>
              <li>Navigate to <strong className="text-foreground">Sitemaps</strong> in the left sidebar</li>
              <li>Paste the full sitemap URL above into the "Add a new sitemap" field</li>
              <li>Click <strong className="text-foreground">Submit</strong> — Google accepts cross-domain sitemaps for verified properties</li>
            </ol>
            <p><strong className="text-foreground">Note:</strong> Any new published content (news articles, heroes, guides, etc.) is automatically included the next time Google fetches the sitemap. No action needed from you.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
