import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] || "";
}

const categoryColors: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-400 border-green-500/20",
  Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
  Strategy: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Team Building": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Hero Guide": "bg-primary/10 text-primary border-primary/20",
  Tips: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const GuidesPage = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
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
          <BookOpen className="h-7 w-7 text-primary" /> Guides
        </h1>
        <p className="text-muted-foreground mb-6">Community guides and strategies for Void Hunters.</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : guides && guides.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>a]:mb-5">
            {guides.map((guide) => (
              <Link key={guide.id} to={`/guides/${guide.slug}`} className="group break-inside-avoid block">
                <Card className="hover:border-primary/30 transition-colors overflow-hidden flex flex-col">
                  {(guide.image_url || (guide as any).video_url) && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={guide.image_url || `https://img.youtube.com/vi/${extractYouTubeId((guide as any).video_url)}/hqdefault.jpg`}
                        alt={guide.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={categoryColors[guide.category] || ""}>
                        {guide.category}
                      </Badge>
                    </div>
                    <h2 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {guide.title}
                    </h2>
                    {guide.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{guide.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2">
                      <span>by {guide.author}</span>
                      {guide.published_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(guide.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No guides yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default GuidesPage;
