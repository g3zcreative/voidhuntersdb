import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Sparkles, Link, Plus, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getColumns = (authorOptions: { value: string; label: string }[]): ColumnConfig[] => [
  { key: "title", label: "Title", required: true, showInTable: true },
  { key: "slug", label: "Slug", required: true, showInTable: true },
  { key: "author", label: "Author", type: "select", options: authorOptions, showInTable: true },
  { key: "category", label: "Category", showInTable: true },
  { key: "published", label: "Published", type: "boolean", showInTable: true },
  { key: "excerpt", label: "Excerpt", type: "textarea" },
  { key: "content", label: "Content", type: "markdown" },
  { key: "image_url", label: "Feature Image", type: "image", storageBucket: "news-images" },
  { key: "video_url", label: "Video URL" },
  { key: "published_at", label: "Published At", type: "datetime" },
];

const TEMPLATES: Record<string, { title: string; excerpt: string; content: string; category: string }> = {
  "Patch Notes": {
    title: "Patch X.X.X Notes",
    excerpt: "Summary of the latest patch changes.",
    category: "Patch Notes",
    content: `## Patch X.X.X Overview

Brief description of this patch.

---

### ⚔️ Hero Changes

- **Hero Name** — Change description
- **Hero Name** — Change description

### 🛡️ Item Changes

- **Item Name** — Change description

### 🐛 Bug Fixes

- Fixed an issue where...
- Fixed an issue where...

### 📌 Other

- Miscellaneous change

---

*Source: [Official Patch Notes](link)*`,
  },
  "Events": {
    title: "New Event: Event Name",
    excerpt: "A new event is live! Here's everything you need to know.",
    category: "Events",
    content: `## Event Name

**Duration:** Start Date — End Date

---

### 📋 How to Participate

1. Step one
2. Step two
3. Step three

### 🎁 Rewards

| Milestone | Reward |
|-----------|--------|
| 100 pts   | Reward |
| 500 pts   | Reward |
| 1000 pts  | Reward |

### 💡 Tips

- Tip one
- Tip two

---

*Good luck, Forgers!*`,
  },
  "Dev Updates": {
    title: "Dev Update: Topic",
    excerpt: "The dev team shares what's coming next.",
    category: "Dev Updates",
    content: `## Dev Update — Topic

The development team has shared new information about upcoming features.

---

### 🔮 What's Coming

- Feature one description
- Feature two description

### 📅 Timeline

- **Month**: Milestone
- **Month**: Milestone

### 💬 Developer Quote

> "Quote from the developers about their vision."

---

*Stay tuned for more updates!*`,
  },
  "Community": {
    title: "Community Spotlight: Topic",
    excerpt: "Highlighting amazing contributions from the community.",
    category: "Community",
    content: `## Community Spotlight

This week we're highlighting amazing community contributions.

---

### 🌟 Featured

**Creator/Player Name** — Brief description of their contribution.

### 📊 Community Stats

- Stat one
- Stat two

### 🗣️ Community Feedback

Key takeaways from recent community discussions.

---

*Want to be featured? Share your content with us!*`,
  },
};

type CreationMode = "picker" | "template" | "ai" | "url" | "video" | null;

export default function AdminNews() {
  const [mode, setMode] = useState<CreationMode>(null);
  const [selectedCategory, setSelectedCategory] = useState("Patch Notes");
  const [aiPrompt, setAiPrompt] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoContext, setVideoContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, unknown> | undefined>();
  const [crudKey, setCrudKey] = useState(0);
  const { toast } = useToast();
  const [triggerCreate, setTriggerCreate] = useState(0);

  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("authors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const authorOptions = (authors ?? []).map((a) => ({
    value: a.name,
    label: `${a.name}${a.role ? ` (${a.role})` : ""}`,
  }));

  const openPicker = () => setMode("picker");

  const applyTemplate = () => {
    const tpl = TEMPLATES[selectedCategory];
    if (!tpl) return;
    setDefaults({
      title: tpl.title,
      slug: tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      excerpt: tpl.excerpt,
      content: tpl.content,
      category: tpl.category,
      published: false,
      published_at: new Date().toISOString(),
    });
    setTriggerCreate(t => t + 1);
    setMode(null);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news", {
        body: { prompt: aiPrompt, category: selectedCategory },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDefaults({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        category: selectedCategory,
        published: false,
        published_at: new Date().toISOString(),
      });
      setTriggerCreate(t => t + 1);
      setMode(null);
      toast({ title: "Draft generated!", description: "Review and edit before publishing." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news", {
        body: { url: importUrl, category: selectedCategory },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDefaults({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        category: selectedCategory,
        published: false,
        published_at: new Date().toISOString(),
      });
      setTriggerCreate(t => t + 1);
      setMode(null);
      toast({ title: "Article imported!", description: "Review and edit before publishing." });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFromVideo = async () => {
    if (!videoUrl.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news", {
        body: { videoUrl, category: selectedCategory, prompt: videoContext || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDefaults({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        category: selectedCategory,
        video_url: videoUrl,
        published: false,
        published_at: new Date().toISOString(),
      });
      setTriggerCreate(t => t + 1);
      setMode(null);
      toast({ title: "Draft generated from video!", description: "Review and edit before publishing." });
    } catch (e: any) {
      toast({ title: "Video generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <AdminCrudPage
        key={crudKey}
        tableName="news_articles"
        title="News Articles"
        columns={getColumns(authorOptions)}
        defaults={defaults}
        onNewOverride={openPicker}
        triggerCreate={triggerCreate}
      />

      {/* Mode Picker */}
      <Dialog open={mode === "picker"} onOpenChange={open => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create News Article</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("template")}>
              <FileText className="h-6 w-6" />
              <span className="text-sm">From Template</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("ai")}>
              <Sparkles className="h-6 w-6" />
              <span className="text-sm">AI Generate</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("url")}>
              <Link className="h-6 w-6" />
              <span className="text-sm">Import from URL</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("video")}>
              <Video className="h-6 w-6" />
              <span className="text-sm">From Video</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2 col-span-2" onClick={() => { setDefaults(undefined); setTriggerCreate(t => t + 1); setMode(null); }}>
              <Plus className="h-6 w-6" />
              <span className="text-sm">Blank</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Picker */}
      <Dialog open={mode === "template"} onOpenChange={open => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={applyTemplate}>Use Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate */}
      <Dialog open={mode === "ai"} onOpenChange={open => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Generate Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Key points or bullet notes</Label>
              <Textarea
                rows={5}
                placeholder={"- New hero Ember released\n- Fire element, 5-star rarity\n- Comes with a limited banner event\n- Patch also fixes PvP matchmaking bugs"}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={generateWithAI} disabled={isGenerating || !aiPrompt.trim()}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Draft</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from URL */}
      <Dialog open={mode === "url"} onOpenChange={open => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>URL to import</Label>
              <Input
                type="url"
                placeholder="https://example.com/patch-notes"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Paste a link to patch notes, dev blog, or announcement. Content will be scraped and summarized.</p>
            </div>
            <Button className="w-full" onClick={importFromUrl} disabled={isGenerating || !importUrl.trim()}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : <><Link className="mr-2 h-4 w-4" /> Import & Generate</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* From Video */}
      <Dialog open={mode === "video"} onOpenChange={open => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate from Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>YouTube URL</Label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Additional context <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                rows={3}
                placeholder="E.g. focus on the new hero reveal, skip the intro section..."
                value={videoContext}
                onChange={e => setVideoContext(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={generateFromVideo} disabled={isGenerating || !videoUrl.trim()}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing video...</> : <><Video className="mr-2 h-4 w-4" /> Generate from Video</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
