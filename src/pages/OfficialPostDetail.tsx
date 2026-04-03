import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Newspaper, BookOpen, ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

const sourceIcons: Record<string, React.ReactNode> = {
  Discord: <MessageSquare className="h-4 w-4" />,
  Twitter: <Newspaper className="h-4 w-4" />,
  Forum: <BookOpen className="h-4 w-4" />,
};

const OfficialPostDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["official_post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
          <p className="text-muted-foreground">Post not found.</p>
          <Button variant="outline" asChild className="mt-4">
            <Link to="/official-posts">Back to Official Posts</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const title = post.title || `Post by ${post.author}`;

  return (
    <Layout>
      <SEO
        title={title}
        description={post.content?.slice(0, 160) || "Official post from the Void Hunters team."}
      />
      <div className="container py-8 max-w-3xl">
        <Link
          to="/official-posts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Official Posts
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-primary">
                {sourceIcons[post.source] || <MessageSquare className="h-4 w-4" />}
              </span>
              <span className="font-semibold">{post.author}</span>
              {post.author_role && (
                <span className="text-xs text-muted-foreground">· {post.author_role}</span>
              )}
              {post.is_edited && (
                <span className="text-xs text-muted-foreground italic">(edited)</span>
              )}
            </div>

            {post.title && (
              <h1 className="font-display text-2xl font-bold mb-4">{post.title}</h1>
            )}

            {post.image_url && (
              <img
                src={post.image_url}
                alt={post.title || "Post image"}
                className="rounded-md mb-4 max-h-96 object-cover w-full"
              />
            )}

            <div className="prose prose-invert prose-sm max-w-none mb-4">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border">
              <Badge variant="outline" className="text-xs">{post.source}</Badge>
              {post.channel_name && (
                <Badge variant="secondary" className="text-xs">#{post.channel_name}</Badge>
              )}
              {post.region && (
                <Badge variant="outline" className="text-xs">{post.region}</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                {post.message_url && (
                  <a
                    href={post.message_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View original <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {format(new Date(post.posted_at), "PPP")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OfficialPostDetail;
