import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, ListOrdered, Users, Calculator } from "lucide-react";
import { Link } from "react-router-dom";

const tools = [
  {
    name: "Tier List Viewer",
    description: "View and compare hero tier rankings based on community and meta analysis.",
    icon: <ListOrdered className="h-8 w-8" />,
    href: "/tools/tier-list",
    status: "Coming Soon",
  },
  {
    name: "Team Builder",
    description: "Build and share team compositions with synergy analysis.",
    icon: <Users className="h-8 w-8" />,
    href: "/tools/team-builder",
    status: "Available",
  },
  {
    name: "Resource Calculator",
    description: "Plan your material needs for hero upgrades and equipment crafting.",
    icon: <Calculator className="h-8 w-8" />,
    href: "/tools/resource-calculator",
    status: "Coming Soon",
  },
];

const ToolsPage = () => {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <Wrench className="h-7 w-7 text-primary" /> Tools
        </h1>
        <p className="text-muted-foreground mb-6">Interactive tools to help you plan and optimize.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card key={tool.name} className="relative overflow-hidden hover:border-primary/30 transition-colors">
              <div className="absolute top-3 right-3">
                <span className={`text-xs px-2 py-1 rounded-full ${tool.status === "Available" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{tool.status}</span>
              </div>
              {tool.status === "Available" ? (
                <Link to={tool.href}>
                  <CardContent className="p-6 pt-8">
                    <div className="text-primary mb-4">{tool.icon}</div>
                    <h3 className="font-display font-semibold text-lg mb-2">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Link>
              ) : (
                <CardContent className="p-6 pt-8">
                  <div className="text-primary mb-4">{tool.icon}</div>
                  <h3 className="font-display font-semibold text-lg mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ToolsPage;
