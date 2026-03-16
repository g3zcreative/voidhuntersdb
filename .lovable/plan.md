

# Community Contribution Launch: Readiness Checklist

## What's Already Working
- Contributor role exists in the database (`app_role` enum includes `contributor`)
- RLS policies grant contributors INSERT and UPDATE on all game tables: hunters, skills, effects, bosses, boss_skills, tags, hunter_tags
- Contributors can see the "Collections" section in the admin sidebar (but not Content, Insights, or Platform)
- You can assign the contributor role from Admin > Users
- Authentication (sign up / sign in) works with email confirmation

## Issues to Fix Before Launch

### 1. Image uploads will fail for contributors
The `images` storage bucket only allows uploads for users with the `admin` role:
```
"Admins can upload images" → bucket_id = 'images' AND has_role(auth.uid(), 'admin')
```
Contributors adding hunters, bosses, or effects with images will get permission errors. **You need a new storage policy granting contributors upload access to the `images` bucket.**

### 2. No delete protection on junction table rows
Contributors can INSERT and UPDATE `hunter_tags`, but the entity editor's many-to-many save logic calls `.delete()` on junction rows when deselecting related items. This will silently fail for contributors since there's no DELETE policy. **Either add a contributor DELETE policy on junction tables, or adjust the save logic to handle the error gracefully.**

### 3. No audit trail
There's no record of who created or last modified a record. If a contributor makes a mistake or adds bad data, you won't know who did it. Consider adding `created_by` and `updated_by` columns (user UUIDs) to game tables.

### 4. No way for contributors to self-register
Right now, you must manually assign the contributor role from Admin > Users. There's no invite flow or request-access mechanism. You'll need to either:
- Manually add each contributor after they sign up (current flow)
- Build a "request contributor access" button
- Or share a simple process on Discord ("sign up, DM me your email, I'll grant access")

### 5. Email confirmation required
Sign-ups require email verification before users can log in. This is good for security but make sure your Discord announcement mentions this so contributors don't think registration is broken.

## Nice-to-Haves (Not Blockers)

- **Contribution guidelines page**: What format should data be in? What images are acceptable? Where to find game data?
- **Activity log**: So you can see recent additions/edits by contributors
- **Contributor review workflow**: Flag new entries for admin review before they go live on the public site
- **Undo/revert**: Ability to roll back a contributor's changes

## Recommended Launch Steps

1. Fix the two blockers (storage policy + junction table delete)
2. Decide on your contributor onboarding process (manual assignment is fine for a small group)
3. Draft a Discord message explaining: how to sign up, what they can contribute, and any guidelines
4. Assign contributor roles to your first batch of trusted community members
5. Monitor the first few contributions and iterate

