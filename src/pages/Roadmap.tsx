import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapIcon, Circle, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  planned: { label: "Planned", icon: <Circle className="h-4 w-4" />, color: "bg-muted text-muted-foreground border-border" },
  in_progress: { label: "Coming Soon", icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Shipped", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-500/10 text-green-400 border-green-500/20" },
};

const RoadmapPage = () => {
  const { data: items, isLoading } = useQuery({
    queryKey: ["roadmap_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const grouped = {
    in_progress: items?.filter((i) => i.status === "in_progress") || [],
    planned: items?.filter((i) => i.status === "planned") || [],
    completed: items?.filter((i) => i.status === "completed") || [],
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <MapIcon className="h-7 w-7 text-primary" /> Roadmap
        </h1>
        <p className="text-muted-foreground mb-8">See what's planned, in progress, and completed for Godforge Hub.</p>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {(["planned", "in_progress", "completed"] as const).map((status) => {
              const config = statusConfig[status];
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className={`${config.color} text-sm px-3 py-1`}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
                  </div>
                  <div className="space-y-3">
                    {grouped[status].map((item) => (
                      <Card key={item.id} className="hover:border-primary/20 transition-colors">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {item.category && (
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            )}
                            {item.target_date && (
                              <span className="text-xs text-muted-foreground">{item.target_date}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {grouped[status].length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                        Nothing here yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MapIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No roadmap items yet. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default RoadmapPage;
