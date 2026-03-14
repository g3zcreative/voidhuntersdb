import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Star, MessageCircle } from "lucide-react";

export default function AdminAnalytics() {
  const { data: activeUsers, isLoading: loadingActive } = useQuery({
    queryKey: ["analytics", "active-users"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("session_id")
        .gte("created_at", fiveMinAgo);
      const unique = new Set(data?.map((r) => r.session_id));
      return unique.size;
    },
    refetchInterval: 30000,
  });

  const { data: visitors28d, isLoading: loadingVisitors } = useQuery({
    queryKey: ["analytics", "visitors-28d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("session_id")
        .gte("created_at", since);
      const unique = new Set(data?.map((r) => r.session_id));
      return unique.size;
    },
  });

  const { data: avgRating, isLoading: loadingRating } = useQuery({
    queryKey: ["analytics", "avg-rating"],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("rating");
      if (!data || data.length === 0) return null;
      const sum = data.reduce((a, r) => a + r.rating, 0);
      return (sum / data.length).toFixed(1);
    },
  });

  const { data: feedbackCount, isLoading: loadingCount } = useQuery({
    queryKey: ["analytics", "feedback-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("feedback")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const cards = [
    {
      title: "Active Now",
      value: activeUsers,
      loading: loadingActive,
      icon: Users,
      description: "Unique sessions in last 5 min",
    },
    {
      title: "Visitors (28d)",
      value: visitors28d,
      loading: loadingVisitors,
      icon: Eye,
      description: "Unique sessions in last 28 days",
    },
    {
      title: "Avg. Rating",
      value: avgRating ?? "—",
      loading: loadingRating,
      icon: Star,
      description: "Average feedback score (1–5)",
    },
    {
      title: "Feedback",
      value: feedbackCount,
      loading: loadingCount,
      icon: MessageCircle,
      description: "Total feedback submissions",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Analytics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {card.loading ? "…" : card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
