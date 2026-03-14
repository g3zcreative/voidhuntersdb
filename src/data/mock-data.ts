// Mock data for Godforge Hub

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: "Patch Notes" | "Events" | "Dev Updates" | "Community" | "Announcements";
  date: string;
  imageUrl?: string;
  slug: string;
}

export interface OfficialPost {
  id: string;
  author: string;
  authorRole: string;
  source: "Discord" | "Twitter/X" | "Forums";
  content: string;
  date: string;
  region?: string;
}

export interface Guide {
  id: string;
  title: string;
  category: "Beginner" | "Tier Lists" | "Team Building" | "Farming" | "Advanced";
  author: string;
  date: string;
  excerpt: string;
  slug: string;
}

export interface Hero {
  id: string;
  name: string;
  rarity: 3 | 4 | 5;
  element: "Fire" | "Water" | "Earth" | "Wind" | "Light" | "Dark";
  classType: "Warrior" | "Mage" | "Archer" | "Healer" | "Tank";
  slug: string;
}

export interface DatabaseCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  href: string;
  description: string;
}

export const mockNews: NewsArticle[] = [
  {
    id: "1",
    title: "Godforge Closed Beta Announced — Sign Up Now",
    excerpt: "Fateless Games has officially announced the closed beta for Godforge, set to begin next quarter. Pre-register to secure your spot.",
    category: "Announcements",
    date: "2026-03-01",
    slug: "closed-beta-announced",
  },
  {
    id: "2",
    title: "Developer Diary #4: The Forging System Deep Dive",
    excerpt: "Lead designer breaks down the core forging mechanic that gives the game its name. Learn how hero augmentation works.",
    category: "Dev Updates",
    date: "2026-02-25",
    slug: "dev-diary-4-forging-system",
  },
  {
    id: "3",
    title: "New Element Revealed: Void",
    excerpt: "A seventh element joins the roster. Void heroes will counter both Light and Dark types with unique mechanics.",
    category: "Announcements",
    date: "2026-02-20",
    slug: "void-element-revealed",
  },
  {
    id: "4",
    title: "Community Art Contest Winners",
    excerpt: "Over 500 submissions received for the first Godforge fan art contest. See the top picks from the community.",
    category: "Community",
    date: "2026-02-18",
    slug: "art-contest-winners",
  },
  {
    id: "5",
    title: "Pre-Registration Milestone: 1 Million Players",
    excerpt: "Godforge hits its first major pre-registration milestone. Fateless Games announces bonus rewards for all pre-registered accounts.",
    category: "Events",
    date: "2026-02-15",
    slug: "pre-registration-milestone",
  },
];

export const mockOfficialPosts: OfficialPost[] = [
  {
    id: "1",
    author: "FatelessDev_Kai",
    authorRole: "Lead Developer",
    source: "Discord",
    content: "We're aware of the login issues on the test server. Team is working on a fix — should be resolved within the hour.",
    date: "2026-03-02T14:30:00Z",
    region: "Global",
  },
  {
    id: "2",
    author: "GodforgeOfficial",
    authorRole: "Official Account",
    source: "Twitter/X",
    content: "🔥 Sneak peek at the new Fire Archon hero coming in the next update. Full reveal this Friday!",
    date: "2026-03-01T10:00:00Z",
  },
  {
    id: "3",
    author: "CM_Luna",
    authorRole: "Community Manager",
    source: "Discord",
    content: "Reminder: The feedback survey for beta testers closes this Sunday. Make sure to submit your responses!",
    date: "2026-02-28T16:45:00Z",
    region: "Global",
  },
  {
    id: "4",
    author: "FatelessDev_Kai",
    authorRole: "Lead Developer",
    source: "Forums",
    content: "Regarding the gacha rates discussion — we'll be publishing our full rate tables before launch. Transparency is a core value for us.",
    date: "2026-02-27T09:15:00Z",
  },
];

export const mockGuides: Guide[] = [
  {
    id: "1",
    title: "Godforge Beginner's Guide: Everything You Need to Know",
    category: "Beginner",
    author: "ForgeExpert",
    date: "2026-02-28",
    excerpt: "A comprehensive starter guide covering all basic mechanics, progression tips, and early-game priorities.",
    slug: "beginners-guide",
  },
  {
    id: "2",
    title: "Pre-Launch Tier List (Based on Beta Data)",
    category: "Tier Lists",
    author: "MetaForge",
    date: "2026-02-26",
    excerpt: "Early tier rankings based on closed beta testing. Subject to change before launch.",
    slug: "pre-launch-tier-list",
  },
  {
    id: "3",
    title: "Optimal Team Compositions for Story Mode",
    category: "Team Building",
    author: "StrategyForge",
    date: "2026-02-22",
    excerpt: "Best team setups to clear story content efficiently with minimal investment.",
    slug: "story-mode-teams",
  },
  {
    id: "4",
    title: "Resource Farming Routes and Efficiency Guide",
    category: "Farming",
    author: "GrindMaster",
    date: "2026-02-20",
    excerpt: "Maximize your stamina with the most efficient farming routes for all material types.",
    slug: "farming-guide",
  },
];

export const mockHeroes: Hero[] = [
  { id: "1", name: "Ignis", rarity: 5, element: "Fire", classType: "Warrior", slug: "ignis" },
  { id: "2", name: "Thalassa", rarity: 5, element: "Water", classType: "Mage", slug: "thalassa" },
  { id: "3", name: "Verdant", rarity: 4, element: "Earth", classType: "Tank", slug: "verdant" },
  { id: "4", name: "Zephyra", rarity: 5, element: "Wind", classType: "Archer", slug: "zephyra" },
  { id: "5", name: "Solara", rarity: 4, element: "Light", classType: "Healer", slug: "solara" },
  { id: "6", name: "Nyx", rarity: 5, element: "Dark", classType: "Mage", slug: "nyx" },
];

export const databaseCategories: DatabaseCategory[] = [
  { id: "1", name: "Heroes", icon: "Sword", count: 42, href: "/database/heroes", description: "All playable characters" },
  { id: "2", name: "Equipment", icon: "Shield", count: 128, href: "/database/equipment", description: "Weapons, armor & accessories" },
  { id: "3", name: "Skills", icon: "Zap", count: 256, href: "/database/skills", description: "Active & passive abilities" },
  { id: "4", name: "Materials", icon: "Gem", count: 89, href: "/database/materials", description: "Crafting & upgrade resources" },
  { id: "5", name: "Quests", icon: "Map", count: 64, href: "/database/quests", description: "Story & side quests" },
  { id: "6", name: "Achievements", icon: "Trophy", count: 150, href: "/database/achievements", description: "Milestones & rewards" },
];

export const elementColors: Record<string, string> = {
  Fire: "text-red-400",
  Water: "text-blue-400",
  Earth: "text-green-400",
  Wind: "text-teal-300",
  Light: "text-yellow-300",
  Dark: "text-purple-400",
};

export const rarityStars: Record<number, string> = {
  3: "★★★",
  4: "★★★★",
  5: "★★★★★",
};
