

## 301 Redirect Management for Slug Changes

When a hunter (or other entity) gets renamed, the old slug-based URL breaks. This plan adds a redirect table and client-side redirect logic so old URLs automatically forward visitors to the new slug.

### How It Works

1. A new `redirects` table stores old-path → new-path mappings
2. When a hunter's slug changes, an admin adds a redirect entry (e.g. `/database/hunters/old-name` → `/database/hunters/new-name`)
3. The `DatabaseDetail` page checks for redirects when no item is found by slug, and navigates to the new URL
4. An admin UI page lets you manage all redirects

### Steps

**1. Database: `redirects` table**

Create a new table with columns:
- `id` (uuid, PK)
- `from_path` (text, unique, required) — e.g. `/database/hunters/old-slug`
- `to_path` (text, required) — e.g. `/database/hunters/new-slug`
- `created_at` (timestamptz)

RLS: public read, admin write.

**2. Update `DatabaseDetail.tsx`**

When the main query returns no item (null), check the `redirects` table for a matching `from_path` using the current URL path. If found, use `navigate(to_path, { replace: true })` to perform a client-side 301-equivalent redirect.

**3. Admin UI: Redirect Manager**

Add a new admin page at `/admin/redirects` using the existing `AdminCrudPage` component with columns for `from_path` and `to_path`. Add it to the admin sidebar and routes in `AdminLayout` and `App.tsx`.

**4. Sitemap edge function**

Update the sitemap function to exclude paths that have entries in the `redirects.from_path` column, so search engines don't index stale URLs.

### Technical Details

- The redirect lookup in `DatabaseDetail` only fires when the primary query returns null, so there's no performance cost on normal page loads
- `from_path` has a unique constraint to prevent duplicate redirect sources
- This approach handles all entity types (hunters, bosses, skills, etc.) since it stores full paths

