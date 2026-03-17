/** Formats a table label (e.g. "boss_skills") into a display name ("Boss Skills"). */
export function formatTableLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
