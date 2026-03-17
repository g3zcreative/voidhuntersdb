

## Inline Skills Editor on the Hunter Form

### Problem
Creating a hunter requires navigating to 3 separate forms: hunters, skills, and tags. Tags are already handled via `MultiRefField`, but skills (which are child records with `hunter_id` FK) must be created separately and linked manually.

### Approach
Add an inline "Skills" repeatable group section to `AdminSchemaItemEditor` that appears **only for the `hunters` table**. This section lets admins add/edit/remove skills directly on the hunter form, and saves them as part of the same save operation.

### Design

**1. Inline Skills Section (new component: `InlineSkillsEditor`)**
- Renders below the Relationships section on the hunter form
- Shows a list of skill cards, each with fields: `name`, `type`, `sort_order`, `max_level`, `cooldown`, `description`, `icon`, `effects` (JSON)
- Each card is collapsible (accordion-style) showing just the skill name when collapsed
- "Add Skill" button appends a new empty skill entry
- Delete button on each skill card removes it
- All skill data lives in local state until the parent form saves

**2. State Management**
- New state: `inlineSkills: Array<Record<string, any>>` tracking added/edited/removed skills
- On load (existing hunter): fetch skills where `hunter_id = id`, populate state
- Each skill entry has a `_status` marker: `existing`, `new`, or `deleted`

**3. Save Logic (modify `saveMutation`)**
- After saving the hunter row and getting `itemId`:
  - **New skills** (`_status === 'new'`): `INSERT` into `skills` table with `hunter_id = itemId`, `created_by`, `updated_by`, auto-generated `slug`
  - **Edited skills** (`_status === 'existing'`): `UPDATE` in `skills` table
  - **Deleted skills** (`_status === 'deleted'`): `DELETE` from `skills` table
- This reuses the existing `FieldInput` components for each skill field

**4. Tags (already working)**
- Tags already work via `MultiRefField` + `hunter_tags` junction table. No changes needed.

### Files Changed

| File | Change |
|------|--------|
| `src/components/admin/InlineSkillsEditor.tsx` | **New.** Accordion-based repeatable skill group with all skill fields inline. Uses existing `FieldInput`-style inputs, `ImageUploadField` for icon, `JsonFieldEditor` for effects. |
| `src/pages/admin/AdminSchemaItemEditor.tsx` | Import `InlineSkillsEditor`. Add `inlineSkills` state. Load existing skills on edit. Pass skills state + setter to the component. Extend `saveMutation` to handle skill inserts/updates/deletes after saving hunter. Conditionally render the section only when `tableName === "hunters"`. |

### UX Details
- Skills section header: "Skills" with a "+ Add Skill" button
- Each skill renders as a collapsible card showing skill name (or "New Skill") as the trigger
- Fields per skill: name, type (text), sort_order (number), max_level (number), cooldown (number), description (textarea), icon (image upload), effects (JSON editor)
- Slug auto-generated from name on new skills
- Delete skill shows inline with a trash icon button

