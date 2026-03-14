import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";

const rarityStars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));

export default function ItemDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const stats = item?.stats as Record<string, number> | null;

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        <DatabaseBreadcrumb segments={[{ label: "Items", href: "/database/items" }, { label: item?.name || "..." }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !item ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Item not found</h1>
            <p className="text-muted-foreground">This item doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO
              title={item.name}
              description={item.description || `${item.name} - ${item.rarity}★ ${item.item_type}`}
              image={item.image_url || undefined}
              url={`/database/items/${item.slug}`}
              jsonLd={{
                "@context": "https://schema.org",
                "@type": "Thing",
                name: item.name,
                description: item.description || `${item.name} - ${item.rarity}★ ${item.item_type}`,
                ...(item.image_url ? { image: item.image_url } : {}),
              }}
            />
            <div className="flex items-center gap-3 mb-4">
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-3xl font-display font-bold">{item.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{item.item_type}</Badge>
                  <span className="text-primary text-sm">{rarityStars(item.rarity)}</span>
                </div>
              </div>
            </div>

            {item.description && (
              <p className="text-muted-foreground mb-4">{item.description}</p>
            )}

            {item.obtain_method && (
              <p className="text-sm mb-6">
                <span className="text-muted-foreground">How to obtain:</span>{" "}
                <span className="font-medium">{item.obtain_method}</span>
              </p>
            )}

            {stats && Object.keys(stats).length > 0 && (
              <div>
                <h2 className="text-xl font-display font-semibold mb-3">Stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(stats).map(([key, val]) => (
                    <div key={key} className="rounded-lg border border-border p-3 text-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{key.replace(/_/g, " ")}</span>
                      <p className="text-xl font-bold text-primary">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
