import { Link } from "react-router-dom";
import { Flame, Clock, Newspaper, BookOpen, MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";

const categoryColors: Record<string, string> = {
  "Patch Notes": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Events: "bg-green-500/10 text-green-400 border-green-500/20",
  Updates: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Dev Updates": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Community: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Announcements: "bg-primary/10 text-primary border-primary/20",
};

const sourceIcons: Record<string, React.ReactNode> = {
  Discord: <MessageSquare className="h-4 w-4" />,
  Twitter: <Newspaper className="h-4 w-4" />,
  Forum: <BookOpen className="h-4 w-4" />,
};

const Index = () => {
  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["news_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["posts_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_posts")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: guides, isLoading: guidesLoading } = useQuery({
    queryKey: ["guides_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <SEO rawTitle="VoidHuntersDB.com | Void Hunters Database, News, Guides & More" description="Welcome to VoidHuntersDB.com the premier source for all things Void Hunters, the upcoming hero collector RPG by Artifex Mundi." url="/" />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
            <Flame className="h-4 w-4" />
            Early Access — More features coming soon
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            VoidHunters<span className="text-primary">DB</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The premier source for all things <strong className="text-foreground">Void Hunters</strong>,
            the upcoming hero collector RPG by Artifex Mundi.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/news">Latest News</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/official-posts">Official Posts</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container py-10">
        <h2 className="font-display text-lg font-semibold text-muted-foreground mb-4">Explore</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { name: "News", href: "/news" },
            { name: "Guides", href: "/guides" },
            { name: "Official Posts", href: "/official-posts" },
            { name: "Community", href: "/community" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
            >
              <ArrowRight className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="container grid lg:grid-cols-3 gap-8 pb-12">
        {/* Recent News */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" /> Recent News
            </h2>
            <Link to="/news" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {newsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 gap-4 [&>a]:mb-4">
              {news?.map((article) => (
                <Link key={article.id} to={`/news/${article.slug}`} className="group break-inside-avoid block">
                  <Card className="hover:border-primary/30 transition-colors overflow-hidden flex flex-col">
                    {(article.image_url || article.video_url) && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={article.image_url || `https://img.youtube.com/vi/${(article.video_url!.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/) || [])[1]}/hqdefault.jpg`}
                          alt={article.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={categoryColors[article.category] || ""}>
                          {article.category}
                        </Badge>
                      </div>
                      <span className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
                        {article.title}
                      </span>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{article.excerpt}</p>
                      )}
                      {article.published_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto pt-1">
                          <Clock className="h-3 w-3" /> {format(new Date(article.published_at), "PPP")}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Official Post Tracker */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Post Tracker
            </h2>
            <Link to="/official-posts" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {posts?.map((post) => (
                <Card key={post.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary">{sourceIcons[post.source] || <MessageSquare className="h-4 w-4" />}</span>
                      <span className="text-sm font-semibold">{post.author}</span>
                      {post.author_role && <span className="text-xs text-muted-foreground">· {post.author_role}</span>}
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{post.source}</Badge>
                      {post.region && <span className="text-xs text-muted-foreground">{post.region}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
      {/* Featured Guides */}
      <section className="container pb-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Featured Guides
          </h2>
          <Link to="/guides" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {guidesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : guides && guides.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <Link key={guide.id} to={`/guides/${guide.slug}`} className="group block">
                <Card className="hover:border-primary/30 transition-colors overflow-hidden flex flex-col h-full">
                  {guide.image_url && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={guide.image_url}
                        alt={guide.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <Badge variant="outline" className="w-fit mb-2 text-xs">{guide.category}</Badge>
                    <span className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
                      {guide.title}
                    </span>
                    {guide.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{guide.excerpt}</p>
                    )}
                    <span className="text-xs text-muted-foreground mt-auto pt-1">by {guide.author}</span>
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
      </section>
    </Layout>
  );
};

export default Index;
