Tier list system: Prydwen-style rubric-based scoring with configurable content tabs, 5 role columns, and T0-T3 tiers.

## Tables
- tier_list_contexts: content tabs (PVE, PVP, etc.)
- tier_list_criteria: scoring rubric (name, weight, max_score)
- tier_score_ranges: maps total score to tier label
- hunter_tier_entries: per-hunter scores per context
- tier_list_changelog: tracks score/tier changes with optional notes

## Rarity labels
- 3 = Rare, 4 = Epic, 5 = Legendary

## Changelog
- Admin can add optional note when saving/updating a hunter score
- Changes logged to tier_list_changelog with old/new tier+score
- Public tier list shows "Recent Changes" section at bottom with arrows for up/down movement
