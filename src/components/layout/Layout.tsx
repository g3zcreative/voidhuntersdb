import { Link } from "react-router-dom";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p className="font-display font-semibold text-foreground mb-2">
            Void<span className="text-primary">Hunters</span> Hub
          </p>
          <p>A community information hub for Void Hunters.</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/official-posts" className="hover:text-primary transition-colors">Official Posts</Link>
            <Link to="/changelog" className="hover:text-primary transition-colors">Changelog</Link>
            <Link to="/roadmap" className="hover:text-primary transition-colors">Roadmap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
