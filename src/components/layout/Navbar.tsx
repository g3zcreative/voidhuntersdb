import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, User, Shield, LogOut, Database, ChevronDown } from "lucide-react";
import { formatTableLabel } from "@/lib/format-label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useSchemaRegistry } from "@/hooks/useSchemaRegistry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "News", href: "/news" },
  { label: "Guides", href: "/guides" },
  { label: "Official Posts", href: "/official-posts" },
  
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const { tables, isJunction } = useSchemaRegistry();
  const visibleTables = tables.filter((t) => !isJunction(t.name));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground text-sm">VH</span>
          </div>
          <span className="font-display font-bold text-lg hidden sm:inline">
            VoidHunters<span className="text-primary">DB</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {/* Database dropdown */}
          {visibleTables.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary hover:text-foreground ${
                    location.pathname.startsWith("/database")
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Database
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {visibleTables.map((t) => (
                  <DropdownMenuItem key={t.name} onClick={() => navigate(`/database/${t.name}`)}>
                    {t.label.charAt(0).toUpperCase() + t.label.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {navItems.map((item) => (
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
          ))}
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
                  {canAccessAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" /> Admin Panel
                    </DropdownMenuItem>
                  )}
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
          {visibleTables.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Database</p>
              {visibleTables.map((t) => (
                <Link
                  key={t.name}
                  to={`/database/${t.name}`}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === `/database/${t.name}`
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.label.charAt(0).toUpperCase() + t.label.slice(1)}
                </Link>
              ))}
              <Separator className="my-1" />
            </>
          )}
          {navItems.map((item) => (
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
          ))}
        </nav>
      )}
    </header>
  );
}
