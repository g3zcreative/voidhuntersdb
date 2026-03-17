# Dynamic Schema-Driven CMS

## Status: Phase 1 Complete ✅ | Community Contributions ✅ | Edge Config ✅

### Implemented
1. **DB migration** — `deployed` (boolean) and `public_slug` (text) columns added to `entity_definitions`
2. **`useSchemaRegistry` hook** — fetches deployed schemas, parses nodes into table/field definitions, maps DB types to input types
3. **`AdminSchemaData`** — dynamic list page at `/admin/data/:tableName` with search, delete, row-click navigation
4. **`AdminSchemaItemEditor`** — full-page Webflow-inspired editor at `/admin/data/:tableName/:id` with auto-slug, grouped fields, metadata display
5. **Routes wired** in `App.tsx` — `/admin/data/:tableName` and `/admin/data/:tableName/:id`
6. **Dynamic "Collections" sidebar group** in `AdminLayout.tsx` — populated from deployed schemas
7. **Deploy button** in Entity Editor toolbar — toggles `deployed` flag
8. **Contributor role** — community members can add/edit game data via admin Collections
9. **Storage policy** — contributors can upload to `images` bucket
10. **Junction table DELETE** — contributors can manage many-to-many relationships (hunter_tags)
11. **Audit columns** — `created_by` and `updated_by` on all game tables, auto-populated on save
12. **Contribution review system** — contributors save to `contributions` table; admins review at `/admin/contributions`
13. **Edge Configuration Dialog** — drawing/clicking edges opens a dialog to pick source/target FK columns with auto-create option
14. **Contributor RLS on deploy** — schema-deploy now generates contributor INSERT/UPDATE policies alongside admin + public-read

### Phase 2 (Future)
- Public pages: `/database/:tableName`, `/database/:tableName/:slug`
- FK fields rendered as searchable select dropdowns
- Image upload fields
- Markdown editor fields
- Batch operations on list page
- Contributor activity log / "My Submissions" page
- Email notifications on approval/rejection
