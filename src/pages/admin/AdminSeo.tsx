import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RefreshCw, Copy, Check, Send, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

const columns: ColumnConfig[] = [
  {
    key: "entity_type",
    label: "Entity Type",
    required: true,
    type: "select",
    options: [
      { value: "hero", label: "Hero" },
      { value: "imprint", label: "Imprint" },
      { value: "weapon", label: "Weapon" },
      { value: "skill", label: "Skill" },
    ],
  },
  { key: "title_template", label: "Title Template" },
  { key: "description_template", label: "Description Template", type: "textarea" },
  { key: "updated_at", label: "Updated", type: "datetime", editable: false, showInTable: true },
];

const variableReference: Record<string, string[]> = {
  hero: ["name", "element", "class_type", "rarity", "rarity_label", "description", "subtitle", "faction", "archetype"],
  imprint: ["name", "rarity", "rarity_label", "passive"],
  weapon: ["name", "rarity", "passive", "faction", "rank"],
  skill: ["name", "skill_type", "description"],
};

export default function AdminSeo() {
  const [sitemapXml, setSitemapXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // IndexNow state
  const [indexNowUrls, setIndexNowUrls] = useState("");
  const [indexNowLoading, setIndexNowLoading] = useState(false);
  const [indexNowResult, setIndexNowResult] = useState<string | null>(null);

  const regenerateSitemap = async () => {
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/sitemap`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      setSitemapXml(xml);
      toast.success(`Sitemap generated with ${(xml.match(/<url>/g) || []).length} URLs`);
    } catch (err: any) {
      toast.error("Failed to generate sitemap: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(sitemapXml);
    setCopied(true);
    toast.success("Sitemap XML copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const pingIndexNow = async () => {
    const urls = indexNowUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      toast.error("Enter at least one URL");
      return;
    }

    setIndexNowLoading(true);
    setIndexNowResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("index-now", {
        body: { urls },
      });
      if (error) throw error;
      setIndexNowResult(JSON.stringify(data, null, 2));
      toast.success(`Pinged ${data.urlCount} URL(s) to ${data.engines?.length} engines`);
    } catch (err: any) {
      toast.error("IndexNow failed: " + err.message);
      setIndexNowResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIndexNowLoading(false);
    }
  };

  const pingAllContent = async () => {
    setIndexNowLoading(true);
    setIndexNowResult(null);
    try {
      // Fetch all slugs from main tables
      const [heroes, skills, imprints, weapons, armorSets, bosses, news, guides, mechanics] =
        await Promise.all([
          supabase.from("heroes").select("slug").order("slug"),
          supabase.from("skills").select("slug").order("slug"),
          supabase.from("imprints").select("slug").order("slug"),
          supabase.from("weapons").select("slug").order("slug"),
          supabase.from("armor_sets").select("slug").order("slug"),
          supabase.from("bosses").select("slug").order("slug"),
          supabase.from("news_articles").select("slug").eq("published", true).order("slug"),
          supabase.from("guides").select("slug").eq("published", true).order("slug"),
          supabase.from("mechanics").select("slug").order("slug"),
        ]);

      const urls: string[] = [
        "/",
        "/news",
        "/database",
        "/database/heroes",
        "/database/skills",
        "/database/imprints",
        "/database/weapons",
        "/database/armor-sets",
        "/database/mechanics",
        "/bosses",
        "/guides",
        "/community",
        "/tools",
      ];

      for (const r of heroes.data || []) urls.push(`/database/heroes/${r.slug}`);
      for (const r of skills.data || []) urls.push(`/database/skills/${r.slug}`);
      for (const r of imprints.data || []) urls.push(`/database/imprints/${r.slug}`);
      for (const r of weapons.data || []) urls.push(`/database/weapons/${r.slug}`);
      for (const r of armorSets.data || []) urls.push(`/database/armor-sets/${r.slug}`);
      for (const r of bosses.data || []) urls.push(`/bosses/${r.slug}`);
      for (const r of news.data || []) urls.push(`/news/${r.slug}`);
      for (const r of guides.data || []) urls.push(`/guides/${r.slug}`);
      for (const r of mechanics.data || []) urls.push(`/database/mechanics/${r.slug}`);

      // IndexNow allows max 10,000 per batch
      const { data, error } = await supabase.functions.invoke("index-now", {
        body: { urls },
      });
      if (error) throw error;
      setIndexNowResult(JSON.stringify(data, null, 2));
      toast.success(`Pinged ${data.urlCount} URL(s) to ${data.engines?.length} engines`);
    } catch (err: any) {
      toast.error("IndexNow failed: " + err.message);
      setIndexNowResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIndexNowLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCrudPage
        tableName="seo_templates"
        title="SEO Templates"
        columns={columns}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Template Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">{"{variable_name}"}</code> in your templates. They'll be replaced with the entity's actual data.
          </p>
          {Object.entries(variableReference).map(([type, vars]) => (
            <div key={type}>
              <span className="font-medium capitalize">{type}:</span>{" "}
              <span className="text-muted-foreground">
                {vars.map((v) => `{${v}}`).join(", ")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> IndexNow — Instant Search Engine Ping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Notify Bing, Yandex, and other IndexNow-compatible engines about new or updated URLs instantly. Enter URLs (one per line, relative paths like <code className="bg-muted px-1 rounded">/database/heroes/hel</code> work), or ping all content at once.
          </p>
          <Textarea
            placeholder={"/database/heroes/hel\n/news/my-new-article\n/guides/beginner-guide"}
            value={indexNowUrls}
            onChange={(e) => setIndexNowUrls(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={pingIndexNow} disabled={indexNowLoading} variant="outline">
              <Send className={`mr-2 h-4 w-4 ${indexNowLoading ? "animate-spin" : ""}`} />
              {indexNowLoading ? "Pinging..." : "Ping URLs"}
            </Button>
            <Button onClick={pingAllContent} disabled={indexNowLoading} variant="outline">
              <Zap className={`mr-2 h-4 w-4 ${indexNowLoading ? "animate-spin" : ""}`} />
              {indexNowLoading ? "Pinging..." : "Ping All Content"}
            </Button>
          </div>
          {indexNowResult && (
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {indexNowResult}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Regenerate Sitemap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a fresh <code className="bg-muted px-1 rounded">sitemap.xml</code> from the database. Copy the output and share it to update the static file at <code className="bg-muted px-1 rounded">public/sitemap.xml</code>.
          </p>
          <div className="flex gap-2">
            <Button onClick={regenerateSitemap} disabled={loading} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Generating..." : "Generate Sitemap"}
            </Button>
            {sitemapXml && (
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied!" : "Copy XML"}
              </Button>
            )}
          </div>
          {sitemapXml && (
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {sitemapXml}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
