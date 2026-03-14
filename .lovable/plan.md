

# Dynamic Schema-Driven CMS

## Overview

Build a CMS system where the Entity Editor schemas automatically generate admin CRUD interfaces and public-facing pages. When a field is added or removed in the Entity Editor, the corresponding forms and tables update immediately -- no code changes needed.

The screenshots show Webflow's CMS pattern: a **three-panel layout** with a collection sidebar, item list, and full-page editor. We will adapt this to our existing admin layout.

## Architecture

```text
entity_definitions (schema JSON)
        │
        ▼
  ┌─────────────────────┐
  │  useSchemaRegistry() │  ← React hook that loads all saved schemas
  └─────────┬───────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
 Admin Routes    Public Routes
 /admin/data/:table   /database/:table/:slug
    │                │
    ▼                ▼
 SchemaListPage   PublicEntityList
 SchemaEditPage   PublicEntityDetail
```

## Database Changes

1. **No new tables yet** -- the actual game tables (heroes, factions, etc.) are created via the Entity Editor's "Export SQL" flow. The CMS reads `entity_definitions.schema` to know what columns exist and queries the corresponding `public.*` tables dynamically.

2. Add an `is_published` boolean column and a `table_prefix` or `deployed` flag to `entity_definitions` so the system knows which schemas have been deployed to real tables vs. are still drafts.

**Migration:**
```sql
ALTER TABLE public.entity_definitions
  ADD COLUMN IF NOT EXISTS deployed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text;
```

## New Files & Components

### 1. Schema Registry Hook -- `src/hooks/useSchemaRegistry.tsx`
- Fetches all `entity_definitions` where `deployed = true`
- Parses each schema's nodes into a flat list of tables with their fields
- Returns `{ tables, getTable(name), loading }` 
- Maps Entity Editor field types (`text`, `integer`, `jsonb`, etc.) to form input types (`text`, `number`, `json`, etc.)

### 2. Dynamic Admin List Page -- `src/pages/admin/AdminSchemaData.tsx`
- Route: `/admin/data/:tableName`
- Uses `useSchemaRegistry()` to get column definitions for the given table
- Renders a table view identical to `AdminCrudPage` but driven by schema fields
- "New Item" button navigates to the full-page editor (not a modal)
- Row click navigates to edit page

### 3. Full-Page Entity Editor -- `src/pages/admin/AdminSchemaItemEditor.tsx`
- Route: `/admin/data/:tableName/new` and `/admin/data/:tableName/:id`
- **Webflow-inspired layout**: back arrow + title at top, "Create draft" / "Save" button top-right
- Left column: form fields grouped into "Basic info" (name, slug) and "Custom fields" (everything else)
- Fields are dynamically rendered based on schema:
  - `text` → Input
  - `integer` / `numeric` / `bigint` → Number input
  - `boolean` → Switch
  - `jsonb` → JSON textarea or key-value editor
  - `timestamptz` / `date` → Date picker
  - `uuid` (FK) → Select dropdown that queries the referenced table (derived from edges)
- Slug auto-generated from name field if both exist
- Full page, comfortable spacing -- no modal

### 4. Collection Sidebar in Admin Layout
- Add a new "Collections" sidebar group in `AdminLayout.tsx`
- Dynamically populated from `useSchemaRegistry()` 
- Each deployed schema's tables appear as nav items with item counts
- Example: `Heroes 0 items`, `Factions 3 items`, `Archetypes 5 items`

### 5. Public Pages (Phase 2, outline only)
- `/database/:tableName` -- public list of published items
- `/database/:tableName/:slug` -- detail page
- These will reuse the schema registry to render appropriate columns
- Marked as a follow-up since the tables are empty and no public design has been decided

## Key Behaviors

- **Schema field removed** → field disappears from create/edit form and table columns automatically (schema is the source of truth)
- **Schema field added** → new field appears in forms immediately
- **FK relationships** (edges in the schema) → rendered as select dropdowns that query the referenced table
- **Primary key & auto-default fields** (id, created_at, updated_at) → hidden from forms, shown read-only in edit mode

## Changes to Existing Files

| File | Change |
|---|---|
| `AdminLayout.tsx` | Add dynamic "Collections" sidebar group from schema registry |
| `App.tsx` | Add routes: `/admin/data/:tableName`, `/admin/data/:tableName/new`, `/admin/data/:tableName/:id` |
| `AdminEntityEditor.tsx` | Add "Deploy" button that sets `deployed = true` and runs the generated SQL migration |
| `entity_definitions` table | Add `deployed` and `public_slug` columns |

## Implementation Order

1. DB migration (add `deployed` column)
2. `useSchemaRegistry` hook
3. Dynamic list page (`AdminSchemaData`)
4. Full-page item editor (`AdminSchemaItemEditor`)
5. Wire routes in `App.tsx`
6. Dynamic sidebar entries in `AdminLayout`
7. Deploy button in Entity Editor toolbar

