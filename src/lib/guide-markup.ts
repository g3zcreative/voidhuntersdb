/**
 * Custom guide markup preprocessor.
 *
 * Converts bracket tokens like [hero:sun-wukong] into HTML anchor tags
 * before the Markdown renderer processes the content.
 */

const ENTITY_PATTERN = /\[(hero|skill|item|mechanic|boss-skill|boss):([a-z0-9-]+)\]/g;

const TYPE_TO_PATH: Record<string, string> = {
  hero: "heroes",
  skill: "skills",
  item: "items",
  mechanic: "mechanics",
  "boss-skill": "boss-skills",
  boss: "bosses",
};

const ROMAN_NUMERALS = new Set(["i","ii","iii","iv","v","vi","vii","viii","ix","x"]);

function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((word) =>
      ROMAN_NUMERALS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export function preprocessMarkup(content: string): string {
  return content.replace(ENTITY_PATTERN, (_match, type: string, slug: string) => {
    const path = TYPE_TO_PATH[type] ?? type + "s";
    const displayName = deslugify(slug);
    return `<a href="/database/${path}/${slug}" class="entity-link entity-link--${type}" data-entity="${type}" data-slug="${slug}">${displayName}</a>`;
  });
}
