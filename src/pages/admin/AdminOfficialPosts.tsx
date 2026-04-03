import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CreationMode = "picker" | "discord" | null;

export default function AdminOfficialPosts() {
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
    { key: "title", label: "Title", showInTable: true },
    { key: "author", label: "Author", type: "select", options: authorOptions, required: true, showInTable: true },
    { key: "author_role", label: "Author Role", showInTable: true },
    { key: "source", label: "Source", showInTable: true },
    { key: "channel_name", label: "Channel Name", showInTable: true },
    { key: "content", label: "Content", type: "markdown", required: true, showInTable: true },
    { key: "image_url", label: "Image URL" },
    { key: "message_url", label: "Message URL" },
    { key: "region", label: "Region" },
    { key: "posted_at", label: "Posted At", type: "datetime" },
    { key: "is_edited", label: "Edited", type: "boolean" },
  ];

  const [mode, setMode] = useState<CreationMode>(null);
  const [discordUrl, setDiscordUrl] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [channelName, setChannelName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, unknown> | undefined>();
  const [triggerCreate, setTriggerCreate] = useState(0);
  const { toast } = useToast();

  const openPicker = () => setMode("picker");

  const parseDiscordUrl = (url: string) => {
    const match = url.match(/discord\.com\/channels\/\d+\/\d+\/(\d+)/);
    return {
      discord_message_id: match?.[1] || null,
      message_url: url.trim() || null,
    };
  };

  const generateFromDiscord = async () => {
    if (!messageContent.trim()) return;
    setIsGenerating(true);
    try {
      const { discord_message_id, message_url } = parseDiscordUrl(discordUrl);

      const { data, error } = await supabase.functions.invoke("generate-official-post", {
        body: {
          content: messageContent.trim(),
          author: authorName.trim() || undefined,
          author_role: authorRole.trim() || undefined,
          channel_name: channelName.trim() || undefined,
          message_url,
          discord_message_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDefaults({
        title: data.title || "",
        content: data.content || messageContent,
        image_url: data.image_url || null,
        author: data.author || authorName.trim() || "",
        author_role: data.author_role || authorRole.trim() || "",
        channel_name: data.channel_name || channelName.trim() || "",
        message_url: data.message_url || discordUrl.trim() || "",
        discord_message_id: data.discord_message_id || null,
        source: "Discord",
        posted_at: new Date().toISOString(),
        is_edited: false,
      });
      setTriggerCreate((t) => t + 1);
      setMode(null);
      resetForm();
      toast({ title: "Post generated!", description: "Review and edit before saving." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setDiscordUrl("");
    setMessageContent("");
    setAuthorName("");
    setAuthorRole("");
    setChannelName("");
  };

  return (
    <>
      <AdminCrudPage
        tableName="official_posts"
        title="Official Posts"
        columns={columns}
        defaults={defaults}
        onNewOverride={openPicker}
        triggerCreate={triggerCreate}
      />

      {/* Mode Picker */}
      <Dialog open={mode === "picker"} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Official Post</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("discord")}>
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">From Discord Message</span>
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

      {/* From Discord */}
      <Dialog open={mode === "discord"} onOpenChange={(open) => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post from Discord Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Discord Message URL</Label>
              <Input
                type="url"
                placeholder="https://discord.com/channels/..."
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Message Content <span className="text-destructive">*</span></Label>
              <Textarea
                rows={6}
                placeholder="Paste the Discord message content here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Author Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. CM_Jane"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Author Role <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Community Manager"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Channel Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. announcements"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={generateFromDiscord} disabled={isGenerating || !messageContent.trim()}>
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating post...</>
              ) : (
                <><MessageSquare className="mr-2 h-4 w-4" /> Generate Post</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
