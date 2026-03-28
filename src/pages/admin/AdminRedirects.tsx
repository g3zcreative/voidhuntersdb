import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "from_path", label: "From Path", type: "text", required: true },
  { key: "to_path", label: "To Path", type: "text", required: true },
  { key: "created_at", label: "Created", type: "datetime", editable: false },
];

export default function AdminRedirects() {
  return (
    <AdminCrudPage
      tableName="redirects"
      title="Redirects"
      columns={columns}
    />
  );
}
