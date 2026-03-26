import React from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminHeaderProvider, useAdminHeader } from "@/hooks/useAdminHeader";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  Newspaper, BookOpen, MessageSquare, FileText, Map, LogOut, MessageCircle, BarChart3,
  Users, Settings, FileQuestion, ExternalLink, PenTool, Search, Database, Layers,
  ChevronRight, Clock, GitPullRequest, Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchemaRegistry } from "@/hooks/useSchemaRegistry";
import { formatTableLabel } from "@/lib/format-label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";


const contentItems = [
  { title: "News", url: "/admin/news", icon: Newspaper },
  { title: "Guides", url: "/admin/guides", icon: BookOpen },
  { title: "Official Posts", url: "/admin/official-posts", icon: MessageSquare },
  { title: "Tier List", url: "/admin/tier-list", icon: BarChart3 },
  { title: "Authors", url: "/admin/authors", icon: PenTool },
  { title: "Changelog", url: "/admin/changelog", icon: FileText },
  { title: "Roadmap", url: "/admin/roadmap", icon: Map },
];

const insightItems = [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Activity Log", url: "/admin/activity", icon: Clock },
  { title: "Contributions", url: "/admin/contributions", icon: GitPullRequest },
  { title: "Feedback", url: "/admin/feedback", icon: MessageCircle },
];

const platformItems = [
  { title: "SEO", url: "/admin/seo", icon: Search },
  { title: "Redirects", url: "/admin/redirects", icon: ExternalLink },
  { title: "Users", url: "/admin/platform", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Entity Editor", url: "/admin/entity-editor", icon: Database },
  { title: "Docs", url: "/admin/docs", icon: FileQuestion },
];

const systemTableItems = [
  { title: "Profiles", url: "/admin/data/profiles", icon: Server },
  { title: "User Roles", url: "/admin/data/user_roles", icon: Server },
  { title: "Site Settings", url: "/admin/data/site_settings", icon: Server },
  { title: "Entity Definitions", url: "/admin/data/entity_definitions", icon: Server },
  { title: "Contributions", url: "/admin/data/contributions", icon: Server },
  { title: "SEO Templates", url: "/admin/data/seo_templates", icon: Server },
  { title: "Site Changelog", url: "/admin/data/site_changelog", icon: Server },
  { title: "Roadmap Items", url: "/admin/data/roadmap_items", icon: Server },
  { title: "Feedback", url: "/admin/data/feedback", icon: Server },
  { title: "Page Views", url: "/admin/data/page_views", icon: Server },
  { title: "News Articles", url: "/admin/data/news_articles", icon: Server },
  { title: "News Comments", url: "/admin/data/news_comments", icon: Server },
  { title: "Official Posts", url: "/admin/data/official_posts", icon: Server },
  { title: "Guides", url: "/admin/data/guides", icon: Server },
  { title: "Authors", url: "/admin/data/authors", icon: Server },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { schemas, isJunction } = useSchemaRegistry();

  // Pending contributions count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-contributions-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contributions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000, // refresh every 30s
  });
  const seen = new Set<string>();
  const collectionItems = schemas.flatMap((s) =>
    s.tables
      .filter((t) => !isJunction(t.name))
      .filter((t) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      })
      .map((t) => ({
        title: formatTableLabel(t.label),
        url: `/admin/data/${t.name}`,
        icon: Layers,
      }))
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {collectionItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Collections</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {collectionItems.map((item) => (
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
        )}
        {/* System tables — admin only */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemTableItems.map((item) => (
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
        )}
        {/* Content, Insights, Platform sections — admin only */}
        {isAdmin && (
          <>
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
                          {!collapsed && item.url === "/admin/contributions" && pendingCount > 0 && (
                            <Badge className="ml-auto bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs px-1.5 py-0">
                              {pendingCount}
                            </Badge>
                          )}
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
          </>
        )}
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
  const { breadcrumbs, actions } = useAdminHeader();

  return (
    <header className="h-12 flex items-center border-b border-border px-4 gap-4">
      <SidebarTrigger />
      {breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Admin
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              {crumb.href ? (
                <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : (
        <span className="font-display font-bold text-sm">Admin</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="sm" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer">
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
  const { isAdmin, isContributor, canAccessAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  if (authLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!canAccessAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-display font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin or contributor privileges to access this area.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminHeaderProvider>
        <div className="h-screen flex w-full overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-h-0">
            <AdminHeader />
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </AdminHeaderProvider>
    </SidebarProvider>
  );
}
