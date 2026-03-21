

## Plan: Enable Admin CRUD on System Tables

### Problem
System tables (`profiles`, `user_roles`, `site_settings`, `feedback`, `page_views`, etc.) are excluded from both the schema introspect function and the schema registry, so they never appear in the admin sidebar or CRUD pages.

### Approach

**1. Update `schema-introspect` edge function**
- Add an optional `includeSystem=true` query parameter
- When set, skip the `SYSTEM_TABLES` filter so all public tables are returned

**2. Create a `useSystemTables` hook**
- Calls `schema-introspect` with `includeSystem=true`
- Returns table metadata (columns, types, PKs) for system tables only (the ones NOT in the schema registry)
- Provides the same `getTable()` interface as `useSchemaRegistry`

**3. Update `AdminSchemaData` page**
- When `getTable(tableName)` from the schema registry returns nothing, fall back to `useSystemTables().getTable(tableName)`
- Same search, column visibility, delete, and navigation logic applies

**4. Update `AdminSchemaItemEditor` page**
- Same fallback: if schema registry has no metadata for the table, use system table metadata
- FK lookups and M2M relations won't apply to most system tables (they have simpler schemas)

**5. Add "System" sidebar group in `AdminLayout`**
- New sidebar section (admin-only) listing system tables: `profiles`, `user_roles`, `site_settings`, `feedback`, `page_views`, `entity_definitions`, `contributions`, `seo_templates`, `site_changelog`, `roadmap_items`
- Uses the same `/admin/data/:tableName` route
- Displayed below "Collections" and above "Content"

### Technical Details

```text
schema-introspect
  ├── ?includeSystem=true  →  returns ALL public tables
  └── default              →  filters out SYSTEM_TABLES (unchanged)

AdminSchemaData / AdminSchemaItemEditor
  ├── Try useSchemaRegistry.getTable(name)
  └── Fallback: useSystemTables.getTable(name)

AdminLayout sidebar
  ├── Collections (game tables from schema registry)
  ├── System (hardcoded list of platform tables)  ← NEW
  ├── Content
  ├── Insights
  └── Platform
```

### Files Modified
- `supabase/functions/schema-introspect/index.ts` — optional system table inclusion
- `src/hooks/useSystemTables.tsx` — new hook
- `src/pages/admin/AdminSchemaData.tsx` — fallback to system table metadata
- `src/pages/admin/AdminSchemaItemEditor.tsx` — same fallback
- `src/pages/admin/AdminLayout.tsx` — add System sidebar group

