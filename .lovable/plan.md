

## Use Edge Metadata to Drive FK Dropdowns Automatically

### Problem
The item editor uses a heuristic function `getFkTable()` that guesses the referenced table from column names (e.g. `hunter_id` → `hunters`). This fails for fields like `affected_stat` (no `_id` suffix) and `required_trophy_id` (pluralizes to `required_trophies` instead of `trophies`).

Meanwhile, the Entity Editor already stores the correct FK mappings in edge data (`edge.data.sourceColumn` → target table). This metadata is parsed by `useSchemaRegistry` but never used by the item editor.

### Solution
Replace the heuristic `getFkTable()` with a lookup function that reads actual edge metadata from the schema registry. Every edge already stores which source column points to which target table. This means: **if you draw an edge in the Entity Editor, the form automatically gets a dropdown. No code changes needed.**

### Changes

**1. `useSchemaRegistry.tsx` — Add `getForeignKeys` helper**
- New function `getForeignKeys(tableName)` that returns `Array<{ column: string; referencedTable: string }>` by scanning edges where `source === table.nodeId` and reading `edge.data.sourceColumn`
- Export it from the hook

**2. `AdminSchemaItemEditor.tsx` — Replace heuristic with edge-driven lookups**
- Import `getForeignKeys` from the schema registry
- Remove the `getFkTable()` heuristic function
- In `FieldInput`, look up the field name in the FK map. If found, render `FkSelect` with the correct referenced table
- This handles `affected_stat` → `stats`, `required_trophy_id` → `trophies`, and any future FK automatically

### How it works after this change

```text
Entity Editor                    Schema Registry                Item Editor Form
┌──────────────┐                ┌──────────────────┐           ┌──────────────────┐
│ Draw edge:   │  edge.data =   │ getForeignKeys() │  returns  │ FieldInput sees   │
│ hunt_paths   │──────────────→ │ { column:        │─────────→ │ affected_stat is  │
│  → stats     │  sourceColumn: │   "affected_stat"│           │ FK to "stats"     │
│              │  "affected_stat"│   table: "stats"}│           │ → renders FkSelect│
└──────────────┘                └──────────────────┘           └──────────────────┘
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSchemaRegistry.tsx` | Add `getForeignKeys(tableName)` that derives FK info from edges |
| `src/pages/admin/AdminSchemaItemEditor.tsx` | Replace `getFkTable()` with `getForeignKeys` lookup; pass FK map into `FieldInput` |

### Result
Any edge you draw and configure in the Entity Editor will automatically produce a searchable dropdown in the data entry form. No naming conventions required, no developer intervention.

