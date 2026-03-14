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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchemaRegistry } from "@/hooks/useSchemaRegistry";


const contentItems = [
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
  const { schemas } = useSchemaRegistry();

  // Build dynamic collection nav items from deployed schemas
  const collectionItems = schemas.flatMap((s) =>
    s.tables.map((t) => ({
      title: t.label.charAt(0).toUpperCase() + t.label.slice(1),
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
