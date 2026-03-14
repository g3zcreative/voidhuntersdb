import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", required: true, showInTable: true },
  { key: "slug", label: "Slug", required: true, showInTable: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "set_bonus", label: "Set Bonus", type: "textarea", showInTable: true },
  { key: "image_url", label: "Image", type: "image", storageBucket: "images" },
];

export default function AdminArmorSets() {
  return (
    <AdminCrudPage
      tableName="armor_sets"
      title="Armor Sets"
      columns={columns}
    />
  );
}
