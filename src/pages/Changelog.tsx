import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Bug, Sparkles, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const changeTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  feature: { icon: <Sparkles className="h-4 w-4" />, color: "bg-green-500/10 text-green-400 border-green-500/20" },
  improvement: { icon: <Wrench className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  bugfix: { icon: <Bug className="h-4 w-4" />, color: "bg-red-500/10 text-red-400 border-red-500/20" },
  new: { icon: <Plus className="h-4 w-4" />, color: "bg-primary/10 text-primary border-primary/20" },
};

const ChangelogPage = () => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["site_changelog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_changelog")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <History className="h-7 w-7 text-primary" /> Changelog
        </h1>
        <p className="text-muted-foreground mb-8">See what's new and improved on VoidHuntersDB.</p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-6">
              {entries.map((entry) => {
                const config = changeTypeConfig[entry.change_type] || changeTypeConfig.improvement;
                return (
                  <div key={entry.id} className="relative pl-10">
                    <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          {entry.version && (
                            <span className="text-xs font-mono text-primary font-semibold">v{entry.version}</span>
                          )}
                          <Badge variant="outline" className={config.color}>
                            {config.icon}
                            <span className="ml-1 capitalize">{entry.change_type}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(entry.published_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1">{entry.title}</h3>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No changelog entries yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ChangelogPage;
