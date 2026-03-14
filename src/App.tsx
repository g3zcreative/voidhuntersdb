import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { usePageView } from "./hooks/usePageView";

// Lazy-loaded pages
const NewsPage = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoon"));
const CommunityPage = lazy(() => import("./pages/Community"));
const OfficialPostsPage = lazy(() => import("./pages/OfficialPosts"));
const DatabasePage = lazy(() => import("./pages/Database"));
const BossesList = lazy(() => import("./pages/BossesList"));
const BossDetail = lazy(() => import("./pages/BossDetail"));
const BossStrategyDetail = lazy(() => import("./pages/BossStrategyDetail"));
const HeroDetail = lazy(() => import("./pages/HeroDetail"));
const HeroesList = lazy(() => import("./pages/HeroesList"));
const SkillsList = lazy(() => import("./pages/SkillsList"));
const SkillDetail = lazy(() => import("./pages/SkillDetail"));
const GuidesPage = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const ImprintsList = lazy(() => import("./pages/ImprintsList"));
const ImprintDetail = lazy(() => import("./pages/ImprintDetail"));
const WeaponsList = lazy(() => import("./pages/WeaponsList"));
const WeaponDetail = lazy(() => import("./pages/WeaponDetail"));
const ToolsPage = lazy(() => import("./pages/Tools"));
const TeamBuilder = lazy(() => import("./pages/TeamBuilder"));
const ChangelogPage = lazy(() => import("./pages/Changelog"));
const RoadmapPage = lazy(() => import("./pages/Roadmap"));
const AuthPage = lazy(() => import("./pages/Auth"));
const DiscordRedirect = lazy(() => import("./pages/Discord"));
const MechanicsList = lazy(() => import("./pages/MechanicsList"));
const MechanicDetail = lazy(() => import("./pages/MechanicDetail"));
const ArmorSetsList = lazy(() => import("./pages/ArmorSetsList"));
const BuildDetail = lazy(() => import("./pages/BuildDetail"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const ProfilePage = lazy(() => import("./pages/Profile"));

// Admin pages (heavy -- always lazy)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminHeroes = lazy(() => import("./pages/admin/AdminHeroes"));
const AdminSkills = lazy(() => import("./pages/admin/AdminSkills"));
const AdminMechanics = lazy(() => import("./pages/admin/AdminMechanics"));
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
const AdminImprints = lazy(() => import("./pages/admin/AdminImprints"));
const AdminWeapons = lazy(() => import("./pages/admin/AdminWeapons"));
const AdminFactions = lazy(() => import("./pages/admin/AdminFactions"));
const AdminArchetypes = lazy(() => import("./pages/admin/AdminArchetypes"));
const AdminAffinities = lazy(() => import("./pages/admin/AdminAffinities"));
const AdminAllegiances = lazy(() => import("./pages/admin/AdminAllegiances"));
const AdminAuthors = lazy(() => import("./pages/admin/AdminAuthors"));
const AdminBuilds = lazy(() => import("./pages/admin/AdminBuilds"));
const AdminArmorSets = lazy(() => import("./pages/admin/AdminArmorSets"));
const AdminBosses = lazy(() => import("./pages/admin/AdminBosses"));
const AdminBossStrategies = lazy(() => import("./pages/admin/AdminBossStrategies"));
const AdminBossSkills = lazy(() => import("./pages/admin/AdminBossSkills"));
const AdminSeo = lazy(() => import("./pages/admin/AdminSeo"));
const AdminTeamComps = lazy(() => import("./pages/admin/AdminTeamComps"));
const AdminDataSync = lazy(() => import("./pages/admin/AdminDataSync"));
const AdminRecommendations = lazy(() => import("./pages/admin/AdminRecommendations"));
const AdminEntityEditor = lazy(() => import("./pages/admin/AdminEntityEditor"));

const queryClient = new QueryClient();

function PageViewTracker() {
  usePageView();
  return null;
}

function AppRoutes() {
  const { flags } = useFeatureFlags();

  const comingSoon = (title: string, desc: string) => (
    <ComingSoonPage title={title} description={desc} />
  );

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetail />} />

        {/* Database */}
        <Route path="/database" element={flags.database ? <DatabasePage /> : comingSoon("Database", "The full heroes, items, skills, and materials database is under construction.")} />
        <Route path="/database/heroes" element={flags.database ? <HeroesList /> : comingSoon("Database", "The full heroes, items, skills, and materials database is under construction.")} />
        <Route path="/database/heroes/:slug" element={flags.database ? <HeroDetail /> : comingSoon("Database", "The full heroes, items, skills, and materials database is under construction.")} />
        <Route path="/database/skills" element={flags.database ? <SkillsList /> : comingSoon("Database", "The full heroes, items, skills, and materials database is under construction.")} />
        <Route path="/database/skills/:slug" element={flags.database ? <SkillDetail /> : comingSoon("Database", "The full heroes, items, skills, and materials database is under construction.")} />
        <Route path="/database/mechanics" element={flags.database ? <MechanicsList /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/mechanics/:slug" element={flags.database ? <MechanicDetail /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/imprints" element={flags.database ? <ImprintsList /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/imprints/:slug" element={flags.database ? <ImprintDetail /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/weapons" element={flags.database ? <WeaponsList /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/weapons/:slug" element={flags.database ? <WeaponDetail /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/armor-sets" element={flags.database ? <ArmorSetsList /> : comingSoon("Database", "The full database is under construction.")} />
        <Route path="/database/heroes/:heroSlug/builds/:buildSlug" element={flags.database ? <BuildDetail /> : comingSoon("Database", "The full database is under construction.")} />

        {/* Bosses */}
        <Route path="/bosses" element={<BossesList />} />
        <Route path="/bosses/:slug" element={<BossDetail />} />
        <Route path="/bosses/:bossSlug/strategies/:strategySlug" element={<BossStrategyDetail />} />

        {/* Guides */}
        <Route path="/guides" element={flags.guides ? <GuidesPage /> : comingSoon("Guides", "Community guides and strategies are being prepared.")} />
        <Route path="/guides/:slug" element={flags.guides ? <GuideDetail /> : comingSoon("Guides", "Community guides and strategies are being prepared.")} />

        {/* Tools */}
        <Route path="/tools" element={flags.tools ? <ToolsPage /> : comingSoon("Tools", "Interactive tools like tier lists, team builder, and resource calculators are in development.")} />
        <Route path="/tools/team-builder" element={<TeamBuilder />} />

        {/* Community */}
        <Route path="/community" element={flags.community ? <CommunityPage /> : comingSoon("Community", "The community hub is being set up.")} />

        {/* Official Posts */}
        <Route path="/official-posts" element={<OfficialPostsPage />} />

        <Route path="/discord" element={<DiscordRedirect />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/analytics" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="heroes" element={<AdminHeroes />} />
          <Route path="builds" element={<AdminBuilds />} />
          <Route path="armor-sets" element={<AdminArmorSets />} />
          <Route path="bosses" element={<AdminBosses />} />
          <Route path="boss-strategies" element={<AdminBossStrategies />} />
          <Route path="boss-skills" element={<AdminBossSkills />} />
          <Route path="skills" element={<AdminSkills />} />
          <Route path="mechanics" element={<AdminMechanics />} />
          <Route path="imprints" element={<AdminImprints />} />
          <Route path="weapons" element={<AdminWeapons />} />
          <Route path="factions" element={<AdminFactions />} />
          <Route path="archetypes" element={<AdminArchetypes />} />
          <Route path="affinities" element={<AdminAffinities />} />
          <Route path="allegiances" element={<AdminAllegiances />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="official-posts" element={<AdminOfficialPosts />} />
          <Route path="authors" element={<AdminAuthors />} />
          <Route path="changelog" element={<AdminChangelog />} />
          <Route path="roadmap" element={<AdminRoadmap />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="seo" element={<AdminSeo />} />
          <Route path="team-comps" element={<AdminTeamComps />} />
          <Route path="platform" element={<AdminPlatform />} />
          <Route path="data-sync" element={<AdminDataSync />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="docs" element={<AdminDocs />} />
          <Route path="recommendations" element={<AdminRecommendations />} />
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
