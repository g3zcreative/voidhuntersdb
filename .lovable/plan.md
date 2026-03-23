## Plan: Hunter Tier List System

### Overview

Build a Prydwen-style tier list page at `/tier-list` with rubric-based scoring, configurable content tabs, role columns (DPS, Debuff, Control, Support, Sustain), and tier rows (T0 through T3 with half-steps).

### Data Model (4 new tables)

```text
tier_list_contexts          tier_list_criteria
┌──────────────────┐       ┌──────────────────────┐
│ id (uuid PK)     │       │ id (uuid PK)         │
│ name (text)      │       │ name (text)          │
│ slug (text)      │       │ weight (numeric)     │
│ sort_order (int) │       │ description (text)   │
│ image_url (text) │       │ max_score (int)      │
└──────────────────┘       └──────────────────────┘

hunter_tier_entries
┌──────────────────────────────┐
│ id (uuid PK)                 │
│ hunter_id (uuid FK→hunters)  │
│ context_id (uuid FK→contexts)│
│ role (text)                  │  ← DPS/Debuff/Control/Support/Sustain
│ criteria_scores (jsonb)      │  ← { "criterion_id": score, ... }
│ total_score (numeric)        │  ← sum of weighted scores (computed on save)
│ tier (text)                  │  ← auto-mapped from score, or manual override
│ tags (text[])                │  ← skill keywords shown below portrait (e.g. "Debuff, Delay")
│ created/updated_at           │
│ UNIQUE(hunter_id, context_id)│
└──────────────────────────────┘

tier_score_ranges
┌──────────────────────┐
│ id (uuid PK)         │
│ tier (text)           │  ← "T0", "T0.5", "T1", etc.
│ min_score (numeric)   │
│ sort_order (int)      │
└──────────────────────┘
```

**How rubric scoring works:**

- Admin defines criteria (e.g. "Damage Output" weight 3, "Utility" weight 2, "Survivability" weight 2) -- shared across all contexts
- For each hunter + context, admin scores each criterion (0-10)
- System calculates `total_score = sum(criterion_score * weight)`
- Score maps to tier via `tier_score_ranges` (e.g. >= 90 = T0, >= 75 = T0.5, etc.)
- Admin can manually override the tier if needed

### Frontend

**1. Public Tier List Page** (`/tier-list`)

- Top: horizontal scrollable tabs from `tier_list_contexts` (with optional background images like Prydwen)
- Below tabs: search bar + rarity filter buttons (R, SR, SSR)
- Content area: 5 role columns (DPS, Debuff, Control, Support, Sustain) as headers
- Rows grouped by tier (T0, T0.5, T1, ...) with colored left-side tier labels
- Each cell shows hunter portraits with skill keyword tags below
- Click a hunter portrait to go to their detail page

**2. Admin Tier List Management** (`/admin/tier-list`)

- CRUD for contexts (tabs) and criteria (with weights)
- Configure score ranges for tier mapping
- Per-hunter scoring form: select context, assign role, score each criterion, see computed tier, optionally override

### Implementation Steps

1. **Database migration**: Create 4 tables with RLS (public read, admin write)
2. **Seed data**: Insert default contexts (Generic PVE, PVP), criteria, and score ranges
3. **Admin page**: `src/pages/admin/AdminTierList.tsx` with tabs for Contexts, Criteria, Score Ranges, and Hunter Scoring
4. **Public page**: `src/pages/TierList.tsx` with the Prydwen-style grid layout
5. **Routing**: Add `/tier-list` public route and `/admin/tier-list` admin route
6. **Navigation**: Add "Tier List" to the site navbar

### Files Created/Modified

- `src/pages/TierList.tsx` -- new public tier list page
- `src/pages/admin/AdminTierList.tsx` -- new admin management page
- `src/App.tsx` -- add routes
- `src/components/layout/Navbar.tsx` -- add nav link
- Database migration for 4 new tables

### Technical Details

**RLS policies** (all 4 tables):

- `SELECT` open to `anon, authenticated` (public read)
- `INSERT/UPDATE/DELETE` restricted to admin via `has_role(auth.uid(), 'admin')`

**Tier color scheme** (matching gaming aesthetic):

- T0: red/hot
- T0.5: orange
- T1: yellow/gold
- T1.5: green
- T2: blue
- T3: gray

**After implementation, add "How to use" instructions to "Docs" page.**