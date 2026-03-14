import { useState } from "react";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = ["Beginner", "Tier Lists", "Team Building", "Farming", "Advanced"];

type CreationMode = "picker" | "video" | null;

export default function AdminGuides() {
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

  const columns: ColumnConfig[] = [
    { key: "title", label: "Title", required: true, showInTable: true },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    { key: "author", label: "Author", type: "select", options: authorOptions, required: true, showInTable: true },
    { key: "category", label: "Category", showInTable: true },
    { key: "published", label: "Published", type: "boolean", showInTable: true },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "content", label: "Content", type: "markdown" },
    { key: "image_url", label: "Feature Image", type: "image", storageBucket: "guide-images" },
    { key: "video_url", label: "Video URL" },
    { key: "published_at", label: "Published At", type: "datetime" },
  ];

  const [mode, setMode] = useState<CreationMode>(null);
  const [selectedCategory, setSelectedCategory] = useState("Beginner");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoContext, setVideoContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, unknown> | undefined>();
  const [triggerCreate, setTriggerCreate] = useState(0);
  const { toast } = useToast();
  const openPicker = () => setMode("picker");

  const generateFromVideo = async () => {
    if (!videoUrl.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-guide", {
        body: { videoUrl, category: selectedCategory, prompt: videoContext || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDefaults({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        author: data.author || "",
        category: selectedCategory,
        published: false,
        published_at: new Date().toISOString(),
      });
      setTriggerCreate((t) => t + 1);
      setMode(null);
      setVideoUrl("");
      setVideoContext("");
      toast({ title: "Guide draft generated!", description: "Review and edit before publishing." });
    } catch (e: any) {
      toast({ title: "Video generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <AdminCrudPage
        tableName="guides"
        title="Guides"
        columns={columns}
        defaults={defaults}
        onNewOverride={openPicker}
        triggerCreate={triggerCreate}
      />

      {/* Mode Picker */}
      <Dialog open={mode === "picker"} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Guide</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("video")}>
              <Video className="h-6 w-6" />
              <span className="text-sm">From Video URL</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => {
                setDefaults(undefined);
                setTriggerCreate((t) => t + 1);
                setMode(null);
              }}
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">Blank</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* From Video */}
      <Dialog open={mode === "video"} onOpenChange={(open) => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Guide from Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
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
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Additional context <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                rows={3}
                placeholder="E.g. focus on the team comp, skip the intro section..."
                value={videoContext}
                onChange={(e) => setVideoContext(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={generateFromVideo} disabled={isGenerating || !videoUrl.trim()}>
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing video...</>
              ) : (
                <><Video className="mr-2 h-4 w-4" /> Generate Guide</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
