

## Skill Efficiency Data System

Add new fields to the `skills` table to capture damage hit data, then compute efficiency ratings (WEAK / AVERAGE / STRONG / GOD-TIER) based on your formulas, update the admin form, import the CSV data, and display ratings on the hunter detail page.

### New Columns on `skills` Table

| Column | Type | Purpose |
|--------|------|---------|
| `skill_levels` | integer | Number of skill upgrade levels |
| `base_cooldown` | integer | Starting cooldown (already exists as `cooldown` — will reuse) |
| `max_cd` | integer | Cooldown at max skill level |
| `skill_tags` | text | Comma-separated tags (Melee, Damage, etc.) |
| `awakening_level` | integer | Awakening level that modifies this skill |
| `awakening_effect` | text | Description of awakening bonus |
| `target_type` | text | ST, AoE, or RND |
| `hit1_percent` | numeric | Hit 1 ATK % multiplier |
| `hit1_count` | integer | Number of Hit 1 strikes |
| `hit1_book_bonus` | numeric | Hit 1 book bonus % |
| `hit2_percent` | numeric | Hit 2 ATK % multiplier |
| `hit2_count` | integer | Number of Hit 2 strikes |
| `hit2_book_bonus` | numeric | Hit 2 book bonus % |

**Not stored** (computed at display time):
- **Min Mult** = `(hit1_percent * hit1_count) + (hit2_percent * hit2_count)`
- **Max Mult** = `(hit1_percent * hit1_count * (1 + hit1_book_bonus)) + (hit2_percent * hit2_count * (1 + hit2_book_bonus))`
- **Efficiency** = based on target_type:
  - ST: ≥4 GOD-TIER, ≥3.3 STRONG, ≥2.5 AVERAGE, else WEAK
  - AoE: ≥2.5 GOD-TIER, ≥2 STRONG, ≥1.4 AVERAGE, else WEAK

### Steps

**1. Database migration** — Add the 13 new columns to `skills` (all nullable).

**2. Import CSV data** — Match skills by hunter name + skill name, update the new columns with values from your spreadsheet (44 rows).

**3. Update `InlineSkillsEditor`** — Add input fields for all new columns in the skill accordion form, organized in a logical group:
- Target Type (select: ST / AoE / RND)
- Skill Levels, Max CD
- Hit 1 section: Percent, Count, Book Bonus
- Hit 2 section: Percent, Count, Book Bonus
- Awakening Level, Awakening Effect
- Skill Tags (text input)
- Computed preview showing Min Mult, Max Mult, and Efficiency Rating badge

**4. Hunter detail page** — Update `SkillInfoBox` to show an efficiency badge (color-coded: GOD-TIER gold, STRONG purple, AVERAGE blue, WEAK gray) alongside damage multiplier numbers, so users can assess skill power at a glance.

### Technical Details

- The `cooldown` column already exists on `skills` — it maps to "Base Cooldown" in your CSV. No need to add a duplicate.
- Efficiency rating is computed client-side from the stored hit data, not stored as a column — keeps it automatically consistent.
- The entity editor schema definition won't need updating since the `InlineSkillsEditor` is a custom component that bypasses the generic schema form.
- All new columns are nullable so existing skills without damage data won't break.

