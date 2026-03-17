

## Entity Editor Improvements for Complex Relationship Modeling

### Current Gaps

After reviewing the Entity Editor code, here's what prevents you from modeling the Hunts system yourself:

1. **No edge configuration UI** — When you draw a connection between two tables, it creates a generic "FK" edge with no way to specify which column is the foreign key. The deploy system tries to guess (`target_table_id`), which fails for tables with multiple FKs to different tables.

2. **No auto-FK-column creation** — Drawing an edge doesn't add the corresponding `uuid` FK column to the source table. You have to manually add the column, name it correctly, then draw the edge and hope the system matches them.

3. **Edge labels are not editable** — Existing edges can't be clicked/edited to correct the source column mapping.

4. **No contributor RLS on deploy** — New tables only get admin + public-read policies, so contributors can't help populate data without manual SQL.

### What to Build

**1. Edge Configuration Dialog**
- When a new edge is created (via `onConnect`), show a dialog asking:
  - Source column (dropdown of source table's uuid fields, plus an "Auto-create" option)
  - Target column (defaults to `id`)
- When an existing edge is clicked/double-clicked, open the same dialog to edit it
- Store `sourceColumn` and `targetColumn` in `edge.data`

**2. Auto-create FK Column on Connect**
- If the user picks "Auto-create" in the dialog, automatically add a `uuid` nullable column named `{target_table}_id` to the source table's fields
- Pre-populate the edge data with the new column name

**3. Contributor RLS Policies on Deploy**
- Extend `schema-deploy` to also generate contributor INSERT/UPDATE/DELETE policies on new tables (matching the pattern already used on hunters, skills, tags, etc.)

### Files Changed

| File | Change |
|------|--------|
| `src/components/admin/EdgeConfigDialog.tsx` | **New.** Dialog with source/target column selects and auto-create option. |
| `src/components/admin/EntityNode.tsx` | No change needed. |
| `src/pages/admin/AdminEntityEditor.tsx` | Replace raw `onConnect` with dialog-opening flow. Add edge-click handler to open dialog for editing. Pass node field data to dialog for dropdown population. |
| `supabase/functions/schema-deploy/index.ts` | Add contributor RLS policies (INSERT, UPDATE, DELETE) alongside existing admin + public-read policies for new tables. |

### UX Flow

```text
User draws edge: Table A ──→ Table B
                     │
                     ▼
            ┌─────────────────────┐
            │  Configure FK Edge  │
            │                     │
            │  Source column:     │
            │  [▾ Auto-create ▾] │
            │    → boss_id        │
            │    → (create new)   │
            │                     │
            │  Target column:     │
            │  [▾ id           ▾] │
            │                     │
            │  [Cancel]  [Apply]  │
            └─────────────────────┘
```

Double-clicking an existing edge reopens the same dialog with current values pre-filled.

### Hunts Data Model (what you'd then build yourself)

With these improvements, you'd create:
- `trophies` — id, name, icon, slug
- `hunt_levels` — id, hunter_id→hunters, level (integer), gold_cost_to_advance
- `hunt_paths` — id, hunt_level_id→hunt_levels, slot (integer), name, gold_cost, unlocked (boolean)
- `hunt_path_costs` — id, hunt_path_id→hunt_paths, trophy_id→trophies, quantity (integer)

All edges would be configured via the dialog, FK columns auto-created, and contributor policies deployed automatically.

