import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", required: true, showInTable: true },
  { key: "slug", label: "Slug", required: true, showInTable: true },
  { key: "mechanic_type", label: "Type", required: true, showInTable: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "icon_url", label: "Icon URL", storageBucket: "icons" },
];

export default function AdminMechanics() {
  return <AdminCrudPage tableName="mechanics" title="Mechanics" columns={columns} />;
}
