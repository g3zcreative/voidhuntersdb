import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Newspaper, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";
import ReactMarkdown from "react-markdown";

const sourceIcons: Record<string, React.ReactNode> = {
  Discord: <MessageSquare className="h-4 w-4" />,
  Twitter: <Newspaper className="h-4 w-4" />,
  Forum: <BookOpen className="h-4 w-4" />,
};

const OfficialPostsPage = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["official_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_posts")
        .select("*")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <SEO title="Official Posts" description="Official communications from the Void Hunters development team." />
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" /> Official Posts
        </h1>
        <p className="text-muted-foreground mb-6">Official communications from the Void Hunters team.</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/official-posts/${post.id}`} className="block group">
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary">{sourceIcons[post.source] || <MessageSquare className="h-4 w-4" />}</span>
                    <span className="text-sm font-semibold">{post.author}</span>
                    {post.author_role && <span className="text-xs text-muted-foreground">· {post.author_role}</span>}
                    {post.is_edited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
                  </div>
                  {post.title && <h2 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">{post.title}</h2>}
                  {post.image_url && (
                    <img src={post.image_url} alt={post.title || "Post image"} className="rounded-md mb-3 max-h-64 object-cover w-full" />
                  )}
                  <div className="text-sm text-foreground mb-3 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{post.source}</Badge>
                    {post.channel_name && <Badge variant="secondary" className="text-xs">#{post.channel_name}</Badge>}
                    {post.region && <Badge variant="outline" className="text-xs">{post.region}</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                      {post.message_url && (
                        <a href={post.message_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View original
                        </a>
                      )}
                      {format(new Date(post.posted_at), "PPP")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No official posts yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default OfficialPostsPage;
