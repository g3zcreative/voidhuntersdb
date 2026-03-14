import { Layout } from "@/components/layout/Layout";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <Layout>
      <SEO title={`${title} - Coming Soon`} description={description} />
      <div className="container py-24 text-center max-w-lg">
        <Lock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h1 className="font-display text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Badge variant="outline" className="text-sm px-3 py-1">Coming Soon</Badge>
      </div>
    </Layout>
  );
}
