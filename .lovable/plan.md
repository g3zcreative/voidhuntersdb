

## Contribution Review & Approval System

### Problem
Currently, contributors can directly insert/update game data tables. Changes go live immediately with no review step. Admins need a way to review and approve/reject contributor submissions before they appear publicly.

### Approach: Separate `contributions` table

Rather than adding `status` columns to every game table (which complicates public queries and updates), we use a dedicated `contributions` table that stores proposed payloads as JSONB. Contributors' saves go into this queue; admins review and apply them.

### Database Changes

**New table: `contributions`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| contributor_id | uuid NOT NULL | references auth.users |
| table_name | text NOT NULL | e.g. "hunters", "skills" |
| record_id | uuid | NULL for creates, existing row ID for updates |
| action | text NOT NULL | "create" or "update" |
| payload | jsonb NOT NULL | the full proposed row data |
| status | text NOT NULL DEFAULT 'pending' | pending / approved / rejected |
| reviewer_id | uuid | admin who reviewed |
| reviewed_at | timestamptz | |
| reviewer_note | text | optional feedback |
| created_at | timestamptz DEFAULT now() | |

**RLS policies:**
- Contributors can INSERT own contributions (`contributor_id = auth.uid()`)
- Contributors can SELECT own contributions
- Contributors can DELETE own pending contributions
- Admins can SELECT/UPDATE all contributions (to approve/reject)

### Code Changes

**1. Modify save logic in `AdminSchemaItemEditor.tsx`**
- Detect if current user is a contributor (not admin) using `useAdmin()`
- If contributor: instead of directly inserting/updating the game table, insert a row into `contributions` with the payload, table_name, record_id, and action
- Same for inline skills: bundle skill payloads into the contribution record (e.g. `payload.inline_skills = [...]`)
- Show toast: "Submitted for review" instead of "Item saved"
- Redirect back to list after submission

**2. New page: `AdminContributions.tsx`**
- Admin-only page at `/admin/contributions`
- Lists all contributions ordered by `created_at` desc
- Filters: status (pending/approved/rejected), table, contributor
- Each row shows: contributor name, table, record name (from payload), action type, timestamp, status badge
- Pending count badge in sidebar nav

**3. New page: `AdminContributionReview.tsx`**
- Route: `/admin/contributions/:id`
- Shows the proposed payload as a read-only form (reusing `FieldInput` components)
- For updates: shows a side-by-side diff (current vs proposed)
- Two actions: **Approve** (applies payload to target table) and **Reject** (with optional note)
- Approve logic: takes `payload` and does `supabase.from(table_name).insert(...)` or `.update(...)`, sets `status = 'approved'`, `reviewer_id`, `reviewed_at`
- For contributions with inline skills: also processes the `inline_skills` array

**4. Update `AdminLayout.tsx` sidebar**
- Add "Contributions" nav item under Insights group with a pending-count badge
- Visible to admins only

**5. Update `App.tsx` routes**
- Add `/admin/contributions` and `/admin/contributions/:id`

**6. Contributor UX in `AdminSchemaItemEditor.tsx`**
- Show a banner: "Your changes will be submitted for review by an admin"
- Change save button text to "Submit for Review"
- Contributors can still see their own pending/past submissions

### Files Changed

| File | Change |
|------|-------|
| DB migration | Create `contributions` table + RLS policies |
| `src/pages/admin/AdminContributions.tsx` | **New.** List page with filters and status badges |
| `src/pages/admin/AdminContributionReview.tsx` | **New.** Review page with payload preview, approve/reject actions, diff for updates |
| `src/pages/admin/AdminSchemaItemEditor.tsx` | Detect contributor role; route saves to `contributions` table instead of direct writes |
| `src/pages/admin/AdminLayout.tsx` | Add "Contributions" sidebar item with pending count badge |
| `src/App.tsx` | Add two new admin routes |

### Edge Cases
- **Inline skills on hunters:** The contribution payload includes an `_inline_skills` array. On approval, the review page processes skills the same way the current save mutation does.
- **Junction tables (tags):** The contribution payload includes a `_multi_refs` object. On approval, junction rows are synced.
- **Contributor edits pending contribution:** Allow contributors to delete their own pending contributions and resubmit.
- **Multiple pending contributions for same record:** Each is independent; admin reviews in order.

