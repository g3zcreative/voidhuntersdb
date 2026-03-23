

## Plan: Configurable Field Widgets in Entity Editor

### Problem
The entity editor defines table columns (name, type, nullable) but has no way to control how a field renders in the admin form. You want to mark a text field like `category` as a dropdown with specific options (Class, Homeland, Species, Other).

### Approach: Add per-field UI config to the schema

The entity schema already stores field metadata (name, type, nullable, etc.) as JSON in `entity_definitions.schema`. We extend this with an optional `uiWidget` property on each field.

### Changes

**1. Extend `EntityField` with UI config** (`src/components/admin/EntityNode.tsx`)
- Add optional properties to `EntityField`:
  - `uiWidget?: "text" | "textarea" | "select"` (default: auto from type)
  - `uiOptions?: string[]` (static select options, e.g. `["Class", "Homeland", "Species", "Other"]`)

**2. Add field settings UI in Entity Node** (`src/components/admin/EntityNode.tsx`)
- Add a small settings/gear icon per field that opens a popover or inline config
- In the popover: a widget type dropdown ("Auto", "Select", "Textarea") and a comma-separated options input when widget is "select"
- Calls `onUpdateField(nodeId, fieldId, { uiWidget, uiOptions })` to persist

**3. Pass UI config through schema registry** (`src/hooks/useSchemaRegistry.tsx`)
- Include `uiWidget` and `uiOptions` in the `SchemaField` interface and map them from the stored node data

**4. Use UI config in form renderer** (`src/pages/admin/AdminSchemaItemEditor.tsx`)
- In `FieldInput`, before falling through to the type-based switch, check if `field.uiWidget === "select"` and render a `<Select>` with `field.uiOptions` as items
- Similarly handle `"textarea"` override

**5. Add `category` column to Tags table**
- In the entity editor, add a `category` text column to Tags
- Set its widget to "select" with options: Class, Homeland, Species, Other
- Deploy the schema change

### Technical Details

```text
EntityField (extended)
├── name, type, nullable, isPrimaryKey, defaultValue  (existing)
├── uiWidget?: "text" | "textarea" | "select"         (new)
└── uiOptions?: string[]                               (new)

Flow:
  EntityNode gear icon → updates field.uiWidget/uiOptions
  → saved to entity_definitions.schema JSON
  → read by useSchemaRegistry into SchemaField
  → used by FieldInput in AdminSchemaItemEditor
```

No database migration needed for the widget config itself -- it's stored in the existing `entity_definitions.schema` JSONB column. A migration (via deploy) will be needed to add the `category` column to the `tags` table, but that's done through the existing entity editor deploy flow.

### Files Modified
- `src/components/admin/EntityNode.tsx` -- add field settings popover
- `src/hooks/useSchemaRegistry.tsx` -- pass through uiWidget/uiOptions
- `src/pages/admin/AdminSchemaItemEditor.tsx` -- render select widget
- `src/components/admin/InlineChildEditor.tsx` -- render select widget for inline forms too

