import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const categoryColors: Record<string, string> = {
  "Patch Notes": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Events: "bg-green-500/10 text-green-400 border-green-500/20",
  Updates: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Dev Updates": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Community: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Announcements: "bg-primary/10 text-primary border-primary/20",
};

const NewsPage = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["news_articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <Newspaper className="h-7 w-7 text-primary" /> News
        </h1>
        <p className="text-muted-foreground mb-6">Latest updates from the world of Void Hunters.</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>a]:mb-5">
            {articles.map((article) => (
              <Link key={article.id} to={`/news/${article.slug}`} className="group break-inside-avoid block">
                <Card className="hover:border-primary/30 transition-colors overflow-hidden flex flex-col">
                  {(article.image_url || article.video_url) && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={article.image_url || `https://img.youtube.com/vi/${(article.video_url!.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/) || [])[1]}/hqdefault.jpg`}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={categoryColors[article.category] || ""}>
                        {article.category}
                      </Badge>
                    </div>
                    <h2 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.excerpt}</p>
                    )}
                    {article.published_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto pt-2">
                        <Clock className="h-3 w-3" /> {new Date(article.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No news articles yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default NewsPage;
