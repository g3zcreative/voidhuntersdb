export interface SeoSettings {
  siteTitle: string;
  metaDescription: string;
  ogImage: string;
}

const defaults: SeoSettings = {
  siteTitle: "VoidHuntersDB.com",
  metaDescription: "The premier source for all things Void Hunters, the upcoming hero collector RPG by Artifex Mundi. News, guides, database, and more.",
  ogImage: "https://voidhuntersdb.com/og-image.png",
};

export function useSeoSettings() {
  // SEO settings are not yet stored in the database — return defaults
  return defaults;
}
