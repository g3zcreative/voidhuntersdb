

## Performance Optimizations for Hunter List Page

### Problems Identified

1. **Over-fetching columns**: `select("*")` pulls every column (attack, defense, health, speed, description, etc.) when the list only needs `id, name, slug, subtitle, image_url, rarity`.
2. **Unnecessary FK queries**: The `fkQueries` loop calls `useFkOptions` for every `_id` field in the schema (e.g. `skills` table), even though those FK lookups aren't useful on the hunters list. The `skills` query alone fetches 500 rows with all columns.
3. **Waterfall loading**: Schema registry must load before the hunters query can start (`enabled: !!table`). We can't eliminate this dependency, but we can prefetch the schema.
4. **No image optimization**: Full-resolution images load for small card thumbnails. Adding width params to the storage URL or using smaller image variants would help.
5. **Broken hooks pattern**: `useFkOptions` is still called in a `forEach` loop (lines 167-171), which violates Rules of Hooks when `filterableFields` changes length between renders — this was supposedly fixed but the code still has it.

### Plan

**File: `src/pages/DatabaseList.tsx`**

1. **Select only needed columns** — Change the main query from `select("*")` to `select("id, name, slug, subtitle, image_url, rarity")` for hunters (and a similar minimal set for other tables).

2. **Remove the broken `forEach` hook loop** (lines 167-171) — Replace with a single `useQuery` that fetches all FK lookup tables in one batch using `Promise.all`, keyed by a stable list of table names. This fixes both the hooks violation and reduces network requests.

3. **Add image size hints** — Append `?width=400` to Supabase storage image URLs for thumbnails, and add `width`/`height` attributes to `<img>` tags so the browser can allocate space before images load (reduces layout shift).

4. **Prefetch schema registry** — Add `staleTime` and `gcTime` to the schema registry query so it persists across navigations (it likely already has `staleTime` but worth confirming).

5. **Remove unused `skillEffectLinks` query** — The effect filter query (lines 142-154) returns an empty array and is dead code. Remove it.

### Technical Details

- Selective columns: `supabase.from("hunters").select("id,name,slug,subtitle,image_url,rarity")` — reduces payload ~70%.
- Single FK batch query: one `useQuery` with `queryKey: ["fk-batch", ...sortedTableNames]` doing `Promise.all` over the unique FK table names, returning `Record<tableName, rows[]>`.
- Image optimization: Supabase Storage supports `?width=N` transform parameter for on-the-fly resizing.
- Remove dead `skillEffectLinks` query entirely.

