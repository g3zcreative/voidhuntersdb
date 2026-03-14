import { Outlet, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  Shield, Swords, Sparkles, FlaskConical, Newspaper,
  BookOpen, MessageSquare, FileText, Map, LogOut, MessageCircle, BarChart3,
  Users, Settings, FileQuestion, ExternalLink, Stamp, Crosshair, Flag, PenTool, Star, Search, RefreshCw, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";


const contentItems = [
  { title: "Heroes", url: "/admin/heroes", icon: Shield },
  { title: "Builds", url: "/admin/builds", icon: Star },
  { title: "Bosses", url: "/admin/bosses", icon: Swords },
  { title: "Boss Strategies", url: "/admin/boss-strategies", icon: Flag },
  { title: "Boss Skills", url: "/admin/boss-skills", icon: Sparkles },
  { title: "Skills", url: "/admin/skills", icon: Sparkles },
  { title: "Mechanics", url: "/admin/mechanics", icon: FlaskConical },
  { title: "Imprints", url: "/admin/imprints", icon: Stamp },
  { title: "Weapons", url: "/admin/weapons", icon: Crosshair },
  { title: "Factions", url: "/admin/factions", icon: Flag },
  { title: "Archetypes", url: "/admin/archetypes", icon: Swords },
  { title: "Affinities", url: "/admin/affinities", icon: Sparkles },
  { title: "Allegiances", url: "/admin/allegiances", icon: Flag },
  { title: "Armor Sets", url: "/admin/armor-sets", icon: Shield },
  { title: "Team Comps", url: "/admin/team-comps", icon: Users },
  { title: "News", url: "/admin/news", icon: Newspaper },
  { title: "Guides", url: "/admin/guides", icon: BookOpen },
  { title: "Official Posts", url: "/admin/official-posts", icon: MessageSquare },
  { title: "Authors", url: "/admin/authors", icon: PenTool },
  { title: "Changelog", url: "/admin/changelog", icon: FileText },
  { title: "Roadmap", url: "/admin/roadmap", icon: Map },
];

const insightItems = [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Feedback", url: "/admin/feedback", icon: MessageCircle },
];

const platformItems = [
  { title: "Data Sync", url: "/admin/data-sync", icon: RefreshCw },
  { title: "SEO", url: "/admin/seo", icon: Search },
  { title: "Users", url: "/admin/platform", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Entity Editor", url: "/admin/entity-editor", icon: Database },
  { title: "Docs", url: "/admin/docs", icon: FileQuestion },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {insightItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </Sidebar>
  );
}

function AdminHeader() {
  return (
    <header className="h-12 flex items-center border-b border-border px-4 gap-4">
      <SidebarTrigger />
      <span className="font-display font-bold text-sm">GodforgeHub Admin</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="https://godforgehub.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            View Live Site
          </a>
        </Button>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  if (authLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-display font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this area.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
