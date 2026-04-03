import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import MDEditor from "@uiw/react-md-editor";
import rehypeRaw from "rehype-raw";
import { SEO } from "@/components/SEO";
import { preprocessMarkup } from "@/lib/guide-markup";
import { GuideEntityTooltip } from "@/components/GuideEntityTooltip";

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] || "";
}

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: guide, isLoading } = useQuery({
    queryKey: ["guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Guides
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !guide ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Guide not found</h1>
            <p className="text-muted-foreground">This guide may have been removed or isn't published yet.</p>
          </div>
        ) : (
          <>
            <SEO
              title={guide.title}
              description={guide.excerpt || undefined}
              type="article"
              url={`/guides/${guide.slug}`}
              jsonLd={{
                "@context": "https://schema.org",
                "@type": "Article",
                headline: guide.title,
                ...(guide.excerpt ? { description: guide.excerpt } : {}),
                author: { "@type": "Person", name: guide.author },
                ...(guide.published_at ? { datePublished: guide.published_at } : {}),
              }}
            />
            <Badge variant="outline" className="mb-3">{guide.category}</Badge>
            <h1 className="text-3xl font-display font-bold mb-2">{guide.title}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              by {guide.author}
              {guide.published_at && ` · ${format(new Date(guide.published_at), "PPP")}`}
            </p>
            {(guide as any).video_url ? (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Watch Instead:</h2>
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId((guide as any).video_url)}`}
                    title={guide.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (guide as any).image_url ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg mb-6">
                <img
                  src={(guide as any).image_url}
                  alt={guide.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            {guide.content && (
              <div className="[&_.wmde-markdown]:!bg-transparent" data-color-mode="dark">
                <MDEditor.Markdown
                  source={preprocessMarkup(guide.content)}
                  rehypePlugins={[rehypeRaw]}
                  className="!bg-transparent !text-foreground"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
