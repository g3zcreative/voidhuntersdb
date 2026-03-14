import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, User, Bookmark, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { label: "News", href: "/news" },
  { label: "Database", href: "/database" },
  { label: "Bosses", href: "/bosses" },
  { label: "Guides", href: "/guides" },
  { label: "Tools", href: "/tools", comingSoon: true },
  { label: "Community", href: "/community" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground text-sm">GF</span>
          </div>
          <span className="font-display font-bold text-lg hidden sm:inline">
            Godforge<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map((item) =>
            item.comingSoon ? (
              <span
                key={item.href}
                className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground/50 cursor-not-allowed flex items-center gap-1.5"
                title="Coming Soon"
              >
                {item.label}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground/50">Soon</Badge>
              </span>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary hover:text-foreground ${
                  location.pathname.startsWith(item.href)
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Search */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <div className="hidden sm:flex relative max-w-xs w-full">
            <GlobalSearch />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user ? (
                <>
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Bookmark className="mr-2 h-4 w-4" /> My Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => navigate("/auth")}>
                  <User className="mr-2 h-4 w-4" /> Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="sm:hidden border-t border-border px-4 py-2">
          <GlobalSearch mobile />
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-1 bg-background">
          {navItems.map((item) =>
            item.comingSoon ? (
              <span
                key={item.href}
                className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground/50 cursor-not-allowed flex items-center gap-1.5"
              >
                {item.label}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground/50">Soon</Badge>
              </span>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname.startsWith(item.href)
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  );
}
