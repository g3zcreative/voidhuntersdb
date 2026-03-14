import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", required: true, showInTable: true },
  { key: "role", label: "Role", showInTable: true },
  { key: "slug", label: "Slug", required: true, showInTable: true },
  { key: "avatar_url", label: "Avatar", type: "image", storageBucket: "images" },
];

export default function AdminAuthors() {
  return (
    <AdminCrudPage
      tableName="authors"
      title="Authors"
      columns={columns}
    />
  );
}
