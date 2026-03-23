## User-Created Tier Lists

Allow signed-in users to create, edit, and share their own tier lists alongside the official (admin) tier list. These tierlists are central to the viral promotion of the [voidhuntersdb.com](http://voidhuntersdb.com) so make sure to make Sharing a tier list very easy, and make "Create Your Own Tierlist" prominent on shared tier list links.

### Data Model

**New table: `user_tier_lists**`


| Column     | Type                  | Notes                                    |
| ---------- | --------------------- | ---------------------------------------- |
| id         | uuid PK               | &nbsp;                                   |
| user_id    | uuid NOT NULL         | references auth.users, ON DELETE CASCADE |
| context_id | uuid NOT NULL         | references tier_list_contexts            |
| name       | text NOT NULL         | e.g. "My PVE Tier List"                  |
| is_public  | boolean DEFAULT false | whether others can view it               |
| created_at | timestamptz           | &nbsp;                                   |
| updated_at | timestamptz           | &nbsp;                                   |


**New table: `user_tier_entries**`


| Column       | Type                        | Notes                                         |
| ------------ | --------------------------- | --------------------------------------------- |
| id           | uuid PK                     | &nbsp;                                        |
| tier_list_id | uuid NOT NULL               | references user_tier_lists, ON DELETE CASCADE |
| hunter_id    | uuid NOT NULL               | references hunters                            |
| tier         | text NOT NULL               | e.g. "T0", "T1"                               |
| role         | text NOT NULL DEFAULT 'DPS' | &nbsp;                                        |
| notes        | text                        | optional per-hunter note                      |


**RLS policies:**

- Users can CRUD their own lists/entries (`user_id = auth.uid()`)
- Public lists are readable by anyone (`is_public = true`)
- Admin can read all

### Routes

- `/tier-list` — existing official tier list (unchanged)
- `/tier-list/my` — user's own tier lists (list view, requires auth)
- `/tier-list/my/:id` — tier list editor (drag-and-drop or click-to-place)
- `/tier-list/shared/:id` — public view of a user's shared tier list

### UI Components

**1. "My Tier Lists" page (`src/pages/MyTierLists.tsx`)**

- Lists user's tier lists with create/edit/delete actions
- "Create New Tier List" button opens a dialog to pick a context and name
- Each list card shows name, context, hunter count, public/private toggle

**2. Tier List Editor (`src/pages/TierListEditor.tsx`)**

- Left panel: all hunters (searchable, filterable by rarity)
- Right panel: tier rows (T0 through T3) with role columns
- Click a hunter to place them in the selected tier/role
- Click a placed hunter to remove or move them
- Auto-saves on changes (debounced upsert)
- Toggle to make list public/private

**3. Shared Tier List View (`src/pages/SharedTierList.tsx`)**

- Read-only view reusing the existing `TierList.tsx` grid layout
- Shows author name and creation date
- Add "username" to the Users table if it doesn't exist. So users can set their desired username
- "Create Your Own" CTA for non-authenticated users

**4. Navigation integration**

- Add "My Tier Lists" link on the `/tier-list` page for signed-in users
- Add link in user dropdown menu in Navbar

### Implementation Steps

1. **Database migration** — Create `user_tier_lists` and `user_tier_entries` tables with RLS policies
2. **My Tier Lists page** — List view with CRUD for user's tier lists
3. **Tier List Editor** — Hunter picker + tier grid with click-to-place interaction and auto-save
4. **Shared view page** — Read-only render of a public user tier list
5. **Routing** — Add 3 new routes in App.tsx
6. **Navigation** — Add "My Tier Lists" button on the tier list page and in the user menu

### Technical Details

- Reuse existing `TIER_COLORS`, `TIER_BG`, `TIER_BANNER`, `ROLES`, `HunterPortrait` constants/components from `TierList.tsx` by extracting them into a shared file (`src/lib/tier-list-constants.ts`)
- Editor fetches all hunters via the same optimized selective query used in DatabaseList
- Auto-save uses `useMutation` with a debounced callback (~1s) to batch upserts
- The user_tier_entries table uses a composite unique on `(tier_list_id, hunter_id)` to prevent duplicates