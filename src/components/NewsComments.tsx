import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, MessageSquare, LogIn } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; email: string | null } | null;
}

export function NewsComments({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["news_comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_comments")
        .select("id, content, created_at, user_id")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for comment authors
      const userIds = [...new Set((data || []).map((c) => c.user_id))];
      let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
        }
      }

      return (data || []).map((c) => ({
        ...c,
        profile: profilesMap[c.user_id] || null,
      })) as Comment[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`news_comments_${articleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news_comments", filter: `article_id=eq.${articleId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["news_comments", articleId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [articleId, queryClient]);

  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("news_comments")
        .insert({ article_id: articleId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["news_comments", articleId] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to post comment", description: err.message, variant: "destructive" });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("news_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news_comments", articleId] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete comment", description: err.message, variant: "destructive" });
    },
  });

  const getDisplayName = (comment: Comment) => {
    if (comment.profile?.display_name) return comment.profile.display_name;
    if (comment.profile?.email) return comment.profile.email.split("@")[0];
    return "User";
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Comment form */}
      {user ? (
        <div className="mb-8">
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-3 min-h-[80px] bg-muted/30"
          />
          <Button
            onClick={() => newComment.trim() && postComment.mutate(newComment.trim())}
            disabled={!newComment.trim() || postComment.isPending}
            size="sm"
          >
            {postComment.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-border bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Sign in to join the discussion</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth"><LogIn className="h-4 w-4 mr-1" /> Sign In</Link>
          </Button>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const name = getDisplayName(comment);
            const canDelete = user?.id === comment.user_id || isAdmin;
            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-auto"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
