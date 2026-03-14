# Dynamic Schema-Driven CMS

## Status: Phase 1 Complete ✅

### Implemented
1. **DB migration** — `deployed` (boolean) and `public_slug` (text) columns added to `entity_definitions`
2. **`useSchemaRegistry` hook** — fetches deployed schemas, parses nodes into table/field definitions, maps DB types to input types
3. **`AdminSchemaData`** — dynamic list page at `/admin/data/:tableName` with search, delete, row-click navigation
4. **`AdminSchemaItemEditor`** — full-page Webflow-inspired editor at `/admin/data/:tableName/:id` with auto-slug, grouped fields, metadata display
5. **Routes wired** in `App.tsx` — `/admin/data/:tableName` and `/admin/data/:tableName/:id`
6. **Dynamic "Collections" sidebar group** in `AdminLayout.tsx` — populated from deployed schemas
7. **Deploy button** in Entity Editor toolbar — toggles `deployed` flag

### Phase 2 (Future)
- Public pages: `/database/:tableName`, `/database/:tableName/:slug`
- FK fields rendered as searchable select dropdowns
- Image upload fields
- Markdown editor fields
- Batch operations on list page
