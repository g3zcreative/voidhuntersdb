import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", required: true, showInTable: true },
  { key: "slug", label: "Slug", required: true, showInTable: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "icon_url", label: "Icon", storageBucket: "icons" },
];

export default function AdminAllegiances() {
  return <AdminCrudPage tableName="allegiances" title="Allegiances" columns={columns} />;
}
