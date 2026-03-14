import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";

const discordLinks = [
  {
    name: "Official Godforge Discord",
    description: "The official Discord server run by Fateless Games. Get news, updates, and chat with the devs.",
    url: "/discord",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    name: "GodforgeHub Community Discord",
    description: "Our community-run Discord for guides, theorycrafting, and discussion.",
    url: "/discord",
    icon: <MessageSquare className="h-6 w-6" />,
  },
];

const CommunityPage = () => {
  return (
    <Layout>
      <SEO title="Community" description="Join the Godforge community — official and fan-run Discord servers, forums, and more." />
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" /> Community
        </h1>
        <p className="text-muted-foreground mb-8">Connect with other Godforge players and stay in the loop.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {discordLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="block group">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-primary">{link.icon}</span>
                    <h2 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">{link.name}</h2>
                    <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CommunityPage;
