import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { usePageView } from "./hooks/usePageView";

// Lazy-loaded pages
const NewsPage = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoon"));

const OfficialPostsPage = lazy(() => import("./pages/OfficialPosts"));
const GuidesPage = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const ChangelogPage = lazy(() => import("./pages/Changelog"));
const RoadmapPage = lazy(() => import("./pages/Roadmap"));
const AuthPage = lazy(() => import("./pages/Auth"));
const DiscordRedirect = lazy(() => import("./pages/Discord"));
const DatabaseList = lazy(() => import("./pages/DatabaseList"));
const DatabaseDetail = lazy(() => import("./pages/DatabaseDetail"));
const TierListPage = lazy(() => import("./pages/TierList"));
const MyTierLists = lazy(() => import("./pages/MyTierLists"));
const TierListEditor = lazy(() => import("./pages/TierListEditor"));
const SharedTierList = lazy(() => import("./pages/SharedTierList"));

// Admin pages (heavy -- always lazy)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminNews = lazy(() => import("./pages/admin/AdminNews"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminOfficialPosts = lazy(() => import("./pages/admin/AdminOfficialPosts"));
const AdminChangelog = lazy(() => import("./pages/admin/AdminChangelog"));
const AdminRoadmap = lazy(() => import("./pages/admin/AdminRoadmap"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminPlatform = lazy(() => import("./pages/admin/AdminPlatform"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDocs = lazy(() => import("./pages/admin/AdminDocs"));
const AdminAuthors = lazy(() => import("./pages/admin/AdminAuthors"));
const AdminSeo = lazy(() => import("./pages/admin/AdminSeo"));
const AdminEntityEditor = lazy(() => import("./pages/admin/AdminEntityEditor"));
const AdminSchemaData = lazy(() => import("./pages/admin/AdminSchemaData"));
const AdminSchemaItemEditor = lazy(() => import("./pages/admin/AdminSchemaItemEditor"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminContributions = lazy(() => import("./pages/admin/AdminContributions"));
const AdminContributionReview = lazy(() => import("./pages/admin/AdminContributionReview"));
const AdminTierList = lazy(() => import("./pages/admin/AdminTierList"));

const queryClient = new QueryClient();

function PageViewTracker() {
  usePageView();
  return null;
}

function AppRoutes() {

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetail />} />

        {/* Guides */}
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuideDetail />} />


        {/* Official Posts */}
        <Route path="/official-posts" element={<OfficialPostsPage />} />

        <Route path="/discord" element={<DiscordRedirect />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/tier-list" element={<TierListPage />} />
        <Route path="/tier-list/my" element={<MyTierLists />} />
        <Route path="/tier-list/my/:id" element={<TierListEditor />} />
        <Route path="/tier-list/shared/:id" element={<SharedTierList />} />
        <Route path="/database/:tableName" element={<DatabaseList />} />
        <Route path="/database/:tableName/:slug" element={<DatabaseDetail />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/analytics" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="official-posts" element={<AdminOfficialPosts />} />
          <Route path="authors" element={<AdminAuthors />} />
          <Route path="changelog" element={<AdminChangelog />} />
          <Route path="roadmap" element={<AdminRoadmap />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="seo" element={<AdminSeo />} />
          <Route path="platform" element={<AdminPlatform />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="docs" element={<AdminDocs />} />
          <Route path="entity-editor" element={<AdminEntityEditor />} />
          <Route path="activity" element={<AdminActivityLog />} />
          <Route path="contributions" element={<AdminContributions />} />
          <Route path="contributions/:id" element={<AdminContributionReview />} />
          <Route path="tier-list" element={<AdminTierList />} />
          <Route path="data/:tableName" element={<AdminSchemaData />} />
          <Route path="data/:tableName/:id" element={<AdminSchemaItemEditor />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageViewTracker />
          <FeedbackWidget />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
